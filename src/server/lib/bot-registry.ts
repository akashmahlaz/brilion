/**
 * Per-user Chat SDK bot registry.
 *
 * Each Brilion user gets their own `Chat` instance, lazily created the first
 * time we need to deliver inbound messages or send outbound. This mirrors the
 * existing per-user model used by `wa-manager` (Baileys) and the legacy
 * grammY-based Telegram channel.
 *
 * Why per-user: every adapter (Telegram bot, Slack workspace, Discord app, …)
 * is scoped to credentials owned by one Brilion tenant. Chat SDK's adapter
 * config is static at construction time, so a global Chat instance can't fan
 * out to N different tenants' tokens.
 *
 * Channels supported (Phase 1): telegram. Slack/Discord/Teams/GChat/GitHub/
 * Linear are wired in later phases — adapter creation is gated by config.
 *
 * WhatsApp is NOT routed through this registry. It uses Baileys via
 * `wa-manager.ts`, because Chat SDK's WhatsApp adapter targets Meta's Cloud
 * API (no QR/personal-account login).
 */
import { Chat, type Adapter } from "chat";
import { createTelegramAdapter, TelegramAdapter } from "@chat-adapter/telegram";
import { getChatSdkState } from "./chat-sdk-state";
import { loadConfig } from "./config";
import { routeMessage } from "./router";

const log = (...args: unknown[]) => console.log("[bot-registry]", ...args);
const logErr = (...args: unknown[]) => console.error("[bot-registry]", ...args);

export type SupportedPlatform =
  | "telegram"
  | "slack"
  | "discord"
  | "teams"
  | "gchat"
  | "github"
  | "linear";

interface BotEntry {
  userId: string;
  chat: Chat<Record<string, Adapter>>;
  adapters: Set<SupportedPlatform>;
  createdAt: number;
}

const registry = new Map<string, BotEntry>();
/** Build locks so concurrent callers share one in-flight build. */
const building = new Map<string, Promise<BotEntry>>();

/** Drop and reset a user's Chat instance — call after a connect/disconnect. */
export async function invalidateBot(userId: string): Promise<void> {
  const existing = registry.get(userId);
  if (!existing) return;
  registry.delete(userId);
  // Best-effort polling shutdown for stateful adapters (Telegram polling).
  try {
    const tg = existing.chat.getAdapter?.("telegram") as TelegramAdapter | undefined;
    if (tg && typeof tg.stopPolling === "function") {
      await tg.stopPolling().catch(() => {});
    }
  } catch (e) {
    logErr("invalidateBot stopPolling failed:", e);
  }
}

/**
 * Get (or build) the Chat instance for a user, with all adapters their config
 * enables. Returns null when the user has no Chat-SDK channels enabled.
 */
export async function getBotForUser(userId: string): Promise<BotEntry | null> {
  const cached = registry.get(userId);
  if (cached) return cached;

  const inflight = building.get(userId);
  if (inflight) return inflight;

  const promise = buildBot(userId).finally(() => building.delete(userId));
  building.set(userId, promise);
  return promise;
}

async function buildBot(userId: string): Promise<BotEntry> {
  log("Building Chat instance for user:", userId);

  const config = await loadConfig(userId);
  const channels = (config?.channels ?? {}) as Record<string, any>;

  const adapters: Record<string, Adapter> = {};
  const enabled = new Set<SupportedPlatform>();

  // ── Telegram ──────────────────────────────────────────────────────────
  const tg = channels.telegram ?? {};
  if (tg.enabled !== false && typeof tg.botToken === "string" && tg.botToken) {
    adapters.telegram = createTelegramAdapter({
      botToken: tg.botToken,
      // Default to "polling" — Brilion runs as a long-lived process. Webhook
      // mode is also wired (see api/webhooks.$userId.$platform.ts) and a tenant
      // can flip the mode via config later.
      mode: tg.mode === "webhook" ? "webhook" : "polling",
      secretToken: tg.webhookSecret || undefined,
      userName: tg.botUsername || undefined,
    });
    enabled.add("telegram");
  }

  // Future: slack/discord/teams/gchat/github/linear — wire in later phases.
  // (Adapters are created here once the user supplies the relevant creds.)

  if (Object.keys(adapters).length === 0) {
    log("No Chat-SDK adapters enabled for user:", userId, "— skipping build");
    // Throw so caller can decide; we still cache nothing.
    throw new Error("no-adapters");
  }

  const chat = new Chat({
    userName: tg.botUsername || `brilion-${userId.slice(-8)}`,
    adapters,
    state: getChatSdkState(),
    // Long-running AI replies — let the latest message win when one is already
    // being processed for the same thread (fits AI-assistant UX).
    onLockConflict: "force",
    logger: "info",
  });

  registerHandlers(userId, chat);

  // For polling adapters, kick off polling now.
  for (const platform of enabled) {
    const a = chat.getAdapter(platform as keyof typeof adapters) as unknown;
    if (
      platform === "telegram" &&
      a &&
      typeof (a as TelegramAdapter).startPolling === "function" &&
      (tg.mode !== "webhook")
    ) {
      (a as TelegramAdapter).startPolling().catch((e) => {
        logErr(`[${platform}] startPolling failed for user ${userId}:`, e);
      });
      log(`[${platform}] polling started for user ${userId}`);
    }
  }

  const entry: BotEntry = { userId, chat, adapters: enabled, createdAt: Date.now() };
  registry.set(userId, entry);
  return entry;
}

