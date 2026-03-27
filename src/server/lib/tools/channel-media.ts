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
          imageUrl: z.string().optional().describe("The imageUrl returned by generate_image (Cloudinary CDN URL)"),
          url: z.string().optional().describe("Alias of imageUrl for normalized media outputs"),
          caption: z.string().optional().describe("Optional caption for the image"),
        }),
      }).server(async ({ imageUrl, url, caption }: { imageUrl?: string; url?: string; caption?: string }) => {
        const mediaUrl = url || imageUrl;
        if (!mediaUrl) return { status: "error", error: "Missing image URL" };
        console.log(`[channel-media] Sending image to ${ctx.channel}:${ctx.channelId} from ${mediaUrl}`);
        try {
          const buffer = await resolveMediaBuffer(mediaUrl);
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
          imageUrl: z.string().optional().describe("The imageUrl returned by generate_image"),
          url: z.string().optional().describe("Alias of imageUrl for normalized media outputs"),
          caption: z.string().optional().describe("Optional caption for the image"),
          channelId: z.string().describe("The channel recipient JID/chatId to send to"),
          channel: z.enum(["whatsapp", "telegram"]).describe("Which channel to send on"),
        }),
      }).server(async ({ imageUrl, url, caption, channelId, channel }: {
        imageUrl?: string; url?: string; caption?: string; channelId: string; channel: string;
      }) => {
        const mediaUrl = url || imageUrl;
        if (!mediaUrl) return { status: "error", error: "Missing image URL" };
        console.log(`[channel-media] Sending image to ${channel}:${channelId} from ${mediaUrl}`);
        try {
          const buffer = await resolveMediaBuffer(mediaUrl);
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
          audioUrl: z.string().optional().describe("The audioUrl returned by text_to_speech (Cloudinary CDN URL)"),
          url: z.string().optional().describe("Alias of audioUrl for normalized media outputs"),
        }),
      }).server(async ({ audioUrl, url }: { audioUrl?: string; url?: string }) => {
        const mediaUrl = url || audioUrl;
        if (!mediaUrl) return { status: "error", error: "Missing audio URL" };
        console.log(`[channel-media] Sending audio to ${ctx.channel}:${ctx.channelId} from ${mediaUrl}`);
        try {
          const buffer = await resolveMediaBuffer(mediaUrl);
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
          audioUrl: z.string().optional().describe("The audioUrl returned by text_to_speech"),
          url: z.string().optional().describe("Alias of audioUrl for normalized media outputs"),
          channelId: z.string().describe("The channel recipient JID/chatId to send to"),
          channel: z.enum(["whatsapp", "telegram"]).describe("Which channel to send on"),
        }),
      }).server(async ({ audioUrl, url, channelId, channel }: {
        audioUrl?: string; url?: string; channelId: string; channel: string;
      }) => {
        const mediaUrl = url || audioUrl;
        if (!mediaUrl) return { status: "error", error: "Missing audio URL" };
        console.log(`[channel-media] Sending audio to ${channel}:${channelId} from ${mediaUrl}`);
        try {
          const buffer = await resolveMediaBuffer(mediaUrl);
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
          videoUrl: z.string().optional().describe("URL of the generated video to send"),
          url: z.string().optional().describe("Alias of videoUrl for normalized media outputs"),
          caption: z.string().optional().describe("Optional caption for the video"),
        }),
      }).server(async ({ videoUrl, url, caption }: { videoUrl?: string; url?: string; caption?: string }) => {
        const mediaUrl = url || videoUrl;
        if (!mediaUrl) return { status: "error", error: "Missing video URL" };
        console.log(`[channel-media] Sending video to ${ctx.channel}:${ctx.channelId}`);
        try {
          const buffer = await resolveMediaBuffer(mediaUrl);
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
          videoUrl: z.string().optional().describe("URL of the generated video to send"),
          url: z.string().optional().describe("Alias of videoUrl for normalized media outputs"),
          caption: z.string().optional().describe("Optional caption for the video"),
          channelId: z.string().describe("The channel recipient JID/chatId to send to"),
          channel: z.enum(["whatsapp", "telegram"]).describe("Which channel to send on"),
        }),
      }).server(async ({ videoUrl, url, caption, channelId, channel }: {
        videoUrl?: string; url?: string; caption?: string; channelId: string; channel: string;
      }) => {
        const mediaUrl = url || videoUrl;
        if (!mediaUrl) return { status: "error", error: "Missing video URL" };
        console.log(`[channel-media] Sending video to ${channel}:${channelId}`);
        try {
          const buffer = await resolveMediaBuffer(mediaUrl);
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
