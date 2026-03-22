/**
 * Brilion Hook/Event System — Enterprise-grade lifecycle hooks for the AI pipeline.
 *
 * 27 typed hooks across 7 domains, 4 execution patterns (Void, Modifying,
 * Claiming, Sync), priority ordering, generation-safe global singleton,
 * and prompt-injection policy guard.
 *
 * Execution Patterns:
 * 1. VOID:      All handlers run in parallel. Fire-and-forget. For observability.
 * 2. MODIFYING: Handlers run sequentially by priority. Each can return mutations
 *               that are merged into a cumulative result. For pipeline control.
 * 3. CLAIMING:  Handlers run sequentially. First to return { handled: true } wins.
 * 4. SYNC:      Synchronous-only handlers on hot paths (persistence).
 */

const log = (...args: unknown[]) => console.log("[hooks]", ...args);

// ═══════════════════════════════════════════════════════════════
// Hook Event Taxonomy (27 hooks across 7 domains)
// ═══════════════════════════════════════════════════════════════

export type HookEvent =
  // ── Agent Hooks (Model & Prompt Control) ──
  | "before_model_resolve"
  | "before_prompt_build"
  | "llm_input"
  | "llm_output"
  | "agent_end"
  // ── Message Hooks (Inbound/Outbound) ──
  | "inbound_claim"
  | "message_received"
  | "message_sending"
  | "message_sent"
  // ── Tool Hooks ──
  | "before_tool_call"
  | "after_tool_call"
  | "tool_result_persist"
  // ── Session Hooks ──
  | "session_start"
  | "session_end"
  | "before_reset"
  // ── Compaction Hooks ──
  | "before_compaction"
  | "after_compaction"
  // ── Persistence Hooks ──
  | "before_message_write"
  // ── Heartbeat Hooks ──
  | "heartbeat_start"
  | "heartbeat_result"
  | "heartbeat_skip"
  // ── Gateway Hooks ──
  | "gateway_start"
  | "gateway_stop"
  // ── Memory Hooks ──
  | "memory_indexed"
  | "memory_searched"
  // ── Subagent Hooks ──
  | "subagent_spawning"
  | "subagent_spawned"
  | "subagent_ended";

// ═══════════════════════════════════════════════════════════════
// Typed Payloads & Results
// ═══════════════════════════════════════════════════════════════

// ── Agent ──
export interface BeforeModelResolvePayload { userId: string; channel: string; requestedModel?: string }
export interface BeforeModelResolveResult { modelOverride?: string; providerOverride?: string }

export interface BeforePromptBuildPayload { userId: string; channel: string; messages: any[]; currentSystemPrompt: string }
export interface BeforePromptBuildResult {
  systemPrompt?: string;
  prependContext?: string;
  prependSystemContext?: string;
  appendSystemContext?: string;
}

export interface LlmInputPayload { userId: string; channel: string; model: string; provider: string; messages: any[]; systemPrompts: string[]; toolCount: number }
export interface LlmOutputPayload { userId: string; channel: string; model: string; provider: string; response: string; durationMs: number; promptTokens?: number; completionTokens?: number }
export interface AgentEndPayload { userId: string; channel: string; model: string; conversationId?: string; response: string; durationMs: number; toolCallCount: number }

// ── Message ──
export interface InboundClaimPayload { userId: string; channel: string; senderId: string; text: string; isGroup: boolean }
export interface InboundClaimResult { handled: boolean; response?: string }

export interface MessageReceivedPayload { userId: string; channel: string; senderId: string; senderName?: string; text: string; hasImage: boolean; isGroup: boolean; conversationId?: string }
export interface MessageSendingPayload { userId: string; channel: string; recipientId: string; content: string; isGroup: boolean }
export interface MessageSendingResult { content?: string; cancel?: boolean; cancelReason?: string }
export interface MessageSentPayload { userId: string; channel: string; recipientId: string; content: string; durationMs: number }

