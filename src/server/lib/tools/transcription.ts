import { generateTranscription } from "@tanstack/ai";
import { createOpenaiTranscription } from "@tanstack/ai-openai";
import { resolveProviderKey } from "../auth-profiles";

/**
 * Transcribe audio (base64) to text using TanStack AI's generateTranscription.
 * Uses OpenAI's Whisper model via the user's configured API key.
 */
export async function transcribeAudio(
  userId: string,
  audioBase64: string,
  mimeType: string = "audio/ogg"
): Promise<string | null> {
  // Try to resolve an OpenAI-compatible key (OpenAI > GitHub Models)
  let apiKey = await resolveProviderKey("openai", userId).catch(() => null);
  let baseUrl: string | undefined;

  if (!apiKey) {
    // Fallback to GitHub Models (supports whisper-1 on Azure endpoint)
    apiKey = await resolveProviderKey("github", userId).catch(() => null);
    baseUrl = "https://models.inference.ai.azure.com";
  }

  if (!apiKey) {
    console.log("[transcription] No API key available for transcription");
    return null;
  }

  try {
    // Convert base64 to Buffer then to Blob for the API
    const buffer = Buffer.from(audioBase64, "base64");
    // Map mime to file extension for proper content-type
    const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : "ogg";
    const blob = new Blob([buffer], { type: mimeType });
    // Create a File object with proper name for the API
    const file = new File([blob], `audio.${ext}`, { type: mimeType });

    const adapter = createOpenaiTranscription("whisper-1", apiKey, baseUrl ? { baseURL: baseUrl } : undefined);

    const result = await generateTranscription({
      adapter,
      audio: file,
    });

    if (result.text && result.text.trim().length > 0) {
      console.log(`[transcription] Transcribed ${result.duration || "?"}s audio: "${result.text.slice(0, 100)}..."`);
      return result.text.trim();
    }

    return null;
  } catch (e) {
    console.error("[transcription] Failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
