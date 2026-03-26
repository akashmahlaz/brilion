import type { ChatMiddleware, ChatMiddlewareContext, ChatMiddlewareConfig, UsageInfo, ErrorInfo, AfterToolCallInfo, ToolCallHookContext } from "@tanstack/ai";
import { toolCacheMiddleware } from "@tanstack/ai/middlewares";
import { createLogger } from "../models/log-entry";
import { trackUsage } from "./usage-tracker";
import { loadConfig } from "./config";

/**
 * Logging middleware — logs every LLM call, tool invocation, and usage metrics.
 */
export function loggingMiddleware(userId: string, channel: "web" | "whatsapp" | "telegram"): ChatMiddleware {
  const logger = createLogger(userId, "agent");
  return {
    name: "logging",
    onStart: (ctx: ChatMiddlewareContext) => {
      logger.info("Chat started", { requestId: ctx.requestId, iteration: ctx.iteration, channel });
    },
    onBeforeToolCall: (ctx: ChatMiddlewareContext, hookCtx: ToolCallHookContext) => {
      logger.info("Tool call", {
        requestId: ctx.requestId,
        tool: hookCtx.toolName,
        iteration: ctx.iteration,
      });
    },
    onUsage: (ctx: ChatMiddlewareContext, usage: UsageInfo) => {
      trackUsage({
        userId,
        channel,
        provider: ctx.provider || "unknown",
        model: ctx.model || "unknown",
        promptTokens: usage.promptTokens || 0,
        completionTokens: usage.completionTokens || 0,
        durationMs: 0,
        success: true,
      });
    },
    onError: (_ctx: ChatMiddlewareContext, info: ErrorInfo) => {
      logger.error("Chat error", { error: info.error instanceof Error ? info.error.message : String(info.error) });
    },
  };
}

/**
 * Audit trail middleware — records tool calls with timestamps for compliance.
 */
export function auditTrailMiddleware(userId: string): ChatMiddleware {
  const logger = createLogger(userId, "agent");
  return {
    name: "audit-trail",
    onBeforeToolCall: (ctx: ChatMiddlewareContext, hookCtx: ToolCallHookContext) => {
      logger.info("AUDIT: tool_invoked", {
        requestId: ctx.requestId,
        tool: hookCtx.toolName,
        args: JSON.stringify(hookCtx.args).slice(0, 500),
        timestamp: new Date().toISOString(),
      });
    },
    onAfterToolCall: (ctx: ChatMiddlewareContext, info: AfterToolCallInfo) => {
      logger.info("AUDIT: tool_completed", {
        requestId: ctx.requestId,
        tool: info.toolName,
        resultLength: typeof info.result === "string" ? info.result.length : JSON.stringify(info.result ?? "").length,
        timestamp: new Date().toISOString(),
      });
    },
  };
}

/**
 * Dynamic model switching middleware — switches to a stronger/cheaper model
 * based on iteration depth and conversation complexity.
 *
 * Strategy:
 * - Iteration 0-2: Use default model (fast response)
 * - Iteration 3+: Upgrade to a stronger model for complex multi-step reasoning
 * - Configurable via user config: agents.defaults.model.escalation
 */
export function dynamicModelMiddleware(userId: string): ChatMiddleware {
  const logger = createLogger(userId, "agent");
  return {
    name: "dynamic-model",
    onConfig: async (ctx: ChatMiddlewareContext, config: ChatMiddlewareConfig) => {
      // Only intervene on subsequent iterations (not the first call)
      if (ctx.phase !== "beforeModel" || ctx.iteration < 3) return;

      try {
        const userConfig = await loadConfig(userId);
        const escalationModel = userConfig.agents?.defaults?.model?.escalation;
        if (!escalationModel) return;

        logger.info("Dynamic model escalation", {
          iteration: ctx.iteration,
          escalationModel,
          requestId: ctx.requestId,
        });

        // Resolve the escalation model adapter
        const { resolveModel } = await import("./providers");
        const adapter = await resolveModel(escalationModel, userId);
        // We can't swap the adapter via config, but we can log the recommendation.
        // TanStack AI's onConfig allows modifying messages/tools/systemPrompts —
        // adapter switching requires the chat engine to support it natively.
        // For now, add a system prompt hint to improve reasoning quality.
        return {
          systemPrompts: [
            ...config.systemPrompts,
            `[System: This is iteration ${ctx.iteration} of a multi-step task. Take extra care with reasoning and ensure accuracy.]`,
          ],
        };
      } catch {
        // Config load failed — continue without escalation
      }
    },
  };
}

/**
 * Tool result sanitizer middleware — strips large base64 blobs and binary data
 * from tool results before they're sent back to the model.
 * This prevents image/audio/video generation results from blowing the context window.
 *
 * Runs on EVERY config pass (not just when over limit) because a single 2MB
 * base64 image result would instantly exceed any model's context.
 */
const BASE64_PATTERN = /^[A-Za-z0-9+/]{1000,}={0,2}$/;
const DATA_URL_PATTERN = /^data:[^;]+;base64,[A-Za-z0-9+/]{1000,}/;

