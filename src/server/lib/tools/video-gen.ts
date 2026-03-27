import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";
import { uploadToCloudinary, uploadVideoUrlToCloudinary } from "../cloudinary";
import OpenAI from "openai";
import path from "node:path";
import fs from "node:fs/promises";

const UPLOAD_DIR = path.resolve("uploads");

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

async function resolveImageBufferFromInput(imageUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (imageUrl.startsWith("data:")) {
    const parsed = parseDataUrl(imageUrl);
    if (!parsed) throw new Error("Invalid data URL for image input");
    return { buffer: Buffer.from(parsed.base64, "base64"), mimeType: parsed.mimeType || "image/png" };
  }

  if (imageUrl.startsWith("/api/upload?")) {
    const parsed = new URL(imageUrl, "http://localhost");
    const filePart = parsed.searchParams.get("file");
    if (!filePart) throw new Error("Missing upload file parameter");

    const safePath = path.normalize(filePart).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(UPLOAD_DIR, safePath);
    if (!filePath.startsWith(UPLOAD_DIR)) throw new Error("Invalid upload path");

    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    return { buffer, mimeType: mimeMap[ext] || "image/png" };
  }

  if (!imageUrl.startsWith("http")) {
    throw new Error("image_url must be an http(s), data URL, or /api/upload URL");
  }

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to fetch image: ${imgRes.status} ${imgRes.statusText}`);
  }
  const mimeType = imgRes.headers.get("content-type") || "image/png";
  return { buffer: Buffer.from(await imgRes.arrayBuffer()), mimeType };
}

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
      imageUrl: z
        .string()
        .optional()
        .describe("Alias of image_url for compatibility"),
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
      imageUrl,
      size,
      duration,
    }: {
      prompt: string;
      image_url?: string;
      imageUrl?: string;
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

        let sourceImageUrl: string | undefined;
        let normalizedInputImageUrl: string | undefined;
        let inputReferenceFile: File | undefined;

        // Image-to-video: normalize any image input to a public CDN URL, then pass as input_reference
        const inputImageRef = image_url || imageUrl;
        if (inputImageRef) {
          sourceImageUrl = inputImageRef;
          const { buffer: imgBuffer, mimeType } = await resolveImageBufferFromInput(inputImageRef);

          const uploadedInput = await uploadToCloudinary(imgBuffer, mimeType, {
            folder: `brilion/${userId}/video-inputs`,
            resourceType: "image",
            tags: ["video-input", "sora-2"],
          });
          normalizedInputImageUrl = uploadedInput.url;

          const ext = mimeType.includes("jpeg")
            ? "jpg"
            : mimeType.includes("webp")
              ? "webp"
              : mimeType.includes("gif")
                ? "gif"
                : "png";

          inputReferenceFile = new File([imgBuffer], `input.${ext}`, {
            type: mimeType || `image/${ext}`,
          });
          (params as any).input_reference = normalizedInputImageUrl;
        }

        // Create the job - first try CDN public URL input, fallback to file input if needed.
        let job;
        try {
          job = await client.videos.create(params);
        } catch (primaryErr) {
          if (normalizedInputImageUrl && inputReferenceFile) {
            console.warn("[video-gen] URL input_reference failed, retrying with file input:", primaryErr);
            (params as any).input_reference = inputReferenceFile;
            job = await client.videos.create(params);
          } else {
            throw primaryErr;
          }
        }
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
              outputType: "media",
              mediaType: "video",
              status: "completed",
              asset: {
                url: uploaded.url,
                mimeType: "video/mp4",
                provider: "cloudinary",
                public: true,
                bytes: uploaded.bytes,
                duration: uploaded.duration,
              },
              videoUrl: uploaded.url,
              jobId,
              prompt,
              sourceImageUrl,
              inputImageUrl: normalizedInputImageUrl,
            };
          } catch (uploadErr) {
            // Fallback to Sora URL if Cloudinary upload fails
            console.error("[video-gen] Cloudinary upload failed, using Sora URL:", uploadErr);
            return {
              outputType: "media",
              mediaType: "video",
              status: "completed",
              asset: {
                url: (status as any).url,
                mimeType: "video/mp4",
                provider: "sora",
                public: true,
              },
              videoUrl: (status as any).url,
              jobId,
              prompt,
              note: "CDN upload failed — this URL may expire. Download promptly.",
              sourceImageUrl,
              inputImageUrl: normalizedInputImageUrl,
            };
          }
        }

        return {
          outputType: "media",
          mediaType: "video",
          status: "timeout",
          jobId,
          note: "Video generation is still in progress. Check back later.",
          sourceImageUrl,
          inputImageUrl: normalizedInputImageUrl,
        };
      } catch (e) {
        return {
          error: `Video generation error: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }
  );
}
