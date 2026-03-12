import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "#/server/middleware";
import {
  connectTelegram,
  disconnectTelegram,
  isTelegramConnected,
  getTelegramBot,
} from "#/server/channels/telegram";

export const Route = createFileRoute("/api/telegram")({
  server: {
    handlers: {
      // GET /api/telegram?action=status
      GET: async ({ request }) => {
        await requireAuth(request);

        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        if (action === "status") {
          const bot = getTelegramBot();
          return Response.json({
            connected: isTelegramConnected(),
            username: bot ? (bot as any).botInfo?.username : null,
          });
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
      },

      // POST /api/telegram — connect, disconnect
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        const userId = (session.user as any).id;

        const body = await request.json();
        const { action } = body;

        if (action === "connect") {
          const { botToken } = body;
          if (!botToken) {
            return Response.json(
              { error: "botToken required" },
              { status: 400 }
            );
          }
          const result = await connectTelegram(botToken, userId);
          return Response.json(result);
        }

        if (action === "disconnect") {
          await disconnectTelegram(userId);
          return Response.json({ ok: true });
        }

        return Response.json({ error: "Unknown action" }, { status: 400 });
      },
    },
  },
});
