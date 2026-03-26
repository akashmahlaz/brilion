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
  "dall-e-3": {
    provider: "openai",
    description: "Best for artistic, creative images and illustrations",
    sizes: ["1024x1024", "1792x1024", "1024x1792"],
    supportsRevision: true,
  },
  "gpt-image-1": {
    provider: "openai",
    description: "Best for accurate, instruction-following images with text rendering",
    sizes: ["1024x1024", "1536x1024", "1024x1536", "auto"],
    supportsRevision: false,
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
      `Generate an image from a text prompt. Returns a CDN URL. Available models: ${modelList}. Choose the model based on the task — dall-e-3 for art/creativity, gpt-image-1 for accuracy/text.`,
    inputSchema: z.object({
      prompt: z.string().describe("Detailed description of the image to generate"),
      model: z.enum(["dall-e-3", "gpt-image-1"]).optional().describe("Image model to use. Default: dall-e-3 for creative, gpt-image-1 for accurate/text-heavy"),
      size: z.string().optional().describe("Image size. dall-e-3: 1024x1024, 1792x1024, 1024x1792. gpt-image-1: 1024x1024, 1536x1024, 1024x1536, auto. Default: 1024x1024"),
    }),
  }).server(async ({ prompt, model, size }: { prompt: string; model?: ImageModelId; size?: string }) => {
    const selectedModel = model || "dall-e-3";
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

      const response = await client.images.generate({
        model: selectedModel,
        prompt,
        n: 1,
        size: validSize as any,
        response_format: "b64_json",
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