export function toolResultSanitizerMiddleware(): ChatMiddleware {
  return {
    name: "tool-result-sanitizer",
    onConfig: (_ctx: ChatMiddlewareContext, config: ChatMiddlewareConfig) => {
      let modified = false;
      const messages = config.messages.map((m) => {
        if (typeof m.content !== "string") return m;
        // Check if this message contains massive base64 (tool results often serialized as JSON)
        if (m.content.length > 10000) {
          // Strip base64 blobs from JSON tool result strings
          try {
            const parsed = JSON.parse(m.content);
            const cleaned = stripBase64(parsed);
            if (cleaned !== parsed) {
              modified = true;
              return { ...m, content: JSON.stringify(cleaned) };
            }
          } catch {
            // Not JSON — check raw content for base64
            if (BASE64_PATTERN.test(m.content.trim()) || DATA_URL_PATTERN.test(m.content.trim())) {
              modified = true;
              return { ...m, content: "[binary data removed — content saved to file]" };
            }
          }
        }
        return m;
      });
      if (modified) return { messages };
    },
  };
}

function stripBase64(obj: any): any {
  if (typeof obj === "string") {
    if (obj.length > 5000 && (BASE64_PATTERN.test(obj) || DATA_URL_PATTERN.test(obj))) {
      return "[base64 image data — saved to file]";
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(stripBase64);
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [key, val] of Object.entries(obj)) {
      // Known binary keys
      if ((key === "imageBase64" || key === "audioBase64" || key === "b64_json") && typeof val === "string" && val.length > 1000) {
        result[key] = "[saved to file]";
      } else {
        result[key] = stripBase64(val);
      }
    }
    return result;
  }
  return obj;
}

/**
 * Context pruning middleware — trims conversation history to stay within
 * token limits by summarizing old tool results and keeping recent messages.
 *
 * Strategy:
 * - Keep system messages untouched
 * - Keep the last N user/assistant message pairs intact
 * - Truncate large tool results from older messages to summaries
 * - Maximum context window: ~24000 chars (approx 6k tokens)
 */
const MAX_CONTEXT_CHARS = 24000; // ~6k tokens
const KEEP_RECENT_PAIRS = 4; // Keep last 4 message pairs (8 messages) fully intact

export function contextPruningMiddleware(): ChatMiddleware {
  return {
    name: "context-pruning",
    onConfig: (_ctx: ChatMiddlewareContext, config: ChatMiddlewareConfig) => {
      const messages = [...config.messages];
      const totalChars = messages.reduce((sum, m) => {
        const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        return sum + content.length;
      }, 0);

      // Only prune if over limit
      if (totalChars <= MAX_CONTEXT_CHARS) return;

      // Separate system messages from the rest
      const systemMsgs = messages.filter((m) => m.role === "system");
      const nonSystemMsgs = messages.filter((m) => m.role !== "system");

      // Keep the last N pairs intact
      const keepCount = Math.min(KEEP_RECENT_PAIRS * 2, nonSystemMsgs.length);
      const recentMsgs = nonSystemMsgs.slice(-keepCount);
      const olderMsgs = nonSystemMsgs.slice(0, -keepCount);

      // Truncate older messages — compress tool results and long content
      const compressedOlder = olderMsgs.map((m) => {
        const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        if (content.length > 500) {
          return {
            ...m,
            content: content.slice(0, 200) + "\n[...truncated for context window...]",
          };
        }
        return m;
      });

      return {
        messages: [...systemMsgs, ...compressedOlder, ...recentMsgs],
      };
    },
  };
}

/**
 * Tool selection middleware — controls which tools are available per iteration.
 *
 * Strategy:
 * - Iteration 0: All tools available (let the model pick freely)
 * - Iteration 3+: Remove search tools to encourage conclusion
 * - Iteration 5+: Only keep essential tools (memory, structured output)
 */
const SEARCH_TOOLS = ["tavily_search", "discover_skills", "memory_search"];
const HEAVY_TOOLS = ["generate_image", "generate_video", "spawn_subagent", "text_to_speech"];

export function toolSelectionMiddleware(): ChatMiddleware {
  return {
    name: "tool-selection",
    onConfig: (ctx: ChatMiddlewareContext, config: ChatMiddlewareConfig) => {
      if (ctx.phase !== "beforeModel") return;

      // After 5 iterations, remove search tools to encourage wrapping up
      if (ctx.iteration >= 5) {
        const filteredTools = config.tools.filter(
          (t) => !SEARCH_TOOLS.includes(t.name)
        );
        return { tools: filteredTools };
      }

      // After 8 iterations, also remove heavy generation tools
      if (ctx.iteration >= 8) {
        const filteredTools = config.tools.filter(
          (t) => !SEARCH_TOOLS.includes(t.name) && !HEAVY_TOOLS.includes(t.name)
        );
        return { tools: filteredTools };
      }
    },
  };
}

/**
 * Get the default middleware stack for a chat session.
 */
export function getMiddlewareStack(
  userId: string,
  channel: "web" | "whatsapp" | "telegram" = "web",
): ChatMiddleware[] {
  return [
    loggingMiddleware(userId, channel),
    auditTrailMiddleware(userId),
    toolResultSanitizerMiddleware(),
    dynamicModelMiddleware(userId),
    contextPruningMiddleware(),
    toolSelectionMiddleware(),
    toolCacheMiddleware({ ttl: 60_000 }),
  ];
}
