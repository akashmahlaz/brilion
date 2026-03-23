import { toolDefinition, generateSpeech } from "@tanstack/ai";
import { createOpenaiSpeech } from "@tanstack/ai-openai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";

/**
 * Create the text_to_speech tool — converts text to audio using TanStack AI's generateSpeech().
 * Returns base64-encoded audio that can be sent as a voice message on WhatsApp.
 */
export function createTTSTool(userId: string) {
  return toolDefinition({
    name: "text_to_speech",
    description:
      "Convert text to speech audio. Use when the user asks you to read something aloud, create a voice message, or generate audio from text.",
    inputSchema: z.object({
      text: z.string().describe("The text to convert to speech"),
      voice: z.string().optional().describe("Voice to use: alloy, echo, fable, onyx, nova, shimmer. Default: alloy"),
    }),
  }).server(async ({ text, voice }: { text: string; voice?: string }) => {
    let apiKey = await resolveProviderKey("openai", userId).catch(() => null);
    let baseUrl: string | undefined;

    if (!apiKey) {
      apiKey = await resolveProviderKey("github", userId).catch(() => null);
      baseUrl = "https://models.inference.ai.azure.com";
    }

    if (!apiKey) {
      return { error: "No API key configured for text-to-speech. Set an OpenAI API key." };
    }

    try {
      const adapter = createOpenaiSpeech("tts-1", apiKey, baseUrl ? { baseURL: baseUrl } : undefined);

      const result = await generateSpeech({
        adapter,
        text,
        voice: (voice || "alloy") as any,
        format: "opus",
      });

      return {
        audioBase64: result.audio,
        format: result.format || "opus",
        duration: result.duration,
        model: result.model,
      };
    } catch (e) {
      return { error: `Text-to-speech failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  });
}