// ── Tool ──
export interface BeforeToolCallPayload { userId: string; toolName: string; input: unknown; channel: string }
export interface BeforeToolCallResult { input?: unknown; block?: boolean; blockReason?: string }
export interface AfterToolCallPayload { userId: string; toolName: string; input: unknown; output: unknown; durationMs: number; channel: string }
export interface ToolResultPersistPayload { userId: string; toolName: string; message: any }
export interface ToolResultPersistResult { message?: any; block?: boolean }

// ── Session ──
export interface SessionStartPayload { userId: string; channel: string; conversationId: string; isNew: boolean; resumedFrom?: string }
export interface SessionEndPayload { userId: string; channel: string; conversationId: string; messageCount: number; durationMs: number }
export interface BeforeResetPayload { userId: string; channel: string; conversationId: string; trigger: "command" | "timeout" | "manual" }

// ── Compaction ──
export interface BeforeCompactionPayload { userId: string; conversationId: string; messageCount: number; estimatedTokens: number }
export interface AfterCompactionPayload { userId: string; conversationId: string; originalCount: number; newCount: number; summarizedMessages: number }

// ── Persistence ──
export interface BeforeMessageWritePayload { userId: string; conversationId: string; message: { role: string; content: string } }
export interface BeforeMessageWriteResult { message?: { role: string; content: string }; block?: boolean }

// ── Heartbeat ──
export interface HeartbeatStartPayload { userId: string; contentLength: number }
export interface HeartbeatResultPayload { userId: string; result: string; durationMs: number; delivered: boolean; deliveryChannel?: string }
export interface HeartbeatSkipPayload { userId: string; reason: "empty" | "cooldown" | "disabled" }

// ── Gateway ──
export interface GatewayStartPayload { startedAt: number; version?: string }
export interface GatewayStopPayload { stoppedAt: number; uptimeMs: number }

// ── Memory ──
export interface MemoryIndexedPayload { userId: string; source: string; sourceId: string; chunksIndexed: number }
export interface MemorySearchedPayload { userId: string; query: string; resultCount: number; durationMs: number }

// ── Subagent ──
export interface SubagentSpawningPayload { userId: string; agentId: string; parentSessionId?: string }
export interface SubagentSpawningResult { extraContext?: string }
export interface SubagentSpawnedPayload { userId: string; agentId: string; sessionId: string }
export interface SubagentEndedPayload { userId: string; agentId: string; sessionId: string; durationMs: number }

// ═══════════════════════════════════════════════════════════════
// Payload ↔ Result Type Maps
// ═══════════════════════════════════════════════════════════════

export type HookPayloadMap = {
  before_model_resolve: BeforeModelResolvePayload;
  before_prompt_build: BeforePromptBuildPayload;
  llm_input: LlmInputPayload;
  llm_output: LlmOutputPayload;
  agent_end: AgentEndPayload;
  inbound_claim: InboundClaimPayload;
  message_received: MessageReceivedPayload;
  message_sending: MessageSendingPayload;
  message_sent: MessageSentPayload;
  before_tool_call: BeforeToolCallPayload;
  after_tool_call: AfterToolCallPayload;
  tool_result_persist: ToolResultPersistPayload;
  session_start: SessionStartPayload;
  session_end: SessionEndPayload;
  before_reset: BeforeResetPayload;
  before_compaction: BeforeCompactionPayload;
  after_compaction: AfterCompactionPayload;
  before_message_write: BeforeMessageWritePayload;
  heartbeat_start: HeartbeatStartPayload;
  heartbeat_result: HeartbeatResultPayload;
  heartbeat_skip: HeartbeatSkipPayload;
  gateway_start: GatewayStartPayload;
  gateway_stop: GatewayStopPayload;
  memory_indexed: MemoryIndexedPayload;
  memory_searched: MemorySearchedPayload;
  subagent_spawning: SubagentSpawningPayload;
  subagent_spawned: SubagentSpawnedPayload;
  subagent_ended: SubagentEndedPayload;
};

