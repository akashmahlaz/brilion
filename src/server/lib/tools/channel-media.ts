import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * Create channel media tools — let the AI send images, audio, video directly to channels.
 * These tools are automatically available when a channel conversation is active.
 */
export function createChannelMediaTools(userId: string) {
  const sendImageToChannel = toolDefinition({
    name: "send_image_to_channel",
    description:
      "Send a generated image to the current WhatsApp/Telegram channel as a media message. Use after generate_image when the conversation is on a channel (not web). Pass the base64 image data from generate_image's result.",
    inputSchema: z.object({
      imageBase64: z.string().describe("Base64-encoded image data from generate_image result"),
      caption: z.string().optional().describe("Optional caption for the image"),
      channelId: z.string().describe("The channel recipient JID/chatId to send to"),
      channel: z.enum(["whatsapp", "telegram"]).describe("Which channel to send on"),
    }),
  }).server(async ({ imageBase64, caption, channelId, channel }: {
    imageBase64: string; caption?: string; channelId: string; channel: string;
  }) => {
    console.log(`[channel-media] Sending image to ${channel}:${channelId} (${imageBase64.length} chars b64)`);
    try {
      if (channel === "whatsapp") {
        const { sendImage } = await import("../wa-manager");
        const buffer = Buffer.from(imageBase64, "base64");
        const result = await sendImage(userId, channelId, buffer, caption, "image/png");
        return result;
      }
      if (channel === "telegram") {
        // Future: implement Telegram image sending
        return { status: "error", error: "Telegram image sending not yet implemented" };
      }
      return { status: "error", error: `Unknown channel: ${channel}` };
    } catch (e) {
      console.error("[channel-media] sendImage failed:", e);
      return { status: "error", error: e instanceof Error ? e.message : String(e) };
    }
  });

  const sendAudioToChannel = toolDefinition({
    name: "send_audio_to_channel",
    description:
      "Send generated audio/voice to the current WhatsApp/Telegram channel as a voice note. Use after text_to_speech when the conversation is on a channel. Pass the base64 audio data.",
    inputSchema: z.object({
      audioBase64: z.string().describe("Base64-encoded audio data from text_to_speech result"),
      channelId: z.string().describe("The channel recipient JID/chatId to send to"),
      channel: z.enum(["whatsapp", "telegram"]).describe("Which channel to send on"),
    }),
  }).server(async ({ audioBase64, channelId, channel }: {
    audioBase64: string; channelId: string; channel: string;
  }) => {
    console.log(`[channel-media] Sending audio to ${channel}:${channelId}`);
    try {
      if (channel === "whatsapp") {
        const { sendAudio } = await import("../wa-manager");
        const buffer = Buffer.from(audioBase64, "base64");
        const result = await sendAudio(userId, channelId, buffer, "audio/ogg; codecs=opus", true);
        return result;
      }
      return { status: "error", error: `Unsupported channel for audio: ${channel}` };
    } catch (e) {
      console.error("[channel-media] sendAudio failed:", e);
      return { status: "error", error: e instanceof Error ? e.message : String(e) };
    }
  });

  const sendVideoToChannel = toolDefinition({
    name: "send_video_to_channel",
    description:
      "Send a generated video to the current WhatsApp/Telegram channel. Use after generate_video when conversation is on a channel.",
    inputSchema: z.object({
      videoUrl: z.string().describe("URL of the generated video to download and send"),
      caption: z.string().optional().describe("Optional caption for the video"),
      channelId: z.string().describe("The channel recipient JID/chatId to send to"),
      channel: z.enum(["whatsapp", "telegram"]).describe("Which channel to send on"),
    }),
  }).server(async ({ videoUrl, caption, channelId, channel }: {
    videoUrl: string; caption?: string; channelId: string; channel: string;
  }) => {
    console.log(`[channel-media] Sending video to ${channel}:${channelId}`);
    try {
      // Download video from URL
      const response = await fetch(videoUrl);
      if (!response.ok) return { status: "error", error: `Failed to download video: ${response.status}` };
      const buffer = Buffer.from(await response.arrayBuffer());

      if (channel === "whatsapp") {
        const { sendVideo } = await import("../wa-manager");
        const result = await sendVideo(userId, channelId, buffer, caption, "video/mp4");
        return result;
      }
      return { status: "error", error: `Unsupported channel for video: ${channel}` };
    } catch (e) {
      console.error("[channel-media] sendVideo failed:", e);
      return { status: "error", error: e instanceof Error ? e.message : String(e) };
    }
  });

  return [sendImageToChannel, sendAudioToChannel, sendVideoToChannel];
}
