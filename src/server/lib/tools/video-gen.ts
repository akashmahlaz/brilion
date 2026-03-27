import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";
import { uploadVideoUrlToCloudinary } from "../cloudinary";
import OpenAI from "openai";

/**
 * Video generation tool — uses OpenAI Sora-2 via direct API.
 * Supports text-to-video and image-to-video (via input_reference).
 * Async job-based: creates job, polls for completion, uploads to Cloudinary CDN.
 */
export function createVideoGenTool(userId: string) {
  return toolDefinition({
    name: "generate_video",
    description:
      "Generate a video from a text prompt using AI (OpenAI Sora). " +
      "Optionally provide an image URL to animate (image-to-video). " +
      "Returns a URL to the generated video. Generation takes 1-5 minutes.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe("Detailed description of the video to generate"),
      image_url: z
        .string()
        .optional()
        .describe(
          "Optional URL of an image to animate into a video (image-to-video). Must be a valid HTTP/HTTPS URL. If omitted, generates from text only."
        ),
      size: z
        .string()
        .optional()
        .describe(
          "Video resolution: 1280x720 (landscape), 720x1280 (portrait), 1792x1024 (wide)"
        ),
      duration: z
        .number()
        .optional()
        .describe("Video duration in seconds: 4, 8 (default), or 12"),
    }),
  }).server(
    async ({
      prompt,
      image_url,
      size,
      duration,
    }: {
      prompt: string;
      image_url?: string;
      size?: string;
      duration?: number;
    }) => {
      const apiKey = await resolveProviderKey("openai", userId);
      if (!apiKey) {
        return { error: "OpenAI API key required for video generation" };
      }

      try {
        const client = new OpenAI({ apiKey });

        // Build params
        const params: OpenAI.Videos.VideoCreateParams = {
          model: "sora-2",
          prompt,
          size: (size as any) ?? "1280x720",
          seconds: (duration ?? 8) as 4 | 8 | 12,
        };

        // Image-to-video: fetch image and pass as input_reference
        if (image_url) {
          const imgRes = await fetch(image_url);
          if (!imgRes.ok) {
            return { error: `Failed to fetch image: ${imgRes.status} ${imgRes.statusText}` };
          }
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const ext = image_url.split(".").pop()?.split("?")[0] || "png";
          const file = new File([imgBuffer], `input.${ext}`, {
            type: imgRes.headers.get("content-type") || `image/${ext}`,
          });
          (params as any).input_reference = file;
        }

        // Create the job
        const job = await client.videos.create(params);
        const jobId = job.id;

        // Poll until complete (max 10 minutes)
        const maxWait = 600_000;
        const startTime = Date.now();
        let status = await client.videos.retrieve(jobId);

        while (
          status.status !== "completed" &&
          status.status !== "failed" &&
          Date.now() - startTime < maxWait
        ) {
          await new Promise((r) => setTimeout(r, 5000));
          status = await client.videos.retrieve(jobId);
        }

        if (status.status === "failed") {
          return {
            error: `Video generation failed: ${(status as any).error || "Unknown error"}`,
          };
        }

        if (status.status === "completed" && (status as any).url) {
          // Upload to Cloudinary CDN — Sora URLs expire, Cloudinary is permanent
          try {
            const uploaded = await uploadVideoUrlToCloudinary(
              (status as any).url,
              { folder: `brilion/${userId}/videos`, tags: ["generated", "sora-2"] }
            );
            console.log("[video-gen] Uploaded to Cloudinary:", { url: uploaded.url, bytes: uploaded.bytes });
            return {
              status: "completed",
              videoUrl: uploaded.url,
              jobId,
              prompt,
            };
          } catch (uploadErr) {
            // Fallback to Sora URL if Cloudinary upload fails
            console.error("[video-gen] Cloudinary upload failed, using Sora URL:", uploadErr);
            return {
              status: "completed",
              videoUrl: (status as any).url,
              jobId,
              prompt,
              note: "CDN upload failed — this URL may expire. Download promptly.",
            };
          }
        }

        return {
          status: "timeout",
          jobId,
          note: "Video generation is still in progress. Check back later.",
        };
      } catch (e) {
        return {
          error: `Video generation error: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }
  );
}
