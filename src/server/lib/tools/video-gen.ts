import { generateVideo, getVideoJobStatus } from "@tanstack/ai";
import { createOpenaiVideo } from "@tanstack/ai-openai";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";

/**
 * Video generation tool — uses OpenAI Sora-2 via TanStack AI.
 * Async job-based: creates job, polls for completion, returns URL.
 */
export function createVideoGenTool(userId: string) {
  return toolDefinition({
    name: "generate_video",
    description:
      "Generate a video from a text prompt using AI (OpenAI Sora). " +
      "Returns a URL to the generated video. Generation takes 1-5 minutes.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe("Detailed description of the video to generate"),
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
      size,
      duration,
    }: {
      prompt: string;
      size?: string;
      duration?: number;
    }) => {
      const apiKey = await resolveProviderKey("openai", userId);
      if (!apiKey) {
        return { error: "OpenAI API key required for video generation" };
      }

      try {
        const adapter = createOpenaiVideo("sora-2", apiKey);

        // Create the job
        const { jobId } = await generateVideo({
          adapter,
          prompt,
          size: (size as any) ?? "1280x720",
          duration: duration ?? 8,
        });

        // Poll until complete (max 10 minutes)
        const maxWait = 600_000;
        const startTime = Date.now();
        let status = await getVideoJobStatus({ adapter, jobId });

        while (
          status.status !== "completed" &&
          status.status !== "failed" &&
          Date.now() - startTime < maxWait
        ) {
          await new Promise((r) => setTimeout(r, 5000));
          status = await getVideoJobStatus({ adapter, jobId });
        }

        if (status.status === "failed") {
          return {
            error: `Video generation failed: ${status.error || "Unknown error"}`,
          };
        }

        if (status.status === "completed" && (status as any).url) {
          return {
            status: "completed",
            url: (status as any).url,
            jobId,
            prompt,
            note: "Video generated successfully. The URL may expire — download promptly.",
          };
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
