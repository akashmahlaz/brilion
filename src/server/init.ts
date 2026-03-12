import { connectDB } from "./db";
import { WaAuth } from "./models/wa-auth";
import { reconnect } from "./lib/wa-manager";
import { autoStartTelegram } from "./channels/telegram";

const log = (...args: unknown[]) => console.log("[init]", ...args);
const logErr = (...args: unknown[]) => console.error("[init]", ...args);

/**
 * Server startup initialization:
 * - Reconnect existing WhatsApp sessions from stored auth state
 * - Start Telegram bots for users with stored tokens
 */
export async function initServer(): Promise<void> {
  log("Brilion server initializing...");
  await connectDB();

  // Reconnect WhatsApp sessions
  try {
    const distinctUserIds = await WaAuth.distinct("userId");
    log("Found", distinctUserIds.length, "users with WhatsApp auth state");
    for (const userId of distinctUserIds) {
      if (!userId) continue;
      reconnect(userId.toString()).catch((e) => {
        logErr("WhatsApp reconnect failed for", userId, ":", e);
      });
    }
  } catch (e) {
    logErr("WhatsApp reconnect scan failed:", e);
  }

  // Start Telegram bots
  try {
    await autoStartTelegram();
  } catch (e) {
    logErr("Telegram auto-start failed:", e);
  }

  log("Server initialization complete");
}
