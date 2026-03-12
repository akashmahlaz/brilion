import { streamText } from "ai";
import { getAgentConfig } from "./agent";
import { loadConfig } from "./config";
import {
  sendWhatsAppMessage,
  onWhatsAppMessage,
} from "../channels/whatsapp";
import { Conversation } from "../models/conversation";
import { connectDB } from "../db";

const log = (...args: unknown[]) => console.log("[router]", ...args);
const logErr = (...args: unknown[]) => console.error("[router]", ...args);

type ChannelId = "whatsapp" | "telegram" | "web";

interface IncomingMessage {
  channel: ChannelId;
  userId: string;
  senderId: string;
  senderName?: string;
  text: string;
  foreignId?: string;
}

interface ChannelConfig {
  enabled: boolean;
  dmPolicy: "open" | "pairing" | "allowlist" | "disabled";
  allowFrom: string[];
}

/**
 * Check if a sender is allowed based on the DM policy.
 */
function isAllowed(sender: string, channelCfg: ChannelConfig): boolean {
  if (!channelCfg.enabled) return false;
  if (channelCfg.dmPolicy === "disabled") return false;
  if (channelCfg.dmPolicy === "open") return true;
  return channelCfg.allowFrom.some(
    (pattern) => pattern === "*" || pattern === sender ||
      sender.includes(pattern.replace(/^\+/, ""))
  );
}

/**
 * OpenClaw-style chat commands.
 */
async function handleChatCommand(
  text: string,
  msg: IncomingMessage,
  ownerId: string
): Promise<string | null> {
  const cmd = text.trim().toLowerCase();

  if (cmd === "/new" || cmd === "/reset") {
    const deleted = await Conversation.findOneAndDelete({
      channel: msg.channel,
      foreignId: msg.senderId,
      userId: ownerId,
    });
    return deleted
      ? "Session reset. Starting fresh."
      : "No active session to reset.";
  }

  if (cmd === "/status") {
    const config = await loadConfig(ownerId);
    const conv = await Conversation.findOne({
      channel: msg.channel,
      foreignId: msg.senderId,
      userId: ownerId,
    });
    const model = config.agents?.defaults?.model?.primary || "gpt-4o";
    const msgCount = conv?.messages?.length || 0;
    return [
      `Model: ${model}`,
      `Channel: ${msg.channel}`,
      `Messages: ${msgCount}`,
      `Session: ${conv ? "active" : "none"}`,
    ].join("\n");
  }

  if (cmd === "/compact") {
    const conv = await Conversation.findOne({
      channel: msg.channel,
      foreignId: msg.senderId,
      userId: ownerId,
    });
    if (!conv || !conv.messages || conv.messages.length < 10) {
      return "Not enough messages to compact.";
    }
    const originalCount = conv.messages.length;
    const keep = [
      ...conv.messages.slice(0, 2),
      {
        role: "system",
        content: `[Compacted ${originalCount - 8} earlier messages]`,
        createdAt: new Date(),
      },
      ...conv.messages.slice(-6),
    ];
    conv.messages = keep;
    await conv.save();
    return `Compacted: kept ${keep.length} messages (was ${originalCount}).`;
  }

  if (cmd.startsWith("/model")) {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2) {
      const config = await loadConfig(ownerId);
      return `Current model: ${config.agents?.defaults?.model?.primary || "gpt-4o"}`;
    }
    const newModel = parts[1];
    const conv = await Conversation.findOne({
      channel: msg.channel,
      foreignId: msg.senderId,
      userId: ownerId,
    });
    if (conv) {
      conv.model = newModel;
      await conv.save();
      return `Session model changed to: ${newModel}`;
    }
    return `Model preference noted: ${newModel} (will apply on next message)`;
  }

  if (cmd === "/usage") {
    const conv = await Conversation.findOne({
      channel: msg.channel,
      foreignId: msg.senderId,
      userId: ownerId,
    });
    const totalChars = (conv?.messages || []).reduce(
      (acc: number, m: any) => acc + (m.content?.length || 0),
      0
    );
    return [
      `Messages: ${conv?.messages?.length || 0}`,
      `Total chars: ${totalChars}`,
      `Est. tokens: ~${Math.ceil(totalChars / 4)}`,
    ].join("\n");
  }

  if (cmd === "/help") {
    return [
      "Available commands:",
      "/new or /reset — Start a new session",
      "/status — Show current session info",
      "/model [name] — Show or change model",
      "/compact — Compress old messages",
      "/usage — Show token usage estimate",
      "/help — Show this help",
    ].join("\n");
  }

  return null;
}

