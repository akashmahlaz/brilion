import { toolDefinition, generateImage } from "@tanstack/ai";
import { createOpenaiImage } from "@tanstack/ai-openai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";

/**
 * Create the generate_image tool — lets the AI generate images from text prompts
 * using DALL-E via TanStack AI's generateImage().
 */
export function createImageGenTool(userId: string) {
  return toolDefinition({
    name: "generate_image",
    description:
      "Generate an image from a text prompt using DALL-E. Returns a base64-encoded image. Use when the user asks you to create, draw, or generate an image.",
    inputSchema: z.object({
      prompt: z.string().describe("Detailed description of the image to generate"),
      size: z.string().optional().describe("Image size: 1024x1024, 1792x1024, or 1024x1792. Default: 1024x1024"),
    }),
  }).server(async ({ prompt, size }: { prompt: string; size?: string }) => {
    let apiKey = await resolveProviderKey("openai", userId).catch(() => null);
    let baseUrl: string | undefined;

    if (!apiKey) {
      apiKey = await resolveProviderKey("github", userId).catch(() => null);
      baseUrl = "https://models.inference.ai.azure.com";
    }

    if (!apiKey) {
      return { error: "No API key configured for image generation. Set an OpenAI API key." };
    }

    try {
      const adapter = createOpenaiImage("dall-e-3", apiKey, baseUrl ? { baseURL: baseUrl } : undefined);

      const result = await generateImage({
        adapter,
        prompt,
        size: (size || "1024x1024") as any,
        numberOfImages: 1,
      });

      const image = result.images[0];
      if (!image) return { error: "No image generated" };

      return {
        imageBase64: image.b64Json || null,
        imageUrl: image.url || null,
        revisedPrompt: image.revisedPrompt || prompt,
        model: result.model,
      };
    } catch (e) {
      return { error: `Image generation failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  });
}