/**
 * Register the channel-agnostic handlers on a per-user Chat instance.
 * Both `onNewMention` and `onSubscribedMessage` route into `routeMessage()`,
 * which already owns access control, commands, conversation persistence, AI,
 * and outbound dispatch (for legacy WhatsApp). For Chat SDK channels we send
 * the reply via `thread.post(...)`.
 */
function registerHandlers(userId: string, chat: Chat<Record<string, Adapter>>) {
  chat.onNewMention(async (thread, message) => {
    // Subscribe so follow-ups in the same thread route to onSubscribedMessage
    // — matches the AI-assistant pattern from the SDK docs.
    await thread.subscribe().catch(() => {});
    await dispatch(userId, thread, message, /* isMention */ true);
  });

  chat.onSubscribedMessage(async (thread, message) => {
    await dispatch(userId, thread, message, /* isMention */ true);
  });
}

async function dispatch(
  userId: string,
  thread: any, // Thread<...>
  message: any, // Message
  isMention: boolean
) {
  // Identify the platform from the threadId — format is `{adapter}:{...}`.
  const platform = String(thread.id || "").split(":")[0] as SupportedPlatform;

  const senderId = String(message.author?.userId ?? "");
  const senderName = String(message.author?.fullName || message.author?.userName || "");
  const text = String(message.text || "");

  // Group vs DM detection: Chat SDK exposes thread.channel; we use the thread
  // id to recover the platform-specific chat id. For Telegram, threadId
  // looks like `telegram:<chatId>` (no third part for DMs). Group chats have
  // type-prefixed chatIds (negative numbers in TG).
  const channelId = String(thread.channel?.id || thread.id || "").split(":")[1] ?? "";
  // For Telegram, chatId === senderId in DMs; differs in groups/supergroups.
  const isGroup = channelId !== "" && channelId !== senderId;

  try {
    const reply = await routeMessage({
      // Map the SDK platform name onto router's ChannelId. Phase 1 only
      // wires Telegram, so anything else is reported as the platform name
      // (router treats unknown channels as blocked unless configured).
      channel: (platform === "telegram" ? "telegram" : platform) as any,
      userId,
      senderId,
      senderName,
      text,
      isGroup,
      groupId: isGroup ? channelId : undefined,
      isMentioned: isMention,
      messageId: String(message.id || ""),
    });

    // routeMessage returns "" for handled-by-plugin / silent paths,
    // and "[blocked] ..." / "[skipped] ..." for refusals — only forward
    // human-meaningful text.
    if (!reply) return;
    if (reply.startsWith("[skipped]") || reply.startsWith("[blocked]") || reply.startsWith("[pairing]")) {
      return;
    }

    await thread.post(reply);
  } catch (err) {
    logErr(`dispatch error (user=${userId} platform=${platform}):`, err);
    try {
      await thread.post("Sorry, I hit an error processing your message.");
    } catch {
      /* ignore */
    }
  }
}

/**
 * Boot-time: rebuild bots for every user that has at least one Chat-SDK
 * channel configured (e.g. Telegram with a stored botToken). Mirrors the
 * existing `autoStartTelegram` / `WaAuth.distinct` pattern.
 */
export async function autoStartChatSdkBots(): Promise<void> {
  const { connectDB } = await import("../db");
  const { Config } = await import("../models/config");
  await connectDB();

  // Find every user that has any Chat-SDK channel enabled with creds.
  const configs = await Config.find({
    $or: [
      {
        "channels.telegram.enabled": true,
        "channels.telegram.botToken": { $exists: true, $ne: null },
      },
      // Add other channel auto-start conditions here as we wire them up.
    ],
  })
    .select({ userId: 1 })
    .lean();

  for (const cfg of configs as Array<{ userId: unknown }>) {
    const uid = cfg.userId ? String(cfg.userId) : "";
    if (!uid) continue;
    try {
      await getBotForUser(uid);
      log("Auto-started bot for user:", uid);
    } catch (e) {
      logErr("Auto-start failed for user:", uid, e);
    }
  }
}

/** Public read-only view for status endpoints. */
export function getBotStatus(userId: string): {
  exists: boolean;
  adapters: SupportedPlatform[];
  createdAt: number | null;
} {
  const entry = registry.get(userId);
  if (!entry) return { exists: false, adapters: [], createdAt: null };
  return {
    exists: true,
    adapters: Array.from(entry.adapters),
    createdAt: entry.createdAt,
  };
}
