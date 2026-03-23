import type { ChatMiddleware, ChatMiddlewareContext, UsageInfo, ErrorInfo, AfterToolCallInfo, ToolCallHookContext } from "@tanstack/ai";
import { toolCacheMiddleware } from "@tanstack/ai/middlewares";
import { createLogger } from "../models/log-entry";
import { trackUsage } from "./usage-tracker";

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
 * Get the default middleware stack for a chat session.
 */
export function getMiddlewareStack(
  userId: string,
  channel: "web" | "whatsapp" | "telegram" = "web",
): ChatMiddleware[] {
  return [
    loggingMiddleware(userId, channel),
    auditTrailMiddleware(userId),
    toolCacheMiddleware({ ttl: 60_000 }),
  ];
}
