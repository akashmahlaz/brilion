import { toolDefinition, chat, maxIterations } from "@tanstack/ai";
import { z } from "zod";
import { AgentProfile } from "../../models/agent-profile";
import { SubagentRun } from "../../models/subagent-run";
import { Conversation } from "../../models/conversation";
import { connectDB } from "../../db";
import { resolveModel } from "../providers";
import { emit, getHookRunner } from "../hooks";
import { getMiddlewareStack } from "../middleware";
import { createLogger, type LogSource } from "../../models/log-entry";

const DEFAULT_AGENTS: Record<string, { name: string; systemPrompt: string; model?: string; maxSteps?: number }> = {
  researcher: {
    name: "Researcher",
    systemPrompt: `You are a research specialist. Your job is to search the web, read documents, and compile accurate, well-sourced answers. Always cite your sources. Be thorough but concise.`,
    maxSteps: 15,
  },
  coder: {
    name: "Coder",
    systemPrompt: `You are a coding specialist. Write clean, production-ready code. Follow best practices. Include error handling. Explain your approach briefly.`,
    maxSteps: 10,
  },
  planner: {
    name: "Planner",
    systemPrompt: `You are a planning specialist. Break complex tasks into clear, actionable steps. Identify dependencies, risks, and priorities. Output structured plans.`,
    maxSteps: 5,
  },
  writer: {
    name: "Writer",
    systemPrompt: `You are a writing specialist. Create polished, well-structured content. Match the user's tone and style. Focus on clarity and engagement.`,
    maxSteps: 5,
  },
};

/**
 * Seed default agent profiles for a user if none exist.
 */
export async function ensureDefaultAgents(userId: string): Promise<void> {
  await connectDB();
  const count = await AgentProfile.countDocuments({ userId });
  if (count > 0) return;

  const profiles = Object.entries(DEFAULT_AGENTS).map(([slug, cfg]) => ({
    userId,
    slug,
    name: cfg.name,
    systemPrompt: cfg.systemPrompt,
    model: cfg.model || "",
    maxSteps: cfg.maxSteps || 10,
    isBuiltin: true,
  }));

  await AgentProfile.insertMany(profiles);
}

/**
 * Fetch recent parent conversation context for sub-agent context passing.
 * Returns the last N messages as a summary string that gives sub-agents awareness.
 */
