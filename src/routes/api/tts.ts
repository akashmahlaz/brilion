import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "#/server/middleware";
import { resolveProviderKey } from "#/server/lib/auth-profiles";
import { generateSpeech } from "@tanstack/ai";
import { createOpenaiSpeech } from "@tanstack/ai-openai";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        const userId = (session.user as any).id;

        const { text, voice } = await request.json();
        if (!text || typeof text !== "string") {
          return Response.json({ error: "text is required" }, { status: 400 });
        }

        let apiKey = await resolveProviderKey("openai", userId).catch(() => null);
        let baseUrl: string | undefined;

        if (!apiKey) {
          apiKey = await resolveProviderKey("github", userId).catch(() => null);
          baseUrl = "https://models.inference.ai.azure.com";
        }

        if (!apiKey) {
          return Response.json({ error: "No TTS API key configured" }, { status: 422 });
        }

        try {
          const adapter = createOpenaiSpeech(
            "tts-1",
            apiKey,
            baseUrl ? { baseURL: baseUrl } : undefined
          );

          const result = await generateSpeech({
            adapter,
            text: text.slice(0, 4096),
            voice: (voice || "nova") as any,
            format: "opus",
          });

          return Response.json({
            audioBase64: result.audio,
            format: result.format || "opus",
            duration: result.duration,
          });
        } catch (e) {
          console.error("[tts] Failed:", e);
          return Response.json(
            { error: `TTS failed: ${e instanceof Error ? e.message : String(e)}` },
            { status: 500 }
          );
        }
      },
    },
  },
});
