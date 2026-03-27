import { createFileRoute } from "@tanstack/react-router";
import {
  chat,
  maxIterations,
  toServerSentEventsResponse,
} from "@tanstack/ai";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { Conversation } from "#/server/models/conversation";
import { getAgentConfig } from "#/server/lib/agent";
import { trackUsage } from "#/server/lib/usage-tracker";
import { createLogger } from "#/server/models/log-entry";
import { autoCompact } from "#/server/lib/compaction";
import { indexConversation } from "#/server/lib/memory-manager";
import { initAIObservability } from "#/server/lib/ai-observability";
import { emit } from "#/server/lib/hooks";
import { getMiddlewareStack } from "#/server/lib/middleware";

// Initialize observability once on first import
initAIObservability();

/** Extract text content from a message (handles both UIMessage parts and ModelMessage content) */
function extractTextContent(msg: any): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.content)
      .join("");
  }
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.content || p.text || "")
      .join("");
  }
  return "";
}

/** Stream wrapper that intercepts chunks for post-processing and tool call logging */
async function* withPostProcessing(
  stream: AsyncIterable<any>,
  onComplete: (fullText: string, toolCalls: string[], assistantParts: any[]) => Promise<void>,
  onError: (err: unknown) => void
): AsyncGenerator<any> {
  let fullText = "";
  const toolCalls: string[] = [];
  const assistantParts: any[] = [];
  const toolCallIds = new Set<string>();

  const upsertTextPart = (type: "text" | "thinking", chunkText: string) => {
    if (!chunkText) return;
    const existing = assistantParts.find((p) => p.type === type);
    if (existing) {
      existing.content = `${existing.content || ""}${chunkText}`;
      return;
    }
    assistantParts.push({ type, content: chunkText });
  };

  const getToolName = (chunk: any): string => chunk.toolName || chunk.name || chunk.tool || "unknown";

  const getToolCallId = (chunk: any): string =>
    chunk.toolCallId || chunk.id || `${getToolName(chunk)}-${toolCallIds.size + 1}`;

  const recordToolCall = (chunk: any) => {
    const toolName = getToolName(chunk);
    const toolCallId = getToolCallId(chunk);

    if (!toolCallIds.has(toolCallId)) {
      toolCallIds.add(toolCallId);
      assistantParts.push({
        type: "tool-call",
        id: toolCallId,
        name: toolName,
        input: chunk.input ?? chunk.args ?? chunk.arguments,
        arguments: typeof chunk.arguments === "string"
          ? chunk.arguments
          : chunk.arguments
            ? JSON.stringify(chunk.arguments)
            : undefined,
      });
    }

    if (!toolCalls.includes(toolName)) {
      toolCalls.push(toolName);
      console.log(`[chat] Tool called: ${toolName}`);
    }

    const resultPayload = chunk.output ?? chunk.result ?? chunk.response ?? chunk.content;
    if (resultPayload !== undefined && resultPayload !== null) {
      const content = typeof resultPayload === "string"
        ? resultPayload
        : JSON.stringify(resultPayload);
      assistantParts.push({
        type: "tool-result",
        toolCallId,
        state: "complete",
        content,
      });
    }
  };

  try {
    for await (const chunk of stream) {
      if (chunk.type === "TEXT_MESSAGE_CONTENT" && chunk.delta) {
        fullText += chunk.delta;
        upsertTextPart("text", chunk.delta);
      }

      if (
        (typeof chunk.type === "string" &&
          (chunk.type.includes("THINKING") || chunk.type.includes("REASONING"))) &&
        (chunk.delta || chunk.content)
      ) {
        upsertTextPart("thinking", chunk.delta || chunk.content);
      }

      // Log tool invocations for observability
      if (
        chunk.type === "TOOL_CALL_START" ||
        chunk.type === "TOOL_CALL_END" ||
        chunk.type === "TOOL_RESULT" ||
        chunk.toolName ||
        chunk.toolCallId
      ) {
        recordToolCall(chunk);
      }
      yield chunk;
    }
    // Stream completed — fire-and-forget background tasks
    onComplete(fullText, toolCalls, assistantParts).catch(onError);
  } catch (err) {
    onError(err);
    throw err;
  }
}

const ATTACHMENT_RE = /\[(Image|File):\s*([^\]]+)\]\(([^)]+)\)/g;

