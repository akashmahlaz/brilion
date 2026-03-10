import { streamText } from "ai";
import { getAgentConfig } from "./agent";
import { loadConfig } from "./config";
import {
  sendWhatsAppMessage,
  onWhatsAppMessage,
} from "../channels/whatsapp";
import { Conversation } from "../models/conversation";
import { connectDB } from "../db";

type ChannelId = "whatsapp" | "telegram" | "web";

interface IncomingMessage {
  channel: ChannelId;
  senderId: string;
  senderName?: string;
  text: string;
  /** Foreign ID to support replies */
  foreignId?: string;
}

interface ChannelConfig {
  enabled: boolean;
  dmPolicy: "open" | "pairing" | "allowlist";
  allowFrom: string[];
}

/**
 * Check if a sender is allowed based on the DM policy.
 */
function isAllowed(sender: string, channelCfg: ChannelConfig): boolean {
  if (!channelCfg.enabled) return false;
  switch (channelCfg.dmPolicy) {
    case "open":
      return true;
    case "allowlist":
      return channelCfg.allowFrom.some(
        (pattern) => pattern === "*" || pattern === sender
      );
    case "pairing":
      // Pairing = allowlist with a "pair" command to add yourself
      return channelCfg.allowFrom.some(
        (pattern) => pattern === "*" || pattern === sender
      );
    default:
      return false;
  }
}

/**
 * Route an incoming message through the AI agent and send the reply
 * back through the same channel.
 */
export async function routeMessage(msg: IncomingMessage): Promise<string> {
  await connectDB();

  const config = await loadConfig();
  const channelCfg = config.channels?.[msg.channel] as ChannelConfig | undefined;

  if (channelCfg && !isAllowed(msg.senderId, channelCfg)) {
    return "[blocked] Sender not allowed by DM policy.";
  }

  // Find or create conversation for this sender+channel
  let conv = await Conversation.findOne({
    channel: msg.channel,
    foreignId: msg.senderId,
  });

  if (!conv) {
    conv = await Conversation.create({
      channel: msg.channel,
      foreignId: msg.senderId,
      title: `${msg.channel} — ${msg.senderName || msg.senderId}`,
      messages: [],
      model: config.agents?.defaults?.model?.primary || "gpt-4o",
    });
  }

  // Build messages array from conversation history (last 20 messages for context)
  const history = (conv.messages || []).slice(-20).map((m: any) => ({
    role: m.role,
    content: m.content,
  }));
  history.push({ role: "user" as const, content: msg.text });

  // Get agent config and generate response
  const agentConfig = await getAgentConfig();
  const result = streamText({
    ...agentConfig,
    messages: history,
  });

  const fullText = await result.text;

  // Save to conversation
  conv.messages.push(
    { role: "user", content: msg.text },
    { role: "assistant", content: fullText }
  );
  await conv.save();

  // Send reply back through the channel
  switch (msg.channel) {
    case "whatsapp":
      await sendWhatsAppMessage(msg.senderId, fullText);
      break;
    case "telegram":
      // Telegram send is handled by the caller (telegram.ts) since it needs the bot context
      break;
    // web messages are handled via the chat API directly
  }

  return fullText;
}

/**
 * Start listening for incoming messages on all enabled channels.
 * Call this once at server startup.
 */
let _initialized = false;
export async function initMessageRouter(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  // WhatsApp listener
  onWhatsAppMessage(async (msg) => {
    try {
      await routeMessage({
        channel: "whatsapp",
        senderId: msg.jid,
        senderName: msg.pushName,
        text: msg.text,
      });
    } catch (err) {
      console.error("[router] WhatsApp message error:", err);
    }
  });

  console.log("[router] Message router initialized");
}
