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
 * Mirrors OpenClaw's allowFrom gating logic.
 */
function isAllowed(sender: string, channelCfg: ChannelConfig): boolean {
  if (!channelCfg.enabled) return false;
  if (channelCfg.dmPolicy === "disabled") return false;
  if (channelCfg.dmPolicy === "open") return true;
  // allowlist or pairing — check allowFrom list
  return channelCfg.allowFrom.some(
    (pattern) => pattern === "*" || pattern === sender ||
      sender.includes(pattern.replace(/^\+/, ""))
  );
}

/**
 * OpenClaw-style chat commands.
 * Returns a response string if the message is a command, null otherwise.
 */
async function handleChatCommand(
  text: string,
  msg: IncomingMessage,
  ownerId: any
): Promise<string | null> {
  const cmd = text.trim().toLowerCase();

  if (cmd === "/new" || cmd === "/reset") {
    // Delete conversation for this sender to start fresh
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
    const config = await loadConfig(ownerId?.toString());
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
    // Keep first 2 and last 6 messages, summarize the middle
    const keep = [
      ...conv.messages.slice(0, 2),
      {
        role: "system",
        content: `[Compacted ${conv.messages.length - 8} earlier messages]`,
        createdAt: new Date(),
      },
      ...conv.messages.slice(-6),
    ];
    conv.messages = keep;
    await conv.save();
    return `Compacted: kept ${keep.length} messages (was ${conv.messages.length + conv.messages.length - keep.length}).`;
  }

  if (cmd.startsWith("/model")) {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2) {
      const config = await loadConfig(ownerId?.toString());
      return `Current model: ${config.agents?.defaults?.model?.primary || "gpt-4o"}`;
    }
    // Change model for this session's conversation only
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

  return null; // Not a command
}

/**
 * Route an incoming message through the AI agent and send the reply
 * back through the same channel. Implements OpenClaw-style routing:
 * - DM policy check
 * - Chat command handling (/new, /reset, /status, /model, etc.)
 * - Conversation history with context window
 * - Model failover via fallbacks
 */
export async function routeMessage(msg: IncomingMessage): Promise<string> {
  log("routeMessage() called:", { channel: msg.channel, senderId: msg.senderId, senderName: msg.senderName, textLength: msg.text.length });
  await connectDB();

  const config = await loadConfig();
  if (!config || !config.userId) {
    logErr("No config/userId found — cannot route message. Please ensure a config exists.");
    return "[error] Agent not configured yet. Open the dashboard first.";
  }
  const ownerId = config.userId;
  log("Config loaded (owner:", ownerId, "), checking channel config for:", msg.channel);
  const channelCfg = config.channels?.[msg.channel] as ChannelConfig | undefined;

  if (channelCfg && !isAllowed(msg.senderId, channelCfg)) {
    log("BLOCKED: sender not allowed by DM policy:", msg.senderId);
    return "[blocked] Sender not allowed by DM policy.";
  }

  // Handle chat commands (OpenClaw-style /commands)
  if (msg.text.startsWith("/")) {
    const cmdResult = await handleChatCommand(msg.text, msg, ownerId);
    if (cmdResult !== null) {
      log("Chat command handled:", msg.text.split(" ")[0]);
      return cmdResult;
    }
  }

  // Find or create conversation for this sender+channel
  let conv = await Conversation.findOne({
    channel: msg.channel,
    foreignId: msg.senderId,
    userId: ownerId,
  });

  if (!conv) {
    log("Creating new conversation for:", msg.senderId);
    conv = await Conversation.create({
      userId: ownerId,
      channel: msg.channel,
      foreignId: msg.senderId,
      title: `${msg.channel} — ${msg.senderName || msg.senderId}`,
      messages: [],
      model: config.agents?.defaults?.model?.primary || "gpt-4o",
    });
  } else {
    log("Found existing conversation, id:", conv._id, "messages:", conv.messages?.length);
  }

  // Build messages array from conversation history (last 20 messages for context)
  const history = (conv.messages || []).slice(-20).map((m: any) => ({
    role: m.role,
    content: m.content,
  }));
  history.push({ role: "user" as const, content: msg.text });
  log("History built, total messages:", history.length);

  // Get agent config with userId for proper key resolution & model failover
  log("Getting agent config...");
  const agentConfig = await getAgentConfig(ownerId.toString());
  log("Agent config ready, model:", agentConfig.model?.toString?.() || "unknown");

  // Use per-conversation model override if set
  let modelOverride;
  if (conv.model && conv.model !== config.agents?.defaults?.model?.primary) {
    try {
      const { resolveModel } = await import("./providers");
      modelOverride = await resolveModel(conv.model, ownerId.toString());
      log("Using conversation model override:", conv.model);
    } catch {
      log("Conversation model override failed, using default");
    }
  }

  log("Calling streamText...");
  const result = streamText({
    ...agentConfig,
    ...(modelOverride ? { model: modelOverride } : {}),
    messages: history,
  });

  const fullText = await result.text;
  log("AI response received, length:", fullText.length, "preview:", fullText.slice(0, 100));

  // Save to conversation
  conv.messages.push(
    { role: "user", content: msg.text },
    { role: "assistant", content: fullText }
  );
  await conv.save();
  log("Conversation saved");

  // Send reply back through the channel
  switch (msg.channel) {
    case "whatsapp":
      log("Sending WhatsApp reply to:", msg.senderId);
      await sendWhatsAppMessage(msg.senderId, fullText);
      break;
    case "telegram":
      log("Telegram reply - handled by caller");
      break;
  }

  log("routeMessage() complete for:", msg.senderId);
  return fullText;
}

/**
 * Start listening for incoming messages on all enabled channels.
 * Call this once at server startup.
 */
let _initialized = false;
export async function initMessageRouter(): Promise<void> {
  if (_initialized) {
    log("initMessageRouter() already initialized, skipping");
    return;
  }
  _initialized = true;
  log("initMessageRouter() — registering WhatsApp listener...");

  // WhatsApp listener
  onWhatsAppMessage(async (msg) => {
    log(">>> WhatsApp message received:", { jid: msg.jid, pushName: msg.pushName, text: msg.text.slice(0, 100) });
    try {
      const reply = await routeMessage({
        channel: "whatsapp",
        senderId: msg.jid,
        senderName: msg.pushName,
        text: msg.text,
      });
      log("<<< WhatsApp reply sent, length:", reply.length);
    } catch (err) {
      logErr("WhatsApp message routing FAILED:", err);
    }
  });

  log("Message router initialized successfully");
}
