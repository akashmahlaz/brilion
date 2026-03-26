import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * Resolve media binary from a URL (Cloudinary CDN or any HTTP URL).
 */
async function resolveMediaBuffer(url: string): Promise<Buffer> {
  if (!url.startsWith("http")) {
    throw new Error(`Cannot resolve media from non-HTTP URL: ${url}`);
  }
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch media: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

/**
 * Channel context — when provided, auto-binds channelId/channel into tools
 * so the AI doesn't need to know the JID or channel type.
 */
interface ChannelContext {
  channelId: string;   // e.g. "919876543210@s.whatsapp.net"
  channel: "whatsapp" | "telegram";
}

/**
 * Create channel media tools — let the AI send images, audio, video directly to channels.
 *
 * When `ctx` is provided (channel conversations), the tools auto-bind channelId/channel
 * so the AI only needs to pass imageUrl/audioUrl/videoUrl + optional caption.
 * When `ctx` is omitted (web dashboard), the full parameters are exposed.
 */
export function createChannelMediaTools(userId: string, ctx?: ChannelContext) {
  const sendImageToChannel = ctx
    ? toolDefinition({
        name: "send_image_to_channel",
        description:
          "Send a generated image to the current channel as a media message. ALWAYS call this after generate_image — pass the imageUrl from the result. The image will be sent as a native WhatsApp/Telegram image, not as a link.",
        inputSchema: z.object({
          imageUrl: z.string().describe("The imageUrl returned by generate_image (Cloudinary CDN URL)"),
          caption: z.string().optional().describe("Optional caption for the image"),
        }),
      }).server(async ({ imageUrl, caption }: { imageUrl: string; caption?: string }) => {
        console.log(`[channel-media] Sending image to ${ctx.channel}:${ctx.channelId} from ${imageUrl}`);
        try {
          const buffer = await resolveMediaBuffer(imageUrl);
          if (ctx.channel === "whatsapp") {
            const { sendImage } = await import("../wa-manager");
            return await sendImage(userId, ctx.channelId, buffer, caption, "image/png");
          }
          if (ctx.channel === "telegram") {
            return { status: "error", error: "Telegram image sending not yet implemented" };
          }
          return { status: "error", error: `Unknown channel: ${ctx.channel}` };
        } catch (e) {
          console.error("[channel-media] sendImage failed:", e);
          return { status: "error", error: e instanceof Error ? e.message : String(e) };
        }
      })
    : toolDefinition({
        name: "send_image_to_channel",
        description:
          "Send a generated image to a WhatsApp/Telegram channel. Use after generate_image. Requires channelId and channel when called from web.",
        inputSchema: z.object({
          imageUrl: z.string().describe("The imageUrl returned by generate_image"),
          caption: z.string().optional().describe("Optional caption for the image"),
          channelId: z.string().describe("The channel recipient JID/chatId to send to"),
          channel: z.enum(["whatsapp", "telegram"]).describe("Which channel to send on"),
        }),
      }).server(async ({ imageUrl, caption, channelId, channel }: {
        imageUrl: string; caption?: string; channelId: string; channel: string;
      }) => {
        console.log(`[channel-media] Sending image to ${channel}:${channelId} from ${imageUrl}`);
        try {
          const buffer = await resolveMediaBuffer(imageUrl);
          if (channel === "whatsapp") {
            const { sendImage } = await import("../wa-manager");
            return await sendImage(userId, channelId, buffer, caption, "image/png");
          }
          if (channel === "telegram") {
            return { status: "error", error: "Telegram image sending not yet implemented" };
          }
          return { status: "error", error: `Unknown channel: ${channel}` };
        } catch (e) {
          console.error("[channel-media] sendImage failed:", e);
          return { status: "error", error: e instanceof Error ? e.message : String(e) };
        }
      });

  const sendAudioToChannel = ctx
    ? toolDefinition({
        name: "send_audio_to_channel",
        description:
          "Send generated audio/voice to the current channel as a voice note. ALWAYS call this after text_to_speech — pass the audioUrl from the result.",
        inputSchema: z.object({
          audioUrl: z.string().describe("The audioUrl returned by text_to_speech (Cloudinary CDN URL)"),
        }),
      }).server(async ({ audioUrl }: { audioUrl: string }) => {
        console.log(`[channel-media] Sending audio to ${ctx.channel}:${ctx.channelId} from ${audioUrl}`);
        try {
          const buffer = await resolveMediaBuffer(audioUrl);
          if (ctx.channel === "whatsapp") {
            const { sendAudio } = await import("../wa-manager");
            return await sendAudio(userId, ctx.channelId, buffer, "audio/ogg; codecs=opus", true);
          }
          return { status: "error", error: `Unsupported channel for audio: ${ctx.channel}` };
        } catch (e) {
          console.error("[channel-media] sendAudio failed:", e);
          return { status: "error", error: e instanceof Error ? e.message : String(e) };
        }
      })
    : toolDefinition({
        name: "send_audio_to_channel",
        description:
          "Send generated audio/voice to a WhatsApp/Telegram channel as a voice note. Use after text_to_speech.",
        inputSchema: z.object({
          audioUrl: z.string().describe("The audioUrl returned by text_to_speech"),
          channelId: z.string().describe("The channel recipient JID/chatId to send to"),
          channel: z.enum(["whatsapp", "telegram"]).describe("Which channel to send on"),
        }),
      }).server(async ({ audioUrl, channelId, channel }: {
        audioUrl: string; channelId: string; channel: string;
      }) => {
        console.log(`[channel-media] Sending audio to ${channel}:${channelId} from ${audioUrl}`);
        try {
          const buffer = await resolveMediaBuffer(audioUrl);
          if (channel === "whatsapp") {
            const { sendAudio } = await import("../wa-manager");
            return await sendAudio(userId, channelId, buffer, "audio/ogg; codecs=opus", true);
          }
          return { status: "error", error: `Unsupported channel for audio: ${channel}` };
        } catch (e) {
          console.error("[channel-media] sendAudio failed:", e);
          return { status: "error", error: e instanceof Error ? e.message : String(e) };
        }
      });

  const sendVideoToChannel = ctx
    ? toolDefinition({
        name: "send_video_to_channel",
        description:
          "Send a generated video to the current channel. ALWAYS call this after generate_video — pass the videoUrl from the result.",
        inputSchema: z.object({
          videoUrl: z.string().describe("URL of the generated video to send"),
          caption: z.string().optional().describe("Optional caption for the video"),
        }),
      }).server(async ({ videoUrl, caption }: { videoUrl: string; caption?: string }) => {
        console.log(`[channel-media] Sending video to ${ctx.channel}:${ctx.channelId}`);
        try {
          const buffer = await resolveMediaBuffer(videoUrl);
          if (ctx.channel === "whatsapp") {
            const { sendVideo } = await import("../wa-manager");
            return await sendVideo(userId, ctx.channelId, buffer, caption, "video/mp4");
          }
          return { status: "error", error: `Unsupported channel for video: ${ctx.channel}` };
        } catch (e) {
          console.error("[channel-media] sendVideo failed:", e);
          return { status: "error", error: e instanceof Error ? e.message : String(e) };
        }
      })
    : toolDefinition({
        name: "send_video_to_channel",
        description:
          "Send a generated video to a WhatsApp/Telegram channel. Use after generate_video.",
        inputSchema: z.object({
          videoUrl: z.string().describe("URL of the generated video to send"),
          caption: z.string().optional().describe("Optional caption for the video"),
          channelId: z.string().describe("The channel recipient JID/chatId to send to"),
          channel: z.enum(["whatsapp", "telegram"]).describe("Which channel to send on"),
        }),
      }).server(async ({ videoUrl, caption, channelId, channel }: {
        videoUrl: string; caption?: string; channelId: string; channel: string;
      }) => {
        console.log(`[channel-media] Sending video to ${channel}:${channelId}`);
        try {
          const buffer = await resolveMediaBuffer(videoUrl);
          if (channel === "whatsapp") {
            const { sendVideo } = await import("../wa-manager");
            return await sendVideo(userId, channelId, buffer, caption, "video/mp4");
          }
          return { status: "error", error: `Unsupported channel for video: ${channel}` };
        } catch (e) {
          console.error("[channel-media] sendVideo failed:", e);
          return { status: "error", error: e instanceof Error ? e.message : String(e) };
        }
      });

  return [sendImageToChannel, sendAudioToChannel, sendVideoToChannel];
}