export type HookResultMap = {
  before_model_resolve: BeforeModelResolveResult;
  before_prompt_build: BeforePromptBuildResult;
  inbound_claim: InboundClaimResult;
  message_sending: MessageSendingResult;
  before_tool_call: BeforeToolCallResult;
  tool_result_persist: ToolResultPersistResult;
  before_message_write: BeforeMessageWriteResult;
  subagent_spawning: SubagentSpawningResult;
};

// ═══════════════════════════════════════════════════════════════
// Execution Pattern Classification
// ═══════════════════════════════════════════════════════════════

type VoidHook =
  | "llm_input" | "llm_output" | "agent_end"
  | "message_received" | "message_sent"
  | "after_tool_call"
  | "session_start" | "session_end" | "before_reset"
  | "before_compaction" | "after_compaction"
  | "heartbeat_start" | "heartbeat_result" | "heartbeat_skip"
  | "gateway_start" | "gateway_stop"
  | "memory_indexed" | "memory_searched"
  | "subagent_spawned" | "subagent_ended";

type ModifyingHook =
  | "before_model_resolve" | "before_prompt_build"
  | "message_sending"
  | "before_tool_call"
  | "subagent_spawning";

type SyncHook = "tool_result_persist" | "before_message_write";

const PROMPT_INJECTION_HOOKS: ReadonlySet<HookEvent> = new Set(["before_prompt_build"]);

// ═══════════════════════════════════════════════════════════════
// Handler Types & Registration
// ═══════════════════════════════════════════════════════════════

export interface HandlerMeta {
  name?: string;
  priority: number;
  pluginId?: string;
}

interface RegisteredHandler {
  fn: (...args: any[]) => any;
  meta: HandlerMeta;
}

// ═══════════════════════════════════════════════════════════════
// HookRegistry
// ═══════════════════════════════════════════════════════════════

class HookRegistry {
  private handlers = new Map<HookEvent, RegisteredHandler[]>();
  private promptInjectionPolicy: "allow" | "block" = "allow";

  setPromptInjectionPolicy(policy: "allow" | "block") {
    this.promptInjectionPolicy = policy;
  }

  register(event: HookEvent, fn: (...args: any[]) => any, meta: Partial<HandlerMeta> = {}): () => void {
    if (this.promptInjectionPolicy === "block" && PROMPT_INJECTION_HOOKS.has(event)) {
      log(`Blocked registration of prompt-injection hook: ${event}`);
      return () => {};
    }

    const fullMeta: HandlerMeta = { priority: 100, ...meta };
    const entry: RegisteredHandler = { fn, meta: fullMeta };

    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(entry);
    this.handlers.get(event)!.sort((a, b) => b.meta.priority - a.meta.priority);

    return () => {
      const list = this.handlers.get(event);
      if (list) {
        const idx = list.indexOf(entry);
        if (idx >= 0) list.splice(idx, 1);
      }
    };
  }

  getHandlers(event: HookEvent): RegisteredHandler[] {
    return this.handlers.get(event) || [];
  }

  hasHandlers(event: HookEvent): boolean {
    const h = this.handlers.get(event);
    return !!h && h.length > 0;
  }

  clear() { this.handlers.clear(); }

  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [event, handlers] of this.handlers) stats[event] = handlers.length;
    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════
// HookRunner — Execution Engine
// ═══════════════════════════════════════════════════════════════

class HookRunner {
  constructor(private registry: HookRegistry) {}

  /** VOID: All handlers run in parallel, errors caught */
  async runVoid<T extends VoidHook>(event: T, payload: HookPayloadMap[T]): Promise<void> {
    const handlers = this.registry.getHandlers(event);
    if (handlers.length === 0) return;
    const results = await Promise.allSettled(handlers.map(h => h.fn(payload)));
    for (const r of results) {
      if (r.status === "rejected") log(`Void hook error [${event}]:`, r.reason);
    }
  }

