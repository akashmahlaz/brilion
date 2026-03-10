import { Bot } from "grammy";
import { routeMessage } from "../lib/router";
import { loadConfig, saveConfig } from "../lib/config";
import { connectDB } from "../db";

let bot: Bot | null = null;
let isRunning = false;

/**
 * Initialize the Telegram bot with a bot token.
 * Does NOT start polling — call startPolling() separately.
 */
export async function initTelegramBot(token: string): Promise<{ ok: boolean; botInfo?: { username: string } }> {
  try {
    bot = new Bot(token);

    // Set up message handler — routes to AI agent
    bot.on("message:text", async (ctx) => {
      const text = ctx.message.text;
      const senderId = ctx.from.id.toString();
      const senderName =
        ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");

      try {
        const reply = await routeMessage({
          channel: "telegram",
          senderId,
          senderName,
          text,
        });

        // Send the AI's reply back through Telegram
        if (reply) {
          // Split long messages (Telegram has 4096 char limit)
          const chunks = splitMessage(reply, 4000);
          for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(async () => {
              // Fallback to plain text if Markdown fails
              await ctx.reply(chunk);
            });
          }
        }
      } catch (err) {
        console.error("[telegram] Message handling error:", err);
        await ctx.reply("Sorry, I encountered an error processing your message.").catch(() => {});
      }
    });

    // Get bot info to verify token works
    const me = await bot.api.getMe();
    return { ok: true, botInfo: { username: me.username } };
  } catch (err) {
    bot = null;
    throw new Error(
      `Failed to init Telegram bot: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Start long-polling for messages.
 */
export async function startPolling(): Promise<void> {
  if (!bot) throw new Error("Bot not initialized. Call initTelegramBot first.");
  if (isRunning) return;

  bot.start({
    onStart: () => {
      isRunning = true;
      console.log("[telegram] Bot started polling");
    },
  });
}

/**
 * Stop the bot.
 */
export async function stopBot(): Promise<void> {
  if (bot && isRunning) {
    await bot.stop();
    isRunning = false;
    console.log("[telegram] Bot stopped");
  }
}

/**
 * Send a message to a Telegram chat.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string
): Promise<{ status: string; error?: string }> {
  if (!bot) return { status: "error", error: "Bot not initialized" };
  try {
    await bot.api.sendMessage(chatId, text);
    return { status: "sent" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function isTelegramConnected(): boolean {
  return isRunning;
}

export function getTelegramBot(): Bot | null {
  return bot;
}

/**
 * Auto-start Telegram bot if token is stored in config.
 * Call this at server startup.
 */
export async function autoStartTelegram(): Promise<void> {
  try {
    await connectDB();
    const config = await loadConfig();
    const botToken = config.channels?.telegram?.botToken;
    if (!botToken || !config.channels?.telegram?.enabled) return;

    await initTelegramBot(botToken);
    await startPolling();
  } catch (err) {
    console.error("[telegram] Auto-start failed:", err);
  }
}

/**
 * Save bot token to config and start the bot.
 */
export async function connectTelegram(
  botToken: string
): Promise<{ ok: boolean; username?: string; error?: string }> {
  try {
    const result = await initTelegramBot(botToken);

    // Save token to config
    await connectDB();
    const config = await loadConfig();
    config.channels.telegram.botToken = botToken;
    config.channels.telegram.enabled = true;
    await saveConfig(config);

    await startPolling();
    return { ok: true, username: result.botInfo?.username };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Disconnect Telegram bot and clear token.
 */
export async function disconnectTelegram(): Promise<void> {
  await stopBot();
  bot = null;

  await connectDB();
  const config = await loadConfig();
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
    // Try to split at newline
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen / 2) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  return chunks;
}
