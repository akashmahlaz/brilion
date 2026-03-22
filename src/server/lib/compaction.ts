import { chat } from "@tanstack/ai";
import { resolveModel } from "./providers";
import { Conversation } from "../models/conversation";
import { connectDB } from "../db";
import { indexConversation } from "./memory-manager";
import { createLogger } from "../models/log-entry";
import { buildSystemPromptFromWorkspace } from "./workspace";
import { emit, getHookRunner, hasHooks } from "./hooks";

const log = (...args: unknown[]) => console.log("[compaction]", ...args);

const COMPACTION_PROMPT = `You are a conversation summarizer. Your task is to compress earlier messages into a concise summary that preserves ALL important information.

RULES:
1. Preserve ALL identifiers exactly as written: names, numbers, URLs, API keys, UUIDs, file paths
2. Preserve active tasks, their current status, and any blockers
3. Preserve recent decisions and the reasoning behind them
4. Preserve user commitments, deadlines, and open questions
5. Preserve user preferences and personality traits you've learned
6. Preserve batch/task progress with exact counts (e.g., "processed 47/100 items")
7. Preserve pending user asks that haven't been resolved yet
8. Use a structured format with clear headers
9. Be concise but never omit important context
10. Write in past tense for completed items, present tense for active items

OUTPUT FORMAT:
## Summary of Earlier Conversation
### Key Facts
- [bullet points of important facts, identifiers, decisions]

### Active Tasks
- [any ongoing work, batch progress with exact counts]

### Pending User Asks
- [questions or requests the user made that aren't resolved yet]

### User Preferences Learned
- [any preferences, style notes, or personal info discovered]

### Context for Next Response
- [anything the AI needs to know to continue naturally]`;

/**
 * Token estimator (~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if a conversation needs compaction.
 * Triggers when messages exceed the threshold.
 */
export function needsCompaction(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 12000
): boolean {
  const totalTokens = messages.reduce(
    (acc, m) => acc + estimateTokens(typeof m.content === "string" ? m.content : ""),
    0
  );
  return totalTokens > maxTokens;
}

/**
 * Compact a conversation by summarizing older messages with an LLM.
 * Keeps the first 2 messages (system context) and last 6 messages (recent context).
 * Everything in between is summarized.
 *
 * Returns the compacted messages array.
 */
