import { toolDefinition } from "@tanstack/ai";
import OpenAI from "openai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";
import { uploadToCloudinary } from "../cloudinary";

/**
 * Image model catalog — provider-agnostic.
 * Add new models here to make them available to the AI.
 */
const IMAGE_MODELS = {
  "gpt-image-1": {
    provider: "openai",
    description: "ChatGPT's image model — best for accurate, instruction-following images with text rendering",
    sizes: ["1024x1024", "1536x1024", "1024x1536", "auto"],
    supportsRevision: false,
  },
  "dall-e-3": {
    provider: "openai",
    description: "Best for artistic, creative images and illustrations",
    sizes: ["1024x1024", "1792x1024", "1024x1792"],
    supportsRevision: true,
  },
} as const;

type ImageModelId = keyof typeof IMAGE_MODELS;

/**
 * Create the generate_image tool — multi-model, provider-agnostic image generation.
 * The AI can pick the best model for the task. Uploads to Cloudinary CDN.
 */
export function createImageGenTool(userId: string) {
  const modelList = Object.entries(IMAGE_MODELS)
    .map(([id, m]) => `${id}: ${m.description}`)
    .join("; ");

  return toolDefinition({
    name: "generate_image",
    description:
      `Generate an image from a text prompt. Returns a CDN URL. Available models: ${modelList}. Default: gpt-image-1 (ChatGPT's model, best for most use cases). Use dall-e-3 only for artistic/creative styles.`,
    inputSchema: z.object({
      prompt: z.string().describe("Detailed description of the image to generate"),
      model: z.enum(["gpt-image-1", "dall-e-3"]).optional().describe("Image model. Default: gpt-image-1 (ChatGPT model). dall-e-3 for artistic/creative"),
      size: z.string().optional().describe("Image size. gpt-image-1: 1024x1024, 1536x1024, 1024x1536, auto. dall-e-3: 1024x1024, 1792x1024, 1024x1792. Default: 1024x1024"),
      quality: z.enum(["high", "medium", "low"]).optional().describe("Image quality (gpt-image-1 only). Default: high"),
    }),
  }).server(async ({ prompt, model, size, quality }: { prompt: string; model?: ImageModelId; size?: string; quality?: 'high' | 'medium' | 'low' }) => {
    const selectedModel = model || "gpt-image-1";
    const modelInfo = IMAGE_MODELS[selectedModel];
    console.log("[image-gen] Starting:", { model: selectedModel, prompt: prompt.slice(0, 100), size });

    let apiKey = await resolveProviderKey("openai", userId).catch(() => null);
    let baseUrl: string | undefined;

    if (!apiKey) {
      apiKey = await resolveProviderKey("github", userId).catch(() => null);
      baseUrl = "https://models.inference.ai.azure.com";
      if (apiKey) console.log("[image-gen] Using GitHub Models fallback");
    }

    if (!apiKey) {
      console.error("[image-gen] No API key found for openai or github");
      return { error: "No API key configured for image generation. Set an OpenAI or GitHub API key in Settings." };
    }

    try {
      const client = new OpenAI({ apiKey, baseURL: baseUrl });

      const validSize = size && modelInfo.sizes.includes(size as any) ? size : "1024x1024";

      // gpt-image-1 uses output_format (always returns b64), dall-e-3 uses response_format
      const response = await client.images.generate({
        model: selectedModel,
        prompt,
        n: 1,
        size: validSize as any,
        ...(selectedModel === "gpt-image-1"
          ? { output_format: "png" as const, ...(quality ? { quality } : {}) }
          : { response_format: "b64_json" as const }),
      });

      const image = response.data[0];
      if (!image || !image.b64_json) {
        console.error("[image-gen] No image returned from API");
        return { error: "No image generated" };
      }

      // Upload to Cloudinary CDN
      const uploaded = await uploadToCloudinary(
        Buffer.from(image.b64_json, "base64"),
        "image/png",
        { folder: `brilion/${userId}/images`, tags: ["generated", selectedModel] }
      );

      console.log("[image-gen] Uploaded to Cloudinary:", { url: uploaded.url, model: selectedModel, bytes: uploaded.bytes });

      return {
        outputType: "media",
        mediaType: "image",
        status: "completed",
        asset: {
          url: uploaded.url,
          mimeType: "image/png",
          provider: "cloudinary",
          public: true,
          bytes: uploaded.bytes,
        },
        imageUrl: uploaded.url,
        revisedPrompt: modelInfo.supportsRevision ? (image.revised_prompt || prompt) : prompt,
        model: selectedModel,
      };
    } catch (e) {
      console.error("[image-gen] Generation failed:", e);
      return { error: `Image generation failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  });
}
