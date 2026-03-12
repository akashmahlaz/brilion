import { Bot } from "grammy";
import { routeMessage } from "../lib/router";
import { Config } from "../models/config";
import { loadConfig, saveConfig } from "../lib/config";
import { connectDB } from "../db";

const log = (...args: unknown[]) => console.log("[telegram]", ...args);

interface TelegramBotEntry {
  bot: Bot;
  isRunning: boolean;
  userId: string;
}

const userBots = new Map<string, TelegramBotEntry>();

async function initBotForUser(token: string, userId: string): Promise<{ ok: boolean; botInfo?: { username: string } }> {
  const existing = userBots.get(userId);
  if (existing?.isRunning) {
    await existing.bot.stop();
  }

  const bot = new Bot(token);

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const senderId = ctx.from.id.toString();
    const senderName =
      ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");

    try {
      const reply = await routeMessage({
        channel: "telegram",
        userId,
        senderId,
        senderName,
        text,
      });

      if (reply) {
        const chunks = splitMessage(reply, 4000);
        for (const chunk of chunks) {
          await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(async () => {
            await ctx.reply(chunk);
          });
        }
      }
    } catch (err) {
      log("Message handling error for user", userId, ":", err);
      await ctx.reply("Sorry, I encountered an error processing your message.").catch(() => {});
    }
  });

  const me = await bot.api.getMe();
  userBots.set(userId, { bot, isRunning: false, userId });
  return { ok: true, botInfo: { username: me.username } };
}

async function startPollingForUser(userId: string): Promise<void> {
  const entry = userBots.get(userId);
  if (!entry || entry.isRunning) return;

  entry.bot.start({
    onStart: () => {
      entry.isRunning = true;
      log("Bot started polling for user:", userId);
    },
  });
}

async function stopBotForUser(userId: string): Promise<void> {
  const entry = userBots.get(userId);
  if (entry?.isRunning) {
    await entry.bot.stop();
    entry.isRunning = false;
  }
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  userId?: string
): Promise<{ status: string; error?: string }> {
  // Find the bot for this user, or any bot as fallback
  const entry = userId ? userBots.get(userId) : userBots.values().next().value;
  if (!entry?.bot) return { status: "error", error: "Bot not initialized" };
  try {
    await entry.bot.api.sendMessage(chatId, text);
    return { status: "sent" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function isTelegramConnected(userId?: string): boolean {
  if (userId) return userBots.get(userId)?.isRunning ?? false;
  return Array.from(userBots.values()).some((e) => e.isRunning);
}

export function getTelegramBot(userId?: string): Bot | null {
  if (userId) return userBots.get(userId)?.bot ?? null;
  const first = userBots.values().next().value as TelegramBotEntry | undefined;
  return first?.bot ?? null;
}

/**
 * Auto-start Telegram bots for all users with stored tokens.
 */
export async function autoStartTelegram(): Promise<void> {
  try {
    await connectDB();
    const configs = await Config.find({
      "channels.telegram.enabled": true,
      "channels.telegram.botToken": { $exists: true, $ne: null },
    }).lean();

    for (const config of configs as any[]) {
      const userId = config.userId;
      const botToken = config.channels?.telegram?.botToken;
      if (!userId || !botToken) continue;

      try {
        await initBotForUser(botToken, userId);
        await startPollingForUser(userId);
        log("Auto-started bot for user:", userId);
      } catch (err) {
        log("Auto-start failed for user:", userId, err);
      }
    }
  } catch (err) {
    log("autoStartTelegram failed:", err);
  }
}

export async function connectTelegram(
  botToken: string,
  userId?: string
): Promise<{ ok: boolean; username?: string; error?: string }> {
  try {
    if (!userId) return { ok: false, error: "userId required" };
    const result = await initBotForUser(botToken, userId);

    await connectDB();
    const config = await loadConfig(userId);
    config.channels.telegram.botToken = botToken;
    config.channels.telegram.enabled = true;
    await saveConfig(config);

    await startPollingForUser(userId);
    return { ok: true, username: result.botInfo?.username };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function disconnectTelegram(userId?: string): Promise<void> {
  if (!userId) return;
  await stopBotForUser(userId);
  userBots.delete(userId);

  await connectDB();
  const config = await loadConfig(userId);
  config.channels.telegram.botToken = undefined;
  config.channels.telegram.enabled = false;
  await saveConfig(config);
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen / 2) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  return chunks;
}
