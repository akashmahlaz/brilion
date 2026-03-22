import { aiEventClient } from "@tanstack/ai/event-client";

/**
 * Server-side AI observability — subscribe to TanStack AI events for logging.
 * Import this file once from the server entry point to activate.
 */

let initialized = false;

export function initAIObservability() {
  if (initialized) return;
  initialized = true;

  aiEventClient.on("text:request:started", (e) => {
    console.log("[ai:obs] Request started", {
      model: e.model,
      provider: e.provider,
    });
  }, { withEventTarget: true });

  aiEventClient.on("text:usage", (e) => {
    console.log("[ai:obs] Usage", {
      promptTokens: e.usage?.promptTokens,
      completionTokens: e.usage?.completionTokens,
      totalTokens: e.usage?.totalTokens,
    });
  }, { withEventTarget: true });

  aiEventClient.on("tools:call:completed", (e) => {
    console.log("[ai:obs] Tool completed", {
      toolName: e.toolName,
      duration: e.duration,
    });
  }, { withEventTarget: true });

  aiEventClient.on("text:request:completed", (e) => {
    console.log("[ai:obs] Request completed", {
      finishReason: e.finishReason,
    });
  }, { withEventTarget: true });
}
