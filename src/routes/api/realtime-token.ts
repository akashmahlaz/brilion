import { createFileRoute } from "@tanstack/react-router";
import { realtimeToken } from "@tanstack/ai";
import { openaiRealtimeToken } from "@tanstack/ai-openai";
import { requireAuth } from "#/server/middleware";
import { resolveProviderKey } from "#/server/lib/auth-profiles";

export const Route = createFileRoute("/api/realtime-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        const userId = (session.user as any).id;

        const apiKey = await resolveProviderKey("openai", userId);
        if (!apiKey) {
          return Response.json(
            { error: "OpenAI API key required for realtime voice chat" },
            { status: 400 }
          );
        }

        const token = await realtimeToken({
          adapter: openaiRealtimeToken({
            model: "gpt-4o-realtime-preview",
          }),
        });

        return Response.json(token);
      },
    },
  },
});