export async function compactConversation(
  userId: string,
  conversationId: string,
  options: {
    keepRecent?: number;
    keepFirst?: number;
    maxTokens?: number;
  } = {}
): Promise<{ compacted: boolean; originalCount: number; newCount: number }> {
  await connectDB();
  const { keepRecent = 6, keepFirst = 2 } = options;

  const conv = await Conversation.findOne({ _id: conversationId, userId });
  if (!conv || !conv.messages) {
    return { compacted: false, originalCount: 0, newCount: 0 };
  }

  const messages = conv.messages;
  const originalCount = messages.length;

  // Not enough messages to compact
  if (originalCount <= keepFirst + keepRecent + 4) {
    return { compacted: false, originalCount, newCount: originalCount };
  }

  const sysLogger = createLogger(userId, "system");

  // Slice messages into: [first N] + [middle to summarize] + [last N]
  const firstMessages = messages.slice(0, keepFirst);
  const middleMessages = messages.slice(keepFirst, -keepRecent);
  const recentMessages = messages.slice(-keepRecent);

  // Build summary text from middle messages
  const middleText = middleMessages
    .map(
      (m: any) =>
        `${m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System"}: ${
          typeof m.content === "string" ? m.content : "[multimodal content]"
        }`
    )
    .join("\n\n");

  log(`Compacting ${middleMessages.length} messages (${estimateTokens(middleText)} est. tokens)`);

  // Emit before_compaction hook
  emit("before_compaction", {
    userId,
    conversationId,
    messageCount: originalCount,
    estimatedTokens: estimateTokens(middleText),
  }).catch(() => {});

  // Use a fast/cheap model for summarization
  let adapter;
  try {
    // Try to use a fast model for compaction
    adapter = await resolveModel("gpt-4.1-mini", userId).catch(() =>
      resolveModel(undefined, userId)
    );
  } catch {
    // Fallback: simple truncation without LLM
    log("No model available for LLM compaction, using simple truncation");
    conv.messages = [
      ...firstMessages,
      {
        role: "system",
        content: `[Compacted ${middleMessages.length} earlier messages — context may be limited]`,
        createdAt: new Date(),
      },
      ...recentMessages,
    ];
    await conv.save();
    return { compacted: true, originalCount, newCount: conv.messages.length };
  }

  try {
    const summary = await chat({
      adapter,
      messages: [
        { role: "user", content: `Summarize this conversation segment:\n\n${middleText}` },
      ],
      systemPrompts: [COMPACTION_PROMPT],
      tools: [],
      stream: false,
    }) as string;

    log(`Summary generated: ${summary.length} chars (from ${middleText.length} chars)`);

    // Build persona anchor from workspace to prevent identity drift after compaction
    let personaAnchor = "";
    try {
      const wsPrompt = await buildSystemPromptFromWorkspace(userId);
      if (wsPrompt && wsPrompt.length > 50) {
        // Extract a short identity reminder (first ~500 chars of workspace prompt)
        const anchorText = wsPrompt.length > 500 ? wsPrompt.slice(0, 500) + "…" : wsPrompt;
        personaAnchor = `\n\n---\n[Identity Anchor — you are this person's personal AI. Resume naturally.]\n${anchorText}`;
      }
    } catch {
      // Workspace unavailable — skip anchor
    }

    // Replace middle with summary + persona anchor
    conv.messages = [
      ...firstMessages,
      {
        role: "system",
        content: summary + personaAnchor,
        createdAt: new Date(),
      },
      ...recentMessages,
    ];
    await conv.save();

    // Index the conversation into memory after compaction
    try {
      await indexConversation(userId, conversationId);
    } catch {
      // Non-critical — memory indexing can fail
    }

    sysLogger.info(`Compacted conversation ${conversationId}`, {
      originalCount,
      newCount: conv.messages.length,
      summarizedMessages: middleMessages.length,
    });

    emit("after_compaction", {
      userId,
      conversationId,
      originalCount,
      newCount: conv.messages.length,
      summarizedMessages: middleMessages.length,
    }).catch(() => {});

    return { compacted: true, originalCount, newCount: conv.messages.length };
  } catch (e) {
    log("LLM compaction failed, using simple truncation:", e);
    sysLogger.warn("LLM compaction failed, using truncation", { error: String(e) });

    conv.messages = [
      ...firstMessages,
      {
        role: "system",
        content: `[Compacted ${middleMessages.length} earlier messages]`,
        createdAt: new Date(),
      },
      ...recentMessages,
    ];
    await conv.save();
    return { compacted: true, originalCount, newCount: conv.messages.length };
  }
}

/**
 * Auto-compact: check if conversation needs compaction and do it.
 * Called automatically after chat responses.
 */
export async function autoCompact(
  userId: string,
  conversationId: string
): Promise<void> {
  await connectDB();
  const conv = await Conversation.findOne({ _id: conversationId, userId });
  if (!conv || !conv.messages) return;

  const messages = conv.messages.map((m: any) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : "",
  }));

  if (needsCompaction(messages)) {
    log(`Auto-compacting conversation ${conversationId} (${messages.length} messages)`);

    // Pre-compaction memory flush (OpenClaw-inspired): run a silent agentic turn
    // to let the AI save important learnings before they get summarized away
    try {
      const { chat: chatFn, maxIterations } = await import("@tanstack/ai");
      const recentMessages = conv.messages.slice(-10).map((m: any) => ({
        role: m.role as string,
        content: typeof m.content === "string" ? m.content : "[content]",
      }));
      const flushPrompt = `[SYSTEM — PRE-COMPACTION MEMORY FLUSH]
This conversation is about to be compacted. Review recent messages and IMMEDIATELY save any important learnings, preferences, or facts about the user to USER.md or SOUL.md using write_workspace_file.

Do NOT reply to the user. Only write files if there's something worth remembering. If nothing important, respond with "NO_FLUSH" and nothing else.`;

      const flushAdapter = await resolveModel("gpt-4.1-mini", userId).catch(() =>
        resolveModel(undefined, userId)
      );
      // Lazy import of tools for the flush turn
      const { buildToolSet } = await import("./agent");
      const flushTools = await buildToolSet(userId);

      await chatFn({
        adapter: flushAdapter,
        messages: [
          ...recentMessages,
          { role: "user", content: flushPrompt },
        ],
        tools: flushTools,
        agentLoopStrategy: maxIterations(3),
        stream: false,
      });
      log(`Pre-compaction memory flush completed for ${conversationId}`);
    } catch (e) {
      log("Pre-compaction flush failed (non-critical):", e);
    }

    await compactConversation(userId, conversationId);
  }
}