/** Transform messages to multimodal format — converts [Image: name](url) to image parts with CDN URLs */
async function transformMessages(messages: any[]): Promise<any[]> {
  const result = [];
  for (const msg of messages) {
    // Normalize UIMessage (parts) to ModelMessage (content) for the AI adapter
    const textContent = extractTextContent(msg);
    const normalizedMsg = typeof msg.content === "string"
      ? msg
      : { ...msg, content: textContent };

    if (normalizedMsg.role !== "user" || typeof normalizedMsg.content !== "string" || !ATTACHMENT_RE.test(normalizedMsg.content)) {
      result.push(normalizedMsg);
      continue;
    }

    // Reset regex
    ATTACHMENT_RE.lastIndex = 0;
    const parts: any[] = [];
    let lastIndex = 0;
    let match;

    while ((match = ATTACHMENT_RE.exec(normalizedMsg.content)) !== null) {
      const [full, type, _name, url] = match;
      // Add preceding text
      const before = normalizedMsg.content.slice(lastIndex, match.index).trim();
      if (before) parts.push({ type: "text", content: before });

      if (type === "Image") {
        // URL is now a public CDN URL (Cloudinary) — pass directly as image part
        parts.push({
          type: "image",
          source: { type: "url", url },
        });
      } else {
        parts.push({ type: "text", content: `[File attached: ${_name} — ${url}]` });
      }
      lastIndex = match.index + full.length;
    }

    // Remaining text
    const remaining = normalizedMsg.content.slice(lastIndex).trim();
    if (remaining) parts.push({ type: "text", content: remaining });

    // If no parts extracted, keep original
    result.push(parts.length > 0 ? { ...normalizedMsg, content: parts } : normalizedMsg);
  }
  return result;
}

/**
 * Generate a short title from the first user message using a simple heuristic.
 * Takes first ~60 chars, trims to last complete word.
 */
