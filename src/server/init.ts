/**
 * Lazy server initialization — triggers on first API request.
 * Reconnects WhatsApp sessions and starts Telegram bots.
 */
import { connectDB } from "./db";
import { WaAuth } from "./models/wa-auth";

const log = (...args: unknown[]) => console.log("[init]", ...args);
const logErr = (...args: unknown[]) => console.error("[init]", ...args);

let _initialized = false;
let _initializing = false;

export async function ensureServerInit(): Promise<void> {
  if (_initialized || _initializing) return;
  _initializing = true;

  log("═══════════════════════════════════════════════");
  log("Brilion server initializing...");
  log("═══════════════════════════════════════════════");

  try {
    await connectDB();
    log("✅ Database connected");

    // Reconnect WhatsApp sessions from stored auth state
    const { reconnect } = await import("./lib/wa-manager");
    const distinctUserIds = await WaAuth.distinct("userId");
    log("Found", distinctUserIds.length, "users with WhatsApp auth state:", distinctUserIds);

    for (const userId of distinctUserIds) {
      if (!userId) continue;
      log("Reconnecting WhatsApp for userId:", userId.toString());
      reconnect(userId.toString()).catch((e: unknown) => {
        logErr("WhatsApp reconnect failed for", userId, ":", e);
      });
    }

    // Start Telegram bots
    try {
      const { autoStartTelegram } = await import("./channels/telegram");
      await autoStartTelegram();
      log("✅ Telegram auto-start complete");
    } catch (e) {
      logErr("Telegram auto-start failed:", e);
    }

    // Start cron scheduler for proactive messages
    try {
      const { startCronScheduler } = await import("./lib/cron-scheduler");
      startCronScheduler();
      log("✅ Cron scheduler started");
    } catch (e) {
      logErr("Cron scheduler failed to start:", e);
    }

    // Start BullMQ message queue workers (Redis-backed)
    try {
      const { startMessageQueue } = await import("./lib/message-queue");
      startMessageQueue();
      log("✅ Message queue started");
    } catch (e) {
      logErr("Message queue failed to start:", e);
    }

    _initialized = true;
    log("═══════════════════════════════════════════════");
    log("✅ Server initialization complete");
    log("═══════════════════════════════════════════════");
  } catch (e) {
    logErr("❌ Server initialization failed:", e);
    _initializing = false; // Allow retry on next request
  }
}

/** Alias for nitro plugin import */
export { ensureServerInit as initServer };
