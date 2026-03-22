/**
 * Hooks/Event System — OpenClaw-inspired lifecycle hooks for the AI pipeline.
 *
 * Allows registering callbacks for key events in the AI lifecycle:
 * - beforeChat: Before AI generates a response (can modify messages/config)
 * - afterChat: After AI response is generated (for logging, side effects)
 * - beforeTool: Before a tool is executed (can block or modify)
 * - afterTool: After a tool completes (for logging, auditing)
 * - sessionStart: When a new conversation session begins
 * - onCompaction: After conversation compaction runs
 */

const log = (...args: unknown[]) => console.log("[hooks]", ...args);

export type HookEvent =
  | "beforeChat"
  | "afterChat"
  | "beforeTool"
  | "afterTool"
  | "sessionStart"
  | "onCompaction";

export interface BeforeChatPayload {
  userId: string;
  channel: string;
  messages: any[];
  systemPrompts: string[];
}

export interface AfterChatPayload {
  userId: string;
  channel: string;
  response: string;
  durationMs: number;
  model: string;
}

export interface BeforeToolPayload {
  userId: string;
  toolName: string;
  input: unknown;
}

export interface AfterToolPayload {
  userId: string;
  toolName: string;
  input: unknown;
  output: unknown;
  durationMs: number;
}

export interface SessionStartPayload {
  userId: string;
  channel: string;
  conversationId: string;
  isNew: boolean;
}

export interface OnCompactionPayload {
  userId: string;
  conversationId: string;
  originalCount: number;
  newCount: number;
  summarizedMessages: number;
}

type HookPayloadMap = {
  beforeChat: BeforeChatPayload;
  afterChat: AfterChatPayload;
  beforeTool: BeforeToolPayload;
  afterTool: AfterToolPayload;
  sessionStart: SessionStartPayload;
  onCompaction: OnCompactionPayload;
};

type HookHandler<T extends HookEvent> = (payload: HookPayloadMap[T]) => void | Promise<void>;

const registry = new Map<HookEvent, Set<HookHandler<any>>>();

/** Register a hook handler for a specific event */
export function on<T extends HookEvent>(event: T, handler: HookHandler<T>): () => void {
  if (!registry.has(event)) {
    registry.set(event, new Set());
  }
  registry.get(event)!.add(handler);

  // Return unsubscribe function
  return () => {
    registry.get(event)?.delete(handler);
  };
}

/** Emit a hook event — all handlers run in parallel, errors are caught */
export async function emit<T extends HookEvent>(
  event: T,
  payload: HookPayloadMap[T]
): Promise<void> {
  const handlers = registry.get(event);
  if (!handlers || handlers.size === 0) return;

  const results = await Promise.allSettled(
    Array.from(handlers).map((fn) => fn(payload))
  );

  for (const r of results) {
    if (r.status === "rejected") {
      log(`Hook handler error [${event}]:`, r.reason);
    }
  }
}

/** Clear all hooks (useful for testing) */
export function clearHooks(): void {
  registry.clear();
}

/** Get registered hook count per event (for debugging) */
export function getHookStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const [event, handlers] of registry) {
    stats[event] = handlers.size;
  }
  return stats;
}