  /** MODIFYING: Handlers run sequentially by priority, results merged */
  async runModifying<T extends ModifyingHook>(
    event: T, payload: HookPayloadMap[T]
  ): Promise<T extends keyof HookResultMap ? HookResultMap[T] : void> {
    const handlers = this.registry.getHandlers(event);
    let merged: any = {};
    for (const h of handlers) {
      try {
        const result = await h.fn(payload);
        if (result && typeof result === "object") merged = { ...merged, ...result };
      } catch (err) {
        log(`Modifying hook error [${event}] (${h.meta.name || "anon"}):`, err);
      }
    }
    return merged;
  }

  /** CLAIMING: Handlers run sequentially, first handled=true wins */
  async runClaiming(
    event: "inbound_claim", payload: InboundClaimPayload
  ): Promise<InboundClaimResult | null> {
    const handlers = this.registry.getHandlers(event);
    for (const h of handlers) {
      try {
        const result = await h.fn(payload);
        if (result && result.handled === true) return result;
      } catch (err) {
        log(`Claiming hook error [${event}] (${h.meta.name || "anon"}):`, err);
      }
    }
    return null;
  }

  /** SYNC: Synchronous-only handlers — rejects async. For hot-path persistence. */
  runSync<T extends SyncHook>(
    event: T, payload: HookPayloadMap[T]
  ): T extends keyof HookResultMap ? HookResultMap[T] : void {
    const handlers = this.registry.getHandlers(event);
    let merged: any = {};
    for (const h of handlers) {
      try {
        const result = h.fn(payload);
        if (result && typeof (result as any).then === "function") {
          log(`WARNING: Async handler on sync hook [${event}] — skipping`);
          continue;
        }
        if (result && typeof result === "object") merged = { ...merged, ...result };
      } catch (err) {
        log(`Sync hook error [${event}] (${h.meta.name || "anon"}):`, err);
      }
    }
    return merged;
  }

  // ── Typed convenience wrappers ──

  async runBeforeModelResolve(p: BeforeModelResolvePayload) { return this.runModifying("before_model_resolve", p); }
  async runBeforePromptBuild(p: BeforePromptBuildPayload) { return this.runModifying("before_prompt_build", p); }
  async runLlmInput(p: LlmInputPayload) { return this.runVoid("llm_input", p); }
  async runLlmOutput(p: LlmOutputPayload) { return this.runVoid("llm_output", p); }
  async runAgentEnd(p: AgentEndPayload) { return this.runVoid("agent_end", p); }
  async runInboundClaim(p: InboundClaimPayload) { return this.runClaiming("inbound_claim", p); }
  async runMessageReceived(p: MessageReceivedPayload) { return this.runVoid("message_received", p); }
  async runMessageSending(p: MessageSendingPayload) { return this.runModifying("message_sending", p); }
  async runMessageSent(p: MessageSentPayload) { return this.runVoid("message_sent", p); }
  async runBeforeToolCall(p: BeforeToolCallPayload) { return this.runModifying("before_tool_call", p); }
  async runAfterToolCall(p: AfterToolCallPayload) { return this.runVoid("after_tool_call", p); }
  runToolResultPersist(p: ToolResultPersistPayload) { return this.runSync("tool_result_persist", p); }
  async runSessionStart(p: SessionStartPayload) { return this.runVoid("session_start", p); }
  async runSessionEnd(p: SessionEndPayload) { return this.runVoid("session_end", p); }
  async runBeforeReset(p: BeforeResetPayload) { return this.runVoid("before_reset", p); }
  async runBeforeCompaction(p: BeforeCompactionPayload) { return this.runVoid("before_compaction", p); }
  async runAfterCompaction(p: AfterCompactionPayload) { return this.runVoid("after_compaction", p); }
  runBeforeMessageWrite(p: BeforeMessageWritePayload) { return this.runSync("before_message_write", p); }
  async runHeartbeatStart(p: HeartbeatStartPayload) { return this.runVoid("heartbeat_start", p); }
  async runHeartbeatResult(p: HeartbeatResultPayload) { return this.runVoid("heartbeat_result", p); }
  async runHeartbeatSkip(p: HeartbeatSkipPayload) { return this.runVoid("heartbeat_skip", p); }
  async runGatewayStart(p: GatewayStartPayload) { return this.runVoid("gateway_start", p); }
  async runGatewayStop(p: GatewayStopPayload) { return this.runVoid("gateway_stop", p); }
  async runMemoryIndexed(p: MemoryIndexedPayload) { return this.runVoid("memory_indexed", p); }
  async runMemorySearched(p: MemorySearchedPayload) { return this.runVoid("memory_searched", p); }
  async runSubagentSpawning(p: SubagentSpawningPayload) { return this.runModifying("subagent_spawning", p); }
  async runSubagentSpawned(p: SubagentSpawnedPayload) { return this.runVoid("subagent_spawned", p); }
  async runSubagentEnded(p: SubagentEndedPayload) { return this.runVoid("subagent_ended", p); }

