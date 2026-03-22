/**
 * Redis connection — shared ioredis instance for Brilion SaaS.
 * Uses Upstash Redis with TLS. Provides:
 * - Shared connection for rate limiting, caching, pub/sub
 * - BullMQ connection factory for queues and workers
 */
import Redis, { type RedisOptions } from "ioredis";

const log = (...args: unknown[]) => console.log("[redis]", ...args);
const logErr = (...args: unknown[]) => console.error("[redis]", ...args);

const REDIS_URL = process.env.REDIS_URL || "";

let _redis: Redis | null = null;

/** Parse the Redis URL and return ioredis connection options */
function parseRedisOpts(): RedisOptions {
  if (!REDIS_URL) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
    password: url.password || undefined,
    username: url.username || "default",
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      if (times > 10) return null; // Stop retrying after 10 attempts
      return Math.min(times * 200, 5000);
    },
    lazyConnect: true,
  };
}

/** Get shared Redis instance (lazy connect) */
export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(parseRedisOpts());
    _redis.on("connect", () => log("Connected to Redis"));
    _redis.on("error", (err) => logErr("Redis error:", err.message));
    _redis.on("close", () => log("Redis connection closed"));
  }
  return _redis;
}

/** Create a NEW Redis connection (for BullMQ workers which need their own) */
export function createRedisConnection(): Redis {
  return new Redis(parseRedisOpts());
}

/** Get raw connection options (for BullMQ which bundles its own ioredis) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRedisConnectionOpts(): Record<string, any> {
  return { ...parseRedisOpts() };
}

/** Check if Redis is configured */
export function isRedisConfigured(): boolean {
  return !!REDIS_URL;
}

/** Graceful shutdown */
export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit().catch(() => {});
    _redis = null;
    log("Redis connection closed");
  }
}

// ─── Redis-based Rate Limiter ──────────────────────────

/**
 * Sliding-window rate limiter backed by Redis sorted sets.
 * Works across all server instances.
 *
 * @param key - Rate limit key (e.g. `rl:outbound:{userId}`)
 * @param maxRequests - Max allowed in window
 * @param windowMs - Window size in milliseconds
 * @returns true if allowed, false if rate-limited
 */
export async function checkRedisRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - windowMs;

  // Use a pipeline for atomicity
  const pipeline = redis.pipeline();
  // Remove entries older than window
  pipeline.zremrangebyscore(key, 0, windowStart);
  // Count current entries
  pipeline.zcard(key);
  // Add current timestamp
  pipeline.zadd(key, now.toString(), `${now}:${Math.random().toString(36).slice(2, 8)}`);
  // Set expiry on the key
  pipeline.pexpire(key, windowMs);

  const results = await pipeline.exec();
  const count = (results?.[1]?.[1] as number) || 0;

  return count < maxRequests;
}

// ─── Session/Presence Cache ────────────────────────────

/** Cache a user's WhatsApp connection status in Redis (for cross-instance awareness) */
export async function cacheConnectionStatus(
  userId: string,
  status: "connected" | "disconnected" | "connecting",
  jid?: string,
): Promise<void> {
  try {
    const redis = getRedis();
    const data = JSON.stringify({ status, jid, updatedAt: Date.now() });
    await redis.set(`wa:status:${userId}`, data, "EX", 300); // 5 min TTL, refreshed on heartbeat
  } catch {
    // Non-critical — fallback to in-memory
  }
}

/** Get cached connection status */
export async function getCachedConnectionStatus(
  userId: string,
): Promise<{ status: string; jid?: string } | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(`wa:status:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
