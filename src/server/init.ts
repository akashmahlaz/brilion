/**
 * Lazy server initialization — triggers on first API request.
 * Reconnects WhatsApp sessions and starts Telegram bots.
 */
import { connectDB } from "./db";
import { WaAuth } from "./models/wa-auth";

const log = (...args: unknown[]) => console.log("[init]", ...args);
const logErr = (...args: unknown[]) => console.error("[init]", ...args);

let _initialized = false;

export async function ensureServerInit(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  log("Brilion server initializing...");

  try {
    await connectDB();

    // Reconnect WhatsApp sessions from stored auth state
    const { reconnect } = await import("./lib/wa-manager");
    const distinctUserIds = await WaAuth.distinct("userId");
    log("Found", distinctUserIds.length, "users with WhatsApp auth state");
    for (const userId of distinctUserIds) {
      if (!userId) continue;
      reconnect(userId.toString()).catch((e: unknown) => {
        logErr("WhatsApp reconnect failed for", userId, ":", e);
      });
    }

    // Start Telegram bots
    const { autoStartTelegram } = await import("./channels/telegram");
    await autoStartTelegram();

    log("Server initialization complete");
  } catch (e) {
    logErr("Server initialization failed:", e);
    _initialized = false; // Allow retry on next request
  }
}
