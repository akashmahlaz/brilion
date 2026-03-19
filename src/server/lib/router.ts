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
  imageBase64?: string;
  imageMime?: string;
}

interface ChannelConfig {
  enabled: boolean;
  dmPolicy: "open" | "pairing" | "allowlist" | "disabled";
  allowFrom: string[];
}

function isAllowed(sender: string, channelCfg: ChannelConfig): boolean {
  if (!channelCfg.enabled) {
    log("isAllowed: channel DISABLED");
    return false;
  }
  if (channelCfg.dmPolicy === "disabled") {
    log("isAllowed: dmPolicy=disabled");
    return false;
  }
  if (channelCfg.dmPolicy === "open") {
    log("isAllowed: dmPolicy=open → ALLOWED");
    return true;
  }
  const allowed = channelCfg.allowFrom.some(
    (pattern) => pattern === "*" || pattern === sender ||
      sender.includes(pattern.replace(/^\+/, ""))
  );
  log("isAllowed: dmPolicy=", channelCfg.dmPolicy, "allowFrom:", channelCfg.allowFrom, "sender:", sender, "→", allowed ? "ALLOWED" : "BLOCKED");
  return allowed;
}

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

export async function routeMessage(msg: IncomingMessage): Promise<string> {
  log("========== routeMessage() START ==========");
  log("Channel:", msg.channel);
  log("UserId:", msg.userId);
  log("SenderId:", msg.senderId);
  log("SenderName:", msg.senderName);
  log("Text:", msg.text?.substring(0, 200));
  
  await connectDB();

  const ownerId = msg.userId;
  
  log("Loading config for userId:", ownerId);
  const config = await loadConfig(ownerId);
  log("Config loaded:", !!config, "config.userId:", config?.userId);
  
  if (!config || !config.userId) {
    logErr("NO CONFIG for userId:", ownerId);
    return "[error] Agent not configured yet. Open the dashboard first.";
  }

  // Check channel permissions
  const channelCfg = config.channels?.[msg.channel] as ChannelConfig | undefined;
  log("Channel config:", JSON.stringify(channelCfg));
  
  if (channelCfg && !isAllowed(msg.senderId, channelCfg)) {
    log("BLOCKED: sender not allowed:", msg.senderId);
    // Still send the blocked message back so user knows
    if (msg.channel === "whatsapp") {
      await sendWhatsAppMessage(ownerId, msg.senderId, "[blocked] Sender not allowed by DM policy.");
    }
    return "[blocked] Sender not allowed by DM policy.";
  }

  // Handle chat commands
  if (msg.text.startsWith("/")) {
    log("Processing chat command:", msg.text);
    const cmdResult = await handleChatCommand(msg.text, msg, ownerId);
    if (cmdResult !== null) {
      log("Command result:", cmdResult);
      if (msg.channel === "whatsapp") {
        await sendWhatsAppMessage(ownerId, msg.senderId, cmdResult);
      }
      return cmdResult;
    }
  }

  // Find or create conversation
  log("Looking up conversation: userId=", ownerId, "channel=", msg.channel, "foreignId=", msg.senderId);
  let conv = await Conversation.findOne({
    channel: msg.channel,
    foreignId: msg.senderId,
    userId: ownerId,
  });

  if (!conv) {
    // Generate a proper title: use sender name + first message preview
    const senderLabel = msg.senderName || msg.senderId.replace(/@.*/, "");
    const msgPreview = msg.text.length > 40 ? msg.text.slice(0, 40) + "…" : msg.text;
    const title = `${senderLabel}: ${msgPreview}`;
    
    log("No existing conversation — creating new one");
    conv = await Conversation.create({
      userId: ownerId,
      channel: msg.channel,
      foreignId: msg.senderId,
      title,
      messages: [],
      model: config.agents?.defaults?.model?.primary || "gpt-4o",
    });
    log("Created conversation:", conv._id, "title:", title);
  } else {
    log("Found existing conversation:", conv._id, "messages:", conv.messages?.length);
  }

  // Build message history
  const history = (conv.messages || []).slice(-20).map((m: any) => ({
    role: m.role,
    content: m.content,
  }));

  // Build the current user message — multimodal if image attached
  if (msg.imageBase64 && msg.imageMime) {
    const parts: any[] = [];
    if (msg.text && msg.text !== "[User sent an image]") {
      parts.push({ type: "text", text: msg.text });
    }
    parts.push({ type: "image", image: msg.imageBase64, mimeType: msg.imageMime });
    history.push({ role: "user" as const, content: parts });
  } else {
    history.push({ role: "user" as const, content: msg.text });
  }
  log("Message history length:", history.length);

  // Get agent config (model + tools + system prompt)
  log("Getting agent config...");
  let agentConfig;
  try {
    agentConfig = await getAgentConfig(ownerId);
    log("Agent config ready. Model:", (agentConfig.model as any)?.modelId || "unknown");
    log("Tools:", Object.keys(agentConfig.tools || {}).join(", "));
    log("System prompt length:", agentConfig.system?.length);
  } catch (e) {
    logErr("getAgentConfig FAILED:", e);
    const errMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
    if (msg.channel === "whatsapp") {
      await sendWhatsAppMessage(ownerId, msg.senderId, errMsg);
    }
    return errMsg;
  }

  // Check for model override on conversation
  let modelOverride;
  if (conv.model && conv.model !== config.agents?.defaults?.model?.primary) {
    log("Conversation has model override:", conv.model);
    try {
      const { resolveModel } = await import("./providers");
      modelOverride = await resolveModel(conv.model, ownerId);
      log("Model override resolved");
    } catch (e) {
      log("Model override failed, using default:", e);
    }
  }

  // Call AI
  log("Calling streamText...");
  let fullText: string;
  try {
    const result = streamText({
      ...agentConfig,
      ...(modelOverride ? { model: modelOverride } : {}),
      messages: history,
    });
    fullText = await result.text;
    log("AI response received, length:", fullText.length);
    log("AI response preview:", fullText.substring(0, 300));
  } catch (e) {
    logErr("streamText FAILED:", e);
    const errMsg = `AI Error: ${e instanceof Error ? e.message : String(e)}`;
    if (msg.channel === "whatsapp") {
      await sendWhatsAppMessage(ownerId, msg.senderId, errMsg);
    }
    return errMsg;
  }

  // Save to conversation
  log("Saving messages to conversation...");
  try {
    conv.messages.push(
      { role: "user", content: msg.text },
      { role: "assistant", content: fullText }
    );
    await conv.save();
    log("Conversation saved. Total messages:", conv.messages.length);
  } catch (e) {
    logErr("Failed to save conversation:", e);
  }

  // Send reply back through channel
  log("Sending reply back via", msg.channel);
  switch (msg.channel) {
    case "whatsapp": {
      const sendResult = await sendWhatsAppMessage(ownerId, msg.senderId, fullText);
      log("WhatsApp send result:", JSON.stringify(sendResult));
      break;
    }
    case "telegram":
      log("Telegram reply handled by caller (telegram.ts)");
      break;
  }

  log("========== routeMessage() DONE ==========");
  return fullText;
}

