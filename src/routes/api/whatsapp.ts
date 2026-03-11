import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { loadConfig, saveConfig } from "#/server/lib/config";
import {
  startQrLogin,
  getLoginStatus,
  isWhatsAppConnected,
  sendWhatsAppMessage,
  disconnectWhatsApp,
  logoutWhatsApp,
} from "#/server/channels/whatsapp";

const log = (...args: unknown[]) => console.log("[api/whatsapp]", ...args);

export const Route = createFileRoute("/api/whatsapp")({
  server: {
    handlers: {
      // GET /api/whatsapp?action=status|login|onboarding
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const action = url.searchParams.get("action");
        const sessionId = url.searchParams.get("sessionId");
        log("GET action:", action, "sessionId:", sessionId, "userId:", userId);

        if (action === "status") {
          const config = await loadConfig(userId);
          const status = {
            connected: isWhatsAppConnected(),
            onboarded: config.channels?.whatsapp?.onboarded || false,
            phoneType: config.channels?.whatsapp?.phoneType || null,
            dmPolicy: config.channels?.whatsapp?.dmPolicy || "pairing",
          };
          log("Status response:", status);
          return Response.json(status);
        }

        if (action === "login" && sessionId) {
          const status = getLoginStatus(sessionId);
          return Response.json(status);
        }

        if (action === "onboarding") {
          const config = await loadConfig(userId);
          const wa = config.channels?.whatsapp || {};
          return Response.json({
            onboarded: wa.onboarded || false,
            phoneType: wa.phoneType || null,
            dmPolicy: wa.dmPolicy || "pairing",
            selfChatMode: wa.selfChatMode ?? true,
            allowFrom: wa.allowFrom || ["*"],
          });
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
      },

      // POST /api/whatsapp — login, send, disconnect, logout, onboarding
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();
        const { action } = body;

        if (action === "login") {
          log("POST login — starting QR login...");
          const result = await startQrLogin();
          log("QR login started:", { sessionId: result.sessionId, hasQr: !!result.qrDataUrl });
          return Response.json(result);
        }

        if (action === "send") {
          const { jid, text } = body;
          if (!jid || !text) {
            return Response.json(
              { error: "jid and text required" },
              { status: 400 }
            );
          }
          const result = await sendWhatsAppMessage(jid, text);
          return Response.json(result);
        }

        if (action === "disconnect") {
          await disconnectWhatsApp();
          return Response.json({ ok: true });
        }

        if (action === "logout") {
          await logoutWhatsApp();
          return Response.json({ ok: true });
        }

        // Onboarding: save phone type, DM policy, allowlist
        if (action === "onboarding") {
          const config = await loadConfig(userId);
          const { phoneType, dmPolicy, selfChatMode, allowFrom } = body;

          if (phoneType) config.channels.whatsapp.phoneType = phoneType;
          if (dmPolicy) config.channels.whatsapp.dmPolicy = dmPolicy;
          if (selfChatMode !== undefined) config.channels.whatsapp.selfChatMode = selfChatMode;
          if (allowFrom) config.channels.whatsapp.allowFrom = allowFrom;
          config.channels.whatsapp.onboarded = true;

          await saveConfig(config);
          return Response.json({ ok: true });
        }

        return Response.json(
          { error: "Unknown action" },
          { status: 400 }
        );
      },
    },
  },
});