async function getParentContext(conversationId?: string): Promise<string> {
  if (!conversationId) return "";
  try {
    const conv = await Conversation.findById(conversationId).lean() as any;
    if (!conv?.messages?.length) return "";
    // Take last 10 messages as context summary
    const recent = conv.messages.slice(-10);
    const lines = recent.map((m: any) =>
      `[${m.role}]: ${typeof m.content === "string" ? m.content.slice(0, 300) : "(media)"}`
    );
    return `\n\n## Parent Conversation Context (recent):\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

/**
 * Create the spawn_subagent tool — allows the main AI to delegate tasks
 * to specialized sub-agents with their own system prompts and tool access.
 */
export function createSubagentTool(userId: string, conversationId?: string) {
  return toolDefinition({
    name: "spawn_subagent",
    description: `Spawn a specialized sub-agent to handle a specific task. Available agents: researcher (web search + analysis), coder (code writing), planner (task planning), writer (content creation). You can also use any custom agent slug the user has configured. The sub-agent runs independently with its own system prompt, then returns its result to you.`,
    inputSchema: z.object({
      agentSlug: z.string().describe("Agent to spawn: researcher, coder, planner, writer, or a custom slug"),
      task: z.string().describe("Clear description of the task for the sub-agent"),
    }),
  }).server(async ({ agentSlug, task }: { agentSlug: string; task: string }) => {
    console.log(`[subagent] Spawning "${agentSlug}" with task: ${task.slice(0, 120)}`);
    const sysLogger = createLogger(userId, "system" as LogSource);
    const startTime = Date.now();

    // Emit spawning hook (modifying — may add extra context)
    getHookRunner().runSubagentSpawning({ userId, agentId: agentSlug, parentSessionId: conversationId }).catch(() => {});

    await connectDB();

    // Look up agent profile (user-defined or default)
    let profile = await AgentProfile.findOne({ userId, slug: agentSlug }).lean() as any;
    if (!profile && DEFAULT_AGENTS[agentSlug]) {
      profile = { slug: agentSlug, ...DEFAULT_AGENTS[agentSlug] };
    }
    if (!profile) {
      return { error: `Unknown agent: "${agentSlug}". Available: researcher, coder, planner, writer.` };
    }

    // Create run record
    const run = await SubagentRun.create({
      userId,
      parentConversationId: conversationId,
      agentSlug,
      agentName: profile.name,
      task,
      status: "running",
      model: profile.model || "",
      startedAt: new Date(),
    });

    emit("subagent_spawned", { userId, agentId: agentSlug, sessionId: run._id.toString() }).catch(() => {});

    try {
      // Resolve model (agent-specified or user default)
      let adapter;
      try {
        adapter = await resolveModel(profile.model || undefined, userId);
      } catch (e) {
        return { error: `Failed to resolve model for agent "${agentSlug}": ${e instanceof Error ? e.message : String(e)}` };
      }
      const model = (adapter as any)?.model || "unknown";
      const provider = (adapter as any)?.provider || "unknown";

      // Lazy import to break circular dependency (agent.ts <-> subagent.ts)
      const { buildToolSet } = await import("../agent");
      let tools = await buildToolSet(userId);
      if (profile.allowedTools && profile.allowedTools.length > 0) {
        const allowed = new Set(profile.allowedTools);
        tools = tools.filter((t: any) => allowed.has(t.name));
      }

      const maxSteps = profile.maxSteps || 10;

      // Fetch parent conversation context for awareness
      const parentContext = await getParentContext(conversationId);
      const contextualPrompt = profile.systemPrompt + parentContext;

      // Track usage via middleware
      let promptTokens = 0;
      let completionTokens = 0;
      let toolCallCount = 0;
      const usageMiddleware = {
        name: "subagent-usage",
        onUsage: (_ctx: any, usage: any) => {
          promptTokens += usage.promptTokens || 0;
          completionTokens += usage.completionTokens || 0;
        },
        onAfterToolCall: () => { toolCallCount++; },
      };

      // Run the sub-agent with middleware + streaming
      let fullText = "";
      const stream = chat({
        adapter,
        messages: [
          { role: "user", content: task },
        ],
        systemPrompts: [contextualPrompt],
        tools,
        agentLoopStrategy: maxIterations(maxSteps),
        middleware: [...getMiddlewareStack(userId, "web"), usageMiddleware],
      });

      // Consume the stream to collect full result
      for await (const chunk of stream) {
        if (chunk.type === "TEXT_MESSAGE_CONTENT") {
          fullText += chunk.delta;
        }
      }
      const result = fullText;

      const durationMs = Date.now() - startTime;

      // Update run record with usage stats
      await SubagentRun.updateOne(
        { _id: run._id },
        { status: "completed", result, model, provider, durationMs, promptTokens, completionTokens, toolCallCount }
      );

      sysLogger.info("Sub-agent completed", {
        agentSlug,
        task: task.slice(0, 200),
        model,
        durationMs,
        resultLength: result.length,
        promptTokens,
        completionTokens,
        toolCallCount,
      });

      emit("subagent_ended", {
        userId,
        agentId: agentSlug,
        sessionId: run._id.toString(),
        durationMs,
      }).catch(() => {});

      return {
        agent: profile.name,
        task,
        result,
        model,
        durationMs,
        usage: { promptTokens, completionTokens, toolCallCount },
      };
    } catch (e) {
      const durationMs = Date.now() - startTime;
      const errMsg = e instanceof Error ? e.message : String(e);

      await SubagentRun.updateOne(
        { _id: run._id },
        { status: "failed", error: errMsg, durationMs }
      );

      sysLogger.error("Sub-agent failed", { agentSlug, task: task.slice(0, 200), error: errMsg, durationMs });

      emit("subagent_ended", {
        userId,
        agentId: agentSlug,
        sessionId: run._id.toString(),
        durationMs,
      }).catch(() => {});

      return { error: `Sub-agent "${profile.name}" failed: ${errMsg}` };
    }
  });
}
