/**
 * Heartbeat Wake Queue — Priority-based heartbeat scheduling with coalescing.
 *
 * Surpasses OpenClaw's heartbeat-runner by adding:
 * - 4-tier priority: RETRY (0) > INTERVAL (1) > DEFAULT (2) > ACTION (3)
 * - Coalescing: Multiple wake requests within a batch window collapse into one
 * - Generation-safe disposers: Stale wake requests auto-expire on state change
 * - Retry cooldown: Prevents retry storms (min 1 000 ms between retries)
 * - Per-user priority queues: Each user maintains independent heartbeat scheduling
 */

const log = (...args: unknown[]) => console.log("[heartbeat-wake]", ...args);

// ═══════════════════════════════════════════════════════════════
// Wake Reasons (lower number = higher priority)
// ═══════════════════════════════════════════════════════════════

export const WakeReason = {
  RETRY: 0,
  INTERVAL: 1,
  DEFAULT: 2,
  ACTION: 3,
} as const;
export type WakeReason = (typeof WakeReason)[keyof typeof WakeReason];

export const WakeReasonLabel: Record<WakeReason, string> = {
  [WakeReason.RETRY]: "retry",
  [WakeReason.INTERVAL]: "interval",
  [WakeReason.DEFAULT]: "default",
  [WakeReason.ACTION]: "action",
};

// ═══════════════════════════════════════════════════════════════
// Wake Request
// ═══════════════════════════════════════════════════════════════

export interface WakeRequest {
  userId: string;
  reason: WakeReason;
  generation: number;
  requestedAt: number;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// Per-User Wake State
// ═══════════════════════════════════════════════════════════════

interface UserWakeState {
  /** Current generation — increments on state changes that invalidate pending wakes */
  generation: number;
  /** Pending coalesced wake (highest priority wins) */
  pending: WakeRequest | null;
  /** Coalesce timer handle */
  coalesceTimer: ReturnType<typeof setTimeout> | null;
  /** Timestamp of last execution */
  lastExecutedAt: number;
  /** Timestamp of last retry */
  lastRetryAt: number;
  /** Total wakes executed */
  totalWakes: number;
  /** Wakes coalesced (merged into existing pending) */
  totalCoalesced: number;
  /** Wakes dropped (stale generation) */
  totalDropped: number;
}

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

export interface HeartbeatWakeConfig {
  /** Batch window in ms — requests within this window coalesce (default: 250) */
  coalesceWindowMs: number;
  /** Minimum ms between retry wakes for a user (default: 1000) */
  retryCooldownMs: number;
  /** Maximum pending wakes across all users before dropping ACTION-priority (default: 100) */
  maxGlobalPending: number;
}

const DEFAULT_CONFIG: HeartbeatWakeConfig = {
  coalesceWindowMs: 250,
  retryCooldownMs: 1_000,
  maxGlobalPending: 100,
};

// ═══════════════════════════════════════════════════════════════
// HeartbeatWakeQueue
// ═══════════════════════════════════════════════════════════════

type WakeHandler = (userId: string, reason: WakeReason, metadata?: Record<string, unknown>) => Promise<void>;

export class HeartbeatWakeQueue {
  private states = new Map<string, UserWakeState>();
  private config: HeartbeatWakeConfig;
  private handler: WakeHandler | null = null;