const _initializedUsers = new Set<string>();

export async function initMessageRouter(userId: string): Promise<void> {
  if (_initializedUsers.has(userId)) {
    log("initMessageRouter() SKIPPED — already initialized for:", userId);
    return;
  }
  _initializedUsers.add(userId);
  log("========== initMessageRouter() ==========");
  log("Registering WhatsApp message handler for user:", userId);

  onWhatsAppMessage((ownerUserId, msg) => {
    log(">>> onWhatsAppMessage callback fired");
    log("  ownerUserId:", ownerUserId, "expected:", userId);
    log("  msg.jid:", msg.jid);
    log("  msg.text:", msg.text?.substring(0, 100));
    log("  msg.pushName:", msg.pushName);
    
    if (ownerUserId !== userId) {
      log("  SKIPPED: wrong user (ownerUserId !== userId)");
      return;
    }
    
    log("  Routing message to routeMessage()...");
    routeMessage({
      channel: "whatsapp",
      userId,
      senderId: msg.jid,
      senderName: msg.pushName,
      text: msg.text,
      imageBase64: msg.imageBase64,
      imageMime: msg.imageMime,
    }).then((reply) => {
      log("  routeMessage() completed. Reply length:", reply?.length);
    }).catch((err) => {
      logErr("  WhatsApp message routing FAILED:", err);
    });
  });

  log("Message router initialized for user:", userId);
}