function generateTitle(text: string): string {
  // Strip attachment markdown for cleaner titles
  const cleaned = text.replace(ATTACHMENT_RE, "").replace(/\n+/g, " ").trim();
  const final = cleaned || "Image conversation";
  if (final.length <= 50) return final;
  const truncated = final.slice(0, 50);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      // POST /api/chat — streaming AI chat
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;
        
        // Initialize workspace files (BOOTSTRAP.md, SOUL.md, USER.md) for personalization
        const { ensureWorkspace } = await import("#/server/lib/workspace");
        await ensureWorkspace(userId);

        const body = await request.json();
        const { messages, conversationId, model: modelSpec } = body;

        // Validate model spec before attempting resolution
        if (modelSpec) {
          const { validateModelSpec } = await import("#/server/lib/model-discovery");
          const validation = await validateModelSpec(modelSpec, userId);
          if (!validation.valid) {
            return Response.json(
              {
                error: `Invalid model: ${validation.suggestion}`,
                availableModels: validation.availableModels?.slice(0, 15),
              },
              { status: 422 }
            );
          }
        }

        // Extract last user message for memory pre-fetch
        const lastUserMsg = messages[messages.length - 1];
        const userMessageText = extractTextContent(lastUserMsg);
        const agentConfig = await getAgentConfig(userId, { channel: "web", userMessage: userMessageText });
        const adapterOverride = modelSpec
          ? await (
              await import("#/server/lib/providers")
            ).resolveModel(modelSpec, userId)
          : undefined;

        // Transform messages — convert [Image: name](url) to actual multimodal image parts
        const aiMessages = await transformMessages(messages);

        const modelName = (agentConfig.adapter as any)?.model || modelSpec || "unknown";
        const providerName = (agentConfig.adapter as any)?.provider || "unknown";
        const logger = createLogger(userId, "api");
        const startTime = Date.now();

        // Log user input
        console.log(`[chat] ← USER (${userId.slice(-6)}): ${userMessageText.slice(0, 300)}${userMessageText.length > 300 ? "…" : ""}`);
        console.log(`[chat]   model=${modelName} provider=${providerName} msgs=${messages.length} convId=${conversationId || "new"}`);

        const rawStream = chat({
          adapter: adapterOverride ?? agentConfig.adapter,
          messages: aiMessages,
          systemPrompts: agentConfig.systemPrompts,
          tools: agentConfig.tools,
          agentLoopStrategy: maxIterations(agentConfig.maxSteps ?? 20),
          middleware: getMiddlewareStack(userId, "web"),
          conversationId,
        });

        // Emit llm_input hook (observability)
        emit("llm_input", {
          userId,
          channel: "web",
          model: modelName,
          provider: providerName,
          messages: aiMessages,
          systemPrompts: agentConfig.systemPrompts,
          toolCount: agentConfig.tools.length,
        }).catch(() => {});

        // Wrap stream for post-processing (usage tracking + conversation saving)
        const trackedStream = withPostProcessing(
          rawStream,
          // onComplete — save conversation and index
          async (fullText: string, toolCalls: string[], assistantParts: any[]) => {
            const durationMs = Date.now() - startTime;
            console.log(`[chat] → AI (${userId.slice(-6)}): ${fullText.slice(0, 300)}${fullText.length > 300 ? "…" : ""}`);
            console.log(`[chat]   duration=${durationMs}ms tools=[${toolCalls.join(", ")}] responseLen=${fullText.length}`);
            logger.info("Web chat completed", { model: modelName, durationMs, toolCalls });

            // Emit llm_output + agent_end hooks
            emit("llm_output", {
              userId,
              channel: "web",
              model: modelName,
              provider: providerName,
              response: fullText,
              durationMs,
            }).catch(() => {});
            emit("agent_end", {
              userId,
              channel: "web",
              model: modelName,
              conversationId,
              response: fullText,
              durationMs,
              toolCallCount: 0,
            }).catch(() => {});

            // Estimate tokens from character count (real usage not available without middleware)
            const estimatedCompletionTokens = Math.ceil(fullText.length / 4);
            trackUsage({
              userId,
              conversationId,
              channel: "web",
              provider: providerName,
              model: modelName,
              promptTokens: 0, // Can't get real prompt tokens
              completionTokens: estimatedCompletionTokens,
              durationMs,
              success: true,
            });

            // Save conversation
            if (conversationId) {
              try {
                const lastUserMsg = messages[messages.length - 1];
                const userContent = extractTextContent(lastUserMsg);
                const conv = await Conversation.findById(conversationId);
                if (!conv) return;

                const userParts = Array.isArray(lastUserMsg?.parts)
                  ? lastUserMsg.parts
                  : [{ type: "text", content: userContent }];

                const normalizedAssistantParts = assistantParts?.length
                  ? assistantParts
                  : (fullText ? [{ type: "text", content: fullText }] : []);

                const assistantContent = fullText ||
                  normalizedAssistantParts
                    .filter((p: any) => p?.type === "text")
                    .map((p: any) => p?.content || "")
                    .join("");

                conv.messages.push(
                  { role: lastUserMsg.role, content: userContent, parts: userParts },
                  ...((assistantContent || normalizedAssistantParts.length > 0)
                    ? [{ role: "assistant" as const, content: assistantContent, parts: normalizedAssistantParts }]
                    : []),
                );

                if (
                  (conv.title === "New Chat" || !conv.title) &&
                  userContent
                ) {
                  conv.title = generateTitle(userContent);
                }

                await conv.save();
                await autoCompact(userId, conversationId).catch(() => {});
                await indexConversation(userId, conversationId).catch(() => {});
              } catch (e) {
                console.error("[chat] Background processing failed:", e);
              }
            }
          },
          // onError
          (err) => {
            const durationMs = Date.now() - startTime;
            logger.error("Web chat failed", { error: String(err), durationMs });
            trackUsage({
              userId,
              channel: "web",
              provider: providerName,
              model: modelName,
              durationMs,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        );

        return toServerSentEventsResponse(trackedStream);
      },

      // GET /api/chat — list conversations or get single
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (id) {
          const conv = await Conversation.findOne({ _id: id, userId });
          if (!conv) {
            return Response.json(
              { error: "Conversation not found" },
              { status: 404 }
            );
          }
          return Response.json(conv);
        }

        const conversations = await Conversation.find({ userId })
          .select(
            "title channel foreignId model messages createdAt updatedAt"
          )
          .sort({ updatedAt: -1 })
          .limit(50)
          .lean();

        const summaries = conversations.map((c: any) => ({
          _id: c._id,
          title: c.title,
          channel: c.channel,
          foreignId: c.foreignId,
          model: c.model,
          messageCount: c.messages?.length || 0,
          lastMessage:
            c.messages?.length > 0
              ? c.messages[c.messages.length - 1].content?.slice(0, 80)
              : null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));

        return Response.json(summaries);
      },

      // DELETE /api/chat — delete conversation
      DELETE: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) {
          return Response.json(
            { error: "Missing conversation id" },
            { status: 400 }
          );
        }

        await Conversation.findOneAndDelete({ _id: id, userId });
        return Response.json({ ok: true });
      },

      // PUT /api/chat — create conversation
      PUT: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;        
        // Initialize workspace files (BOOTSTRAP.md, SOUL.md, USER.md) for personalization
        const { ensureWorkspace } = await import("#/server/lib/workspace");
        await ensureWorkspace(userId);
        const body = await request.json();
        const conv = await Conversation.create({
          userId,
          title: body.title || "New Chat",
          messages: body.messages || [],
          model: body.model,
          provider: body.provider,
          channel: body.channel || "web",
        });

        return Response.json(conv);
      },
    },
  },
});
