/**
 * Telegram channel — backed by the Vercel Chat SDK (`@chat-adapter/telegram`).
 *
 * This file preserves the public API of the previous grammY-based
 * implementation so call sites (`api/telegram.ts`, `init.ts`, plugins) keep
 * working unchanged. Internally everything is delegated to `bot-registry`,
 * which builds one `Chat` instance per Brilion user with all of the user's
 * configured channel adapters.
 */
import { TelegramAdapter } from "@chat-adapter/telegram";
import { connectDB } from "../db";
import { loadConfig, saveConfig } from "../lib/config";
import {
  autoStartChatSdkBots,
  getBotForUser,
  invalidateBot,
  getBotStatus,
} from "../lib/bot-registry";

const log = (...args: unknown[]) => console.log("[telegram]", ...args);

export async function connectTelegram(
  botToken: string,
  userId?: string
): Promise<{ ok: boolean; username?: string; error?: string }> {
  if (!userId) return { ok: false, error: "userId required" };
  if (!botToken || typeof botToken !== "string") {
    return { ok: false, error: "botToken required" };
  }

  try {
    // Probe the token via Telegram's getMe before we persist anything.
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meJson: any = await meRes.json().catch(() => ({}));
    if (!meRes.ok || !meJson?.ok) {
      const desc = meJson?.description || `HTTP ${meRes.status}`;
      return { ok: false, error: `Invalid bot token: ${desc}` };
    }
    const username: string | undefined = meJson?.result?.username;

    await connectDB();
    const config = await loadConfig(userId);
    config.channels.telegram.botToken = botToken;
    config.channels.telegram.enabled = true;
    if (username) config.channels.telegram.botUsername = username;
    await saveConfig(config);

    // Drop any stale bot, then build a fresh Chat instance with the new token.
    await invalidateBot(userId);
    await getBotForUser(userId);

    return { ok: true, username };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function disconnectTelegram(userId?: string): Promise<void> {
  if (!userId) return;
  await invalidateBot(userId);

  await connectDB();
  const config = await loadConfig(userId);
  config.channels.telegram.botToken = undefined;
  config.channels.telegram.enabled = false;
  await saveConfig(config);
}

export function isTelegramConnected(userId?: string): boolean {
  if (!userId) return false;
  const status = getBotStatus(userId);
  return status.exists && status.adapters.includes("telegram");
}

/**
 * Backwards-compat shim. The legacy code returned a grammY `Bot` whose only
 * consumer property was `botInfo.username`. We return a status-only object
 * with the same shape so existing route code keeps compiling.
 */
export function getTelegramBot(
  userId?: string
): { botInfo: { username: string | undefined } } | null {
  if (!userId) return null;
  const status = getBotStatus(userId);
  if (!status.exists) return null;
  // Username lives on the adapter once built — callers that need it should
  // hit `/api/telegram?action=status` which already round-trips through this
  // shim plus a future enhancement to surface adapter.userName.
  return { botInfo: { username: undefined } };
}

/**
 * Send a one-off message via Telegram. Used by plugins / cron / debug surfaces
 * that already know the chat id.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  userId?: string
): Promise<{ status: string; error?: string }> {
  if (!userId) return { status: "error", error: "userId required" };
  try {
    const entry = await getBotForUser(userId);
    if (!entry || !entry.adapters.has("telegram")) {
      return { status: "error", error: "Telegram not connected" };
    }
    const adapter = entry.chat.getAdapter("telegram") as TelegramAdapter;
    // Chat SDK's threadId for Telegram is `telegram:<chatId>`.
    const threadId = `telegram:${chatId}`;
    // AdapterPostableMessage accepts a plain string for the simple text case.
    await adapter.postMessage(threadId, text);
    return { status: "sent" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Boot every user that has Telegram (or any other Chat-SDK channel) configured.
 */
export async function autoStartTelegram(): Promise<void> {
  try {
    await autoStartChatSdkBots();
    log("autoStartTelegram() complete");
  } catch (err) {
    log("autoStartTelegram failed:", err);
  }
}
