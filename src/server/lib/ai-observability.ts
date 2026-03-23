import { aiEventClient } from "@tanstack/ai/event-client";
import { emit } from "./hooks";

/**
 * Server-side AI observability — subscribe to TanStack AI events for logging
 * and pipe them into the hook system for plugin observability.
 *
 * Note: aiEventClient.on() expects the full prefixed event name from AIDevtoolsEventMap keys.
 * We use type assertions for the event payload properties since the callback receives
 * a TanStackDevtoolsEvent wrapper.
 */

let initialized = false;

export function initAIObservability() {
  if (initialized) return;
  initialized = true;

  aiEventClient.on("tanstack-ai-devtools:text:request:started", (e: any) => {
    console.log("[ai:obs] Request started", {
      model: e.model,
      provider: e.provider,
    });
  });

  aiEventClient.on("tanstack-ai-devtools:text:usage", (e: any) => {
    console.log("[ai:obs] Usage", {
      promptTokens: e.usage?.promptTokens,
      completionTokens: e.usage?.completionTokens,
      totalTokens: e.usage?.totalTokens,
    });
  });

  aiEventClient.on("tanstack-ai-devtools:tools:call:completed", (e: any) => {
    console.log("[ai:obs] Tool completed", {
      toolName: e.toolName,
      duration: e.duration,
    });
    emit("after_tool_call", {
      userId: "",
      toolName: e.toolName ?? "unknown",
      input: undefined,
      output: e.result,
      durationMs: e.duration ?? 0,
      channel: "api",
    }).catch(() => {});
  });

  aiEventClient.on("tanstack-ai-devtools:text:request:completed", (e: any) => {
    console.log("[ai:obs] Request completed", {
      finishReason: e.finishReason,
    });
  });
}