/**
 * Route an incoming message through the AI agent and send the reply
 * back through the same channel.
 */
export async function routeMessage(msg: IncomingMessage): Promise<string> {
  log("routeMessage() called:", { channel: msg.channel, userId: msg.userId, senderId: msg.senderId });
  await connectDB();

  const ownerId = msg.userId;
  const config = await loadConfig(ownerId);
  if (!config || !config.userId) {
    logErr("No config found for userId:", ownerId);
    return "[error] Agent not configured yet. Open the dashboard first.";
  }

  const channelCfg = config.channels?.[msg.channel] as ChannelConfig | undefined;
  if (channelCfg && !isAllowed(msg.senderId, channelCfg)) {
    log("BLOCKED: sender not allowed:", msg.senderId);
    return "[blocked] Sender not allowed by DM policy.";
  }

  // Handle chat commands
  if (msg.text.startsWith("/")) {
    const cmdResult = await handleChatCommand(msg.text, msg, ownerId);
    if (cmdResult !== null) return cmdResult;
  }

  // Find or create conversation
  let conv = await Conversation.findOne({
    channel: msg.channel,
    foreignId: msg.senderId,
    userId: ownerId,
  });

  if (!conv) {
    conv = await Conversation.create({
      userId: ownerId,
      channel: msg.channel,
      foreignId: msg.senderId,
      title: `${msg.channel} — ${msg.senderName || msg.senderId}`,
      messages: [],
      model: config.agents?.defaults?.model?.primary || "gpt-4o",
    });
  }

  const history = (conv.messages || []).slice(-20).map((m: any) => ({
    role: m.role,
    content: m.content,
  }));
  history.push({ role: "user" as const, content: msg.text });

  const agentConfig = await getAgentConfig(ownerId);

  let modelOverride;
  if (conv.model && conv.model !== config.agents?.defaults?.model?.primary) {
    try {
      const { resolveModel } = await import("./providers");
      modelOverride = await resolveModel(conv.model, ownerId);
    } catch {
      // use default
    }
  }

  const result = streamText({
    ...agentConfig,
    ...(modelOverride ? { model: modelOverride } : {}),
    messages: history,
  });

  const fullText = await result.text;

  // Save to conversation
  conv.messages.push(
    { role: "user", content: msg.text },
    { role: "assistant", content: fullText }
  );
  await conv.save();

  // Send reply back through channel
  switch (msg.channel) {
    case "whatsapp":
      await sendWhatsAppMessage(ownerId, msg.senderId, fullText);
      break;
    case "telegram":
      // handled by caller
      break;
  }

  return fullText;
}

/**
 * Start listening for incoming messages on all enabled channels.
 * Per-user initialization — safe to call multiple times.
 */
const _initializedUsers = new Set<string>();

export async function initMessageRouter(userId: string): Promise<void> {
  if (_initializedUsers.has(userId)) return;
  _initializedUsers.add(userId);
  log("initMessageRouter() for user:", userId);

  onWhatsAppMessage((ownerUserId, msg) => {
    if (ownerUserId !== userId) return;
    log(">>> WhatsApp message for user:", userId, "jid:", msg.jid);
    routeMessage({
      channel: "whatsapp",
      userId,
      senderId: msg.jid,
      senderName: msg.pushName,
      text: msg.text,
    }).catch((err) => {
      logErr("WhatsApp message routing FAILED:", err);
    });
  });

  log("Message router initialized for user:", userId);
}