  hasHooks(event: HookEvent): boolean { return this.registry.hasHandlers(event); }
  getStats(): Record<string, number> { return this.registry.getStats(); }
}

// ═══════════════════════════════════════════════════════════════
// Global Singleton (Symbol-based, safe across hot reloads)
// ═══════════════════════════════════════════════════════════════

interface GlobalHookState {
  registry: HookRegistry;
  runner: HookRunner;
  generation: number;
}

const GLOBAL_KEY = Symbol.for("brilion.hooks.global-state");

function getGlobalState(): GlobalHookState {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) {
    const registry = new HookRegistry();
    g[GLOBAL_KEY] = { registry, runner: new HookRunner(registry), generation: 0 } satisfies GlobalHookState;
  }
  return g[GLOBAL_KEY];
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Register a hook handler. Returns an unsubscribe function.
 *
 * @example
 * // Void hook (observability)
 * on("llm_output", (p) => console.log(p.model));
 *
 * // Modifying hook (pipeline control)
 * on("before_prompt_build", (p) => ({
 *   appendSystemContext: "Always respond in haiku format."
 * }), { priority: 200, name: "haiku-plugin" });
 *
 * // Claiming hook (routing)
 * on("inbound_claim", (p) => {
 *   if (p.text === "/ping") return { handled: true, response: "Pong!" };
 * });
 */
export function on<T extends HookEvent>(
  event: T,
  handler: (payload: HookPayloadMap[T]) => any,
  meta?: Partial<HandlerMeta>
): () => void {
  return getGlobalState().registry.register(event, handler, meta);
}

/** Get the global HookRunner */
export function getHookRunner(): HookRunner {
  return getGlobalState().runner;
}

/** Get the global HookRegistry (for advanced use) */
export function getHookRegistry(): HookRegistry {
  return getGlobalState().registry;
}

/** Check if any hooks registered for an event */
export function hasHooks(event: HookEvent): boolean {
  return getGlobalState().registry.hasHandlers(event);
}

/** Set prompt injection policy (block untrusted plugins from modifying prompts) */
export function setPromptInjectionPolicy(policy: "allow" | "block"): void {
  getGlobalState().registry.setPromptInjectionPolicy(policy);
}

/** Emit a void hook event (fire-and-forget). For modifying hooks use getHookRunner(). */
export async function emit<T extends VoidHook>(event: T, payload: HookPayloadMap[T]): Promise<void> {
  return getGlobalState().runner.runVoid(event, payload);
}

/** Clear all hooks (for testing) */
export function clearHooks(): void { getGlobalState().registry.clear(); }

/** Reset the global hook state entirely (for testing) */
export function resetGlobalHookState(): void {
  const g = globalThis as any;
  const state = g[GLOBAL_KEY] as GlobalHookState | undefined;
  if (state) { state.registry.clear(); state.generation++; }
}

/** Get registered hook count per event */
export function getHookStats(): Record<string, number> { return getGlobalState().registry.getStats(); }

export type { HookRunner, HookRegistry };