  constructor(config: Partial<HeartbeatWakeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Set the handler that actually executes heartbeats */
  setHandler(handler: WakeHandler): void {
    this.handler = handler;
  }

  /** Request a heartbeat wake for a user */
  requestWake(userId: string, reason: WakeReason, metadata?: Record<string, unknown>): void {
    const state = this.getOrCreateState(userId);
    const now = Date.now();

    // Retry cooldown check
    if (reason === WakeReason.RETRY && now - state.lastRetryAt < this.config.retryCooldownMs) {
      log(`Retry cooldown for ${userId} — skipping (last retry ${now - state.lastRetryAt}ms ago)`);
      state.totalDropped++;
      return;
    }

    // Back-pressure: drop ACTION-priority wakes when global queue is full
    if (reason === WakeReason.ACTION && this.getGlobalPendingCount() >= this.config.maxGlobalPending) {
      log(`Global back-pressure — dropping ACTION wake for ${userId}`);
      state.totalDropped++;
      return;
    }

    const request: WakeRequest = {
      userId,
      reason,
      generation: state.generation,
      requestedAt: now,
      metadata,
    };

    // Coalesce: if there's already a pending wake, keep the higher priority one
    if (state.pending) {
      if (reason < state.pending.reason) {
        // New request has higher priority — replace
        state.pending = request;
        log(`Wake replaced for ${userId}: ${WakeReasonLabel[reason]} (higher priority)`);
      } else {
        state.totalCoalesced++;
      }
      return;
    }

    // No pending wake — set it and start coalesce timer
    state.pending = request;
    state.coalesceTimer = setTimeout(() => this.flush(userId), this.config.coalesceWindowMs);
  }

  /** Immediately execute pending wake for a user, bypassing coalesce window */
  async flushNow(userId: string): Promise<void> {
    const state = this.states.get(userId);
    if (!state?.pending) return;
    if (state.coalesceTimer) {
      clearTimeout(state.coalesceTimer);
      state.coalesceTimer = null;
    }
    await this.executeWake(state);
  }

  /** Increment generation — invalidates all pending wakes for a user */
  invalidate(userId: string): void {
    const state = this.states.get(userId);
    if (!state) return;
    state.generation++;
    if (state.pending) {
      log(`Generation bump for ${userId} — invalidated pending wake`);
      state.pending = null;
      if (state.coalesceTimer) {
        clearTimeout(state.coalesceTimer);
        state.coalesceTimer = null;
      }
      state.totalDropped++;
    }
  }

  /** Get generation for a user (for callers to check staleness) */
  getGeneration(userId: string): number {
    return this.states.get(userId)?.generation ?? 0;
  }

  /** Dispose of all pending wakes and timers */
  dispose(): void {
    for (const [, state] of this.states) {
      if (state.coalesceTimer) clearTimeout(state.coalesceTimer);
    }
    this.states.clear();
  }

  /** Get stats for monitoring */
  getStats(): {
    totalUsers: number;
    pendingWakes: number;
    perUser: Record<string, { generation: number; totalWakes: number; totalCoalesced: number; totalDropped: number }>;
  } {
    const perUser: Record<string, any> = {};
    let pendingWakes = 0;
    for (const [userId, state] of this.states) {
      if (state.pending) pendingWakes++;
      perUser[userId] = {
        generation: state.generation,
        totalWakes: state.totalWakes,
        totalCoalesced: state.totalCoalesced,
        totalDropped: state.totalDropped,
      };
    }
    return { totalUsers: this.states.size, pendingWakes, perUser };
  }

  // ── Private ──

  private getOrCreateState(userId: string): UserWakeState {
    let state = this.states.get(userId);
    if (!state) {
      state = {
        generation: 0,
        pending: null,
        coalesceTimer: null,
        lastExecutedAt: 0,
        lastRetryAt: 0,
        totalWakes: 0,
        totalCoalesced: 0,
        totalDropped: 0,
      };
      this.states.set(userId, state);
    }
    return state;
  }

  private async flush(userId: string): Promise<void> {
    const state = this.states.get(userId);
    if (!state?.pending) return;
    state.coalesceTimer = null;
    await this.executeWake(state);
  }

  private async executeWake(state: UserWakeState): Promise<void> {
    const wake = state.pending;
    if (!wake) return;
    state.pending = null;

    // Generation check — drop stale wakes
    if (wake.generation !== state.generation) {
      log(`Stale wake for ${wake.userId} (gen ${wake.generation} vs ${state.generation}) — dropping`);
      state.totalDropped++;
      return;
    }

    if (!this.handler) {
      log(`No handler set — dropping wake for ${wake.userId}`);
      return;
    }

    const now = Date.now();
    state.lastExecutedAt = now;
    if (wake.reason === WakeReason.RETRY) state.lastRetryAt = now;
    state.totalWakes++;

    try {
      await this.handler(wake.userId, wake.reason, wake.metadata);
    } catch (err) {
      log(`Wake handler error for ${wake.userId}:`, err);
      // Auto-schedule a retry for non-retry wakes
      if (wake.reason !== WakeReason.RETRY) {
        this.requestWake(wake.userId, WakeReason.RETRY, { originalReason: wake.reason });
      }
    }
  }

  private getGlobalPendingCount(): number {
    let count = 0;
    for (const [, state] of this.states) {
      if (state.pending) count++;
    }
    return count;
  }
}

// ═══════════════════════════════════════════════════════════════
// Global Singleton
// ═══════════════════════════════════════════════════════════════

const GLOBAL_KEY = Symbol.for("brilion.heartbeat-wake.global");

function getGlobalQueue(): HeartbeatWakeQueue {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new HeartbeatWakeQueue();
  return g[GLOBAL_KEY];
}

/** Set the handler for heartbeat wake execution */
export function setHeartbeatWakeHandler(handler: WakeHandler): void {
  getGlobalQueue().setHandler(handler);
}

/** Request a heartbeat wake for a user */
export function requestHeartbeatWake(
  userId: string,
  reason: WakeReason = WakeReason.DEFAULT,
  metadata?: Record<string, unknown>
): void {
  getGlobalQueue().requestWake(userId, reason, metadata);
}

/** Invalidate pending wakes for a user (e.g., on session reset) */
export function invalidateHeartbeatWakes(userId: string): void {
  getGlobalQueue().invalidate(userId);
}

/** Get heartbeat queue stats */
export function getHeartbeatWakeStats() {
  return getGlobalQueue().getStats();
}

/** Dispose of the global queue (for testing) */
export function disposeHeartbeatWakeQueue(): void {
  getGlobalQueue().dispose();
}
