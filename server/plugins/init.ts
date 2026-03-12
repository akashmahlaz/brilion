/**
 * Nitro server plugin — runs once on server startup.
 * Reconnects WhatsApp sessions and starts Telegram bots.
 */
export default defineNitroPlugin((nitroApp) => {
  // Run after the server is ready (non-blocking)
  nitroApp.hooks.hook("request", async () => {});

  // Use a self-executing async init on first load
  (async () => {
    try {
      const { initServer } = await import("../../src/server/init");
      await initServer();
    } catch (e) {
      console.error("[nitro-plugin] initServer failed:", e);
    }
  })();
});
