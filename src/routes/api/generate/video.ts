import { createFileRoute } from "@tanstack/react-router";
import { generateVideo, toServerSentEventsResponse } from "@tanstack/ai";
import { openaiVideo } from "@tanstack/ai-openai";
import { requireAuth } from "#/server/middleware";
import { resolveProviderKey } from "#/server/lib/auth-profiles";

export const Route = createFileRoute("/api/generate/video")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        const userId = (session.user as any).id;

        const apiKey = await resolveProviderKey("openai", userId);
        if (!apiKey) {
          return Response.json(
            { error: "OpenAI API key required for video generation" },
            { status: 400 }
          );
        }

        const body = await request.json();
        const { prompt, size, duration, model } = body;

        if (!prompt || typeof prompt !== "string") {
          return Response.json(
            { error: "prompt is required" },
            { status: 400 }
          );
        }

        const stream = generateVideo({
          adapter: openaiVideo(model ?? "sora-2"),
          prompt,
          size: size ?? "1280x720",
          duration: duration ?? 8,
          stream: true,
          pollingInterval: 3000,
          maxDuration: 600_000,
        });

        return toServerSentEventsResponse(stream);
      },
    },
  },
});
