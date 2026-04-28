/**
 * Shared Chat SDK state adapter.
 * Backed by ioredis (the same Redis instance Brilion uses for BullMQ + rate-limit).
 *
 * Used by per-user `Chat` instances created in `bot-registry.ts`. Chat SDK
 * keys are namespaced internally by `keyPrefix` and by `adapter:channel:thread`
 * so a single adapter is safe for multi-tenant use.
 */
import { ConsoleLogger, type StateAdapter } from "chat";
import { createIoRedisState } from "@chat-adapter/state-ioredis";
import { getRedis, isRedisConfigured } from "./redis";

let _state: StateAdapter | null = null;

export function getChatSdkState(): StateAdapter {
  if (_state) return _state;
  if (!isRedisConfigured()) {
    throw new Error(
      "[chat-sdk] REDIS_URL is not configured — Chat SDK requires a state adapter (see @chat-adapter/state-ioredis)"
    );
  }
  _state = createIoRedisState({
    client: getRedis(),
    keyPrefix: "brilion:chat-sdk",
    logger: new ConsoleLogger("info"),
  });
  return _state;
}

export function hasChatSdkState(): boolean {
  return isRedisConfigured();
}
