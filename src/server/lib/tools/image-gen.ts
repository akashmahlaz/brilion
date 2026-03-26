import { toolDefinition } from "@tanstack/ai";
import OpenAI from "openai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const UPLOAD_DIR = path.resolve("uploads");

/**
 * Create the generate_image tool — lets the AI generate images from text prompts.
 * Uses OpenAI client directly (the TanStack AI image adapter has a bug that sends
 * `stream: false` which DALL-E rejects).
 *
 * Returns a URL to the saved image instead of base64 to avoid blowing the context window.
 */
export function createImageGenTool(userId: string) {
  return toolDefinition({
    name: "generate_image",
    description:
      "Generate an image from a text prompt using DALL-E. Returns a URL to the generated image. Use when the user asks you to create, draw, or generate an image.",
    inputSchema: z.object({
      prompt: z.string().describe("Detailed description of the image to generate"),
      size: z.string().optional().describe("Image size: 1024x1024, 1792x1024, or 1024x1792. Default: 1024x1024"),
    }),
  }).server(async ({ prompt, size }: { prompt: string; size?: string }) => {
    console.log("[image-gen] Starting image generation:", { prompt: prompt.slice(0, 100), size });
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
      console.log("[image-gen] Calling DALL-E 3 via OpenAI client...");
      const client = new OpenAI({ apiKey, baseURL: baseUrl });

      const response = await client.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: (size || "1024x1024") as "1024x1024" | "1792x1024" | "1024x1792",
        response_format: "b64_json",
      });

      const image = response.data[0];
      if (!image) {
        console.error("[image-gen] No image returned from API");
        return { error: "No image generated" };
      }

      // Save to disk instead of returning massive base64 blob (avoids blowing context window)
      const userDir = path.join(UPLOAD_DIR, userId);
      await fs.mkdir(userDir, { recursive: true });
      const id = crypto.randomBytes(8).toString("hex");
      const filename = `gen-${id}.png`;
      const filePath = path.join(userDir, filename);

      if (image.b64_json) {
        await fs.writeFile(filePath, Buffer.from(image.b64_json, "base64"));
      }

      const imageUrl = `/api/upload?file=${encodeURIComponent(userId + "/" + filename)}`;
      console.log("[image-gen] Image saved to disk:", { imageUrl, revisedPrompt: !!image.revised_prompt });

      return {
        imageUrl,
        revisedPrompt: image.revised_prompt || prompt,
        model: "dall-e-3",
      };
    } catch (e) {
      console.error("[image-gen] Generation failed:", e);
      return { error: `Image generation failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  });
}
