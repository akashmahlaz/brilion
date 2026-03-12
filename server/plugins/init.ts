import { defineNitroPlugin } from "nitro/runtime";

/**
 * Nitro server plugin — runs once on server startup.
 * Reconnects WhatsApp sessions and starts Telegram bots.
 */
export default defineNitroPlugin(() => {
  console.log("[nitro-plugin] Server starting, initializing Brilion...");

  // Non-blocking init — don't delay server startup
  (async () => {
    try {
      const { initServer } = await import("../../src/server/init");
      await initServer();
    } catch (e) {
      console.error("[nitro-plugin] initServer failed:", e);
    }
  })();
});
