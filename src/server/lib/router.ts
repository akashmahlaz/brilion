import { chat, maxIterations } from "@tanstack/ai";
import { getAgentConfig } from "./agent";
import { loadConfig } from "./config";
import {
  sendWhatsAppMessage,
  sendComposing,
  markRead,
  onWhatsAppMessage,
} from "../channels/whatsapp";
import { Conversation } from "../models/conversation";
import { connectDB } from "../db";
import { trackUsage, estimateTokens } from "./usage-tracker";
import { createLogger } from "../models/log-entry";
import { autoCompact } from "./compaction";
import { indexConversation } from "./memory-manager";

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
  isGroup?: boolean;
  groupId?: string;
  isMentioned?: boolean;
  messageId?: string;
  remoteJid?: string;
}

interface ChannelConfig {
  enabled: boolean;
  dmPolicy: "open" | "pairing" | "allowlist" | "disabled";
  allowFrom: string[];
  groupPolicy?: "open" | "allowlist" | "disabled";
  groupAllowFrom?: string[];
}

/** Normalize JID: strip device suffix and extract phone number */
const normalizeJid = (jid: string) =>
  jid.replace(/:\d+@/, "@").split("@")[0];

type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: string; action?: "pairing" | "block" };

/**
 * OpenClaw-style access control hierarchy:
 * 1. Channel enabled check
 * 2. Self-chat bypass (owner)
 * 3. Group policy → group allowlist → activation gating
 * 4. DM policy: disabled → block | open → allow | allowlist → check | pairing → challenge
 */
function resolveAccess(
  sender: string,
  channelCfg: ChannelConfig,
  opts: { isGroup?: boolean; groupId?: string }
): AccessDecision {
  if (!channelCfg.enabled) {
    return { allowed: false, reason: "channel_disabled" };
  }

  // Group access check
  if (opts.isGroup && opts.groupId) {
    const groupPolicy = channelCfg.groupPolicy ?? "disabled";
    if (groupPolicy === "disabled") {
      return { allowed: false, reason: "group_disabled" };
    }
    if (groupPolicy === "allowlist") {
      const groupAllowFrom = channelCfg.groupAllowFrom ?? [];
      const groupAllowed = groupAllowFrom.some(
        (p) => p === "*" || p === opts.groupId
      );
      if (!groupAllowed) {
        return { allowed: false, reason: "group_not_allowlisted" };
      }
    }
    return { allowed: true };
  }

  // DM access check
  const { dmPolicy } = channelCfg;
  if (dmPolicy === "disabled") {
    return { allowed: false, reason: "dm_disabled" };
  }
  if (dmPolicy === "open") {
    return { allowed: true };
  }

  // Check allowlist (applies to both "allowlist" and "pairing" policies)
  const inAllowlist = channelCfg.allowFrom.some(
    (pattern) =>
      pattern === "*" ||
      pattern === sender ||
      sender.includes(pattern.replace(/^\+/, ""))
  );

  if (inAllowlist) {
    return { allowed: true };
  }

  // Not in allowlist
  if (dmPolicy === "pairing") {
    return { allowed: false, reason: "pairing_required", action: "pairing" };
  }

  return { allowed: false, reason: "not_allowlisted" };
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

  if (cmd === "/activation") {
    if (!msg.isGroup) return "This command is for groups only.";
    const config = await loadConfig(ownerId);
    const gp = config.channels?.whatsapp?.groupPolicy || "disabled";
    return `Group activation mode: *${gp}*\nUse /activation mention|open|disabled to change.`;
  }

  if (cmd.startsWith("/activation ")) {
    if (!msg.isGroup) return "This command is for groups only.";
    const mode = text.trim().split(/\s+/)[1]?.toLowerCase();
    if (!["mention", "open", "disabled"].includes(mode)) {
      return "Usage: /activation mention|open|disabled";
    }
    // Map "mention" to allowlist mode with current group
    const policy = mode === "mention" ? "allowlist" : mode;
    const config = await loadConfig(ownerId);
    if (!config.channels) config.channels = {} as any;
    if (!config.channels.whatsapp) config.channels.whatsapp = {} as any;
    config.channels.whatsapp.groupPolicy = policy;
    // Auto-add this group to allowlist if switching to allowlist
    if (policy === "allowlist" && msg.groupId) {
      const list = config.channels.whatsapp.groupAllowFrom || [];
      if (!list.includes(msg.groupId) && !list.includes("*")) {
        list.push(msg.groupId);
        config.channels.whatsapp.groupAllowFrom = list;
      }
    }
    const { saveConfig } = await import("./config");
    await saveConfig(config);
    return `Group activation changed to: *${mode}*`;
  }

  if (cmd === "/help") {
    const lines = [
      "Available commands:",
      "/new or /reset — Start a new session",
      "/status — Show current session info",
      "/model [name] — Show or change model",
      "/compact — Compress old messages",
      "/usage — Show token usage estimate",
    ];
    if (msg.isGroup) {
      lines.push("/activation [mode] — Group activation (mention|open|disabled)");
    }
    lines.push("/help — Show this help");
    return lines.join("\n");
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

  // --- Access control hierarchy (OpenClaw-style) ---
  let isSelfChat = false;

  // Step 1: Self-chat detection (owner bypass)
  if (msg.channel === "whatsapp") {
    const { getOwnerJid } = await import("./wa-manager");
    const ownerJid = getOwnerJid(ownerId);
    isSelfChat = ownerJid
      ? normalizeJid(msg.senderId) === normalizeJid(ownerJid)
      : false;
    log("Self-chat check: senderId=", msg.senderId, "ownerJid=", ownerJid, "isSelfChat=", isSelfChat);

    if (isSelfChat) {
      const selfChatEnabled = config.channels?.whatsapp?.selfChatMode !== false;
      if (!selfChatEnabled) {
        log("BLOCKED: selfChatMode is disabled");
        return "[blocked] Self-chat mode is disabled.";
      }
      log("Self-chat ALLOWED — skipping access control");
    }
  }

  // Step 2: Channel access control (if not self-chat)
  if (!isSelfChat && channelCfg) {
    const access = resolveAccess(msg.senderId, channelCfg, {
      isGroup: msg.isGroup,
      groupId: msg.groupId,
    });
    log("Access decision:", JSON.stringify(access));

    if (!access.allowed) {
      if (access.action === "pairing") {
        // Issue pairing challenge
        const { issuePairingChallenge } = await import("./pairing");
        const pairing = await issuePairingChallenge({
          userId: ownerId,
          channel: msg.channel as "whatsapp" | "telegram",
          senderId: msg.senderId,
          senderName: msg.senderName,
        });
        log("Pairing challenge issued:", pairing.code, "alreadyPending:", pairing.alreadyPending);

        if (msg.channel === "whatsapp") {
          await sendWhatsAppMessage(ownerId, msg.senderId, pairing.message);
        }
        return "[pairing] Challenge issued.";
      }

      // Blocked
      const blockMsg = `[blocked] ${access.reason}`;
      log("BLOCKED:", blockMsg);
      if (msg.channel === "whatsapp") {
        await sendWhatsAppMessage(ownerId, msg.senderId, blockMsg);
      }
      return blockMsg;
    }
  } else if (!isSelfChat && !channelCfg) {
    // OpenClaw-style: default to BLOCKING when no channel config exists.
    // Only self-chat is allowed without explicit channel configuration.
    log("BLOCKED: No channel config — blocking by default (self-chat only)");
    return "[blocked] Channel not configured. Set up channel policies in the dashboard.";
  }

  // Step 3: Group activation gating (mention/command modes)
  if (msg.isGroup && channelCfg) {
    const groupPolicy = channelCfg.groupPolicy ?? "disabled";
    // In "disabled" mode, all group messages are already blocked by resolveAccess
    // In "mention" or non-"open" modes, require @mention or /command
    if (groupPolicy !== "open" && !msg.isMentioned && !msg.text.startsWith("/")) {
      log("Group message skipped: not mentioned and not a command");
      return "[skipped] Group message — not mentioned.";
    }
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

  // Send read receipt after access control passes (OpenClaw skips for self-chat + blocked)
  if (msg.channel === "whatsapp" && msg.messageId && msg.remoteJid && !isSelfChat) {
    markRead(ownerId, msg.remoteJid, msg.messageId,
      msg.isGroup ? msg.senderId : undefined
    ).catch(() => {});
  }

  // Find or create conversation
  // Per-peer isolation: DMs use senderId, groups use groupId
  const conversationKey = msg.isGroup && msg.groupId ? msg.groupId : msg.senderId;
  log("Looking up conversation: userId=", ownerId, "channel=", msg.channel, "foreignId=", conversationKey);
  let conv = await Conversation.findOne({
    channel: msg.channel,
    foreignId: conversationKey,
    userId: ownerId,
  });

  if (!conv) {
    const senderLabel = msg.senderName || msg.senderId.replace(/@.*/, "");
    const msgPreview = msg.text.length > 40 ? msg.text.slice(0, 40) + "…" : msg.text;
    const title = msg.isGroup
      ? `Group: ${conversationKey.replace(/@.*/, "")}`
      : `${senderLabel}: ${msgPreview}`;
    
    log("No existing conversation — creating new one");
    conv = await Conversation.create({
      userId: ownerId,
      channel: msg.channel,
      foreignId: conversationKey,
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

  // For group chats, inject sender context so AI knows who is speaking
  if (msg.isGroup && msg.senderName) {
    const senderLabel = msg.senderName || msg.senderId.replace(/@.*/, "");
    // Prefix the user message with sender name for context
    const contextNote = `[${senderLabel} in group]`;
    if (history.length > 0 && history[history.length - 1]?.role === "user") {
      // Will be overwritten below anyway; this is for prior messages in history
    }
    // Inject as a lightweight system note if multiple participants
    history.unshift({
      role: "system" as const,
      content: `You are in a group chat. The current speaker is ${senderLabel}. Address them by name when relevant.`,
    });
  }

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
    log("Agent config ready. Adapter:", (agentConfig.adapter as any)?.model || "unknown");
    log("Tools:", Object.keys(agentConfig.tools || {}).join(", "));
    log("System prompt length:", agentConfig.systemPrompts?.[0]?.length);
  } catch (e) {
    logErr("getAgentConfig FAILED:", e);
    const errMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
    if (msg.channel === "whatsapp") {
      await sendWhatsAppMessage(ownerId, msg.senderId, errMsg);
    }
    return errMsg;
  }

  // Check for model override on conversation
  let adapterOverride;
  if (conv.model && conv.model !== config.agents?.defaults?.model?.primary) {
    log("Conversation has model override:", conv.model);
    try {
      const { resolveModel } = await import("./providers");
      adapterOverride = await resolveModel(conv.model, ownerId);
      log("Model override resolved");
    } catch (e) {
      log("Model override failed, using default:", e);
    }
  }

  // Send typing indicator before AI processes (OpenClaw-style)
  if (msg.channel === "whatsapp") {
    const replyJid = msg.isGroup && msg.groupId ? msg.groupId : msg.senderId;
    sendComposing(ownerId, replyJid).catch(() => {});
  }

  // Call AI via TanStack AI chat()
  log("Calling chat()...");
  const sysLogger = createLogger(ownerId, "router");
  let fullText: string;
  const startTime = Date.now();
  const modelName = (agentConfig.adapter as any)?.model || "unknown";
  const providerName = (agentConfig.adapter as any)?.provider || "unknown";
  try {
    fullText = await chat({
      adapter: adapterOverride ?? agentConfig.adapter,
      messages: history,
      systemPrompts: agentConfig.systemPrompts,
      tools: agentConfig.tools,
      agentLoopStrategy: maxIterations(agentConfig.maxSteps ?? 20),
      stream: false,
    }) as string;
    const durationMs = Date.now() - startTime;
    log("AI response received, length:", fullText.length);
    log("AI response preview:", fullText.substring(0, 300));

    // Track usage
    const promptText = history.map((m: any) => typeof m.content === "string" ? m.content : "").join("");
    trackUsage({
      userId: ownerId,
      conversationId: conv._id?.toString(),
      channel: msg.channel,
      provider: providerName,
      model: modelName,
      promptTokens: estimateTokens(promptText),
      completionTokens: estimateTokens(fullText),
      durationMs,
      success: true,
    });
    sysLogger.info(`Chat completed via ${msg.channel}`, {
      model: modelName, durationMs, responseLength: fullText.length,
    });
  } catch (e) {
    const durationMs = Date.now() - startTime;
    logErr("chat() FAILED:", e);
    trackUsage({
      userId: ownerId,
      channel: msg.channel,
      provider: providerName,
      model: modelName,
      durationMs,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    });
    sysLogger.error(`Chat failed via ${msg.channel}`, { error: String(e) });
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

    // Auto-compact if conversation is getting long + index for memory
    autoCompact(ownerId, conv._id.toString()).catch(() => {});
    indexConversation(ownerId, conv._id.toString()).catch(() => {});
  } catch (e) {
    logErr("Failed to save conversation:", e);
  }

  // Send reply back through channel
  // For groups, reply to the group JID; for DMs, reply to the sender
  const replyTarget = msg.isGroup && msg.groupId ? msg.groupId : msg.senderId;
  log("Sending reply back via", msg.channel, "to", replyTarget);
  switch (msg.channel) {
    case "whatsapp": {
      const sendResult = await sendWhatsAppMessage(ownerId, replyTarget, fullText);
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
    
    log("  Routing message...");
    const msgData = {
      channel: "whatsapp" as const,
      userId,
      senderId: msg.jid,
      senderName: msg.pushName,
      text: msg.text,
      imageBase64: msg.imageBase64,
      imageMime: msg.imageMime,
      isGroup: msg.isGroup,
      groupId: msg.groupId,
      isMentioned: msg.isMentioned,
      messageId: msg.messageId,
      remoteJid: msg.remoteJid,
    };

    // Try to enqueue to BullMQ (persistent, crash-safe); fall back to inline
    import("./message-queue").then(async ({ enqueueInbound }) => {
      const jobId = await enqueueInbound({ ...msgData, enqueuedAt: Date.now() });
      if (jobId) {
        log("  Enqueued to BullMQ: job", jobId);
      } else {
        // Redis not available — process inline
        routeMessage(msgData).then((reply) => {
          log("  routeMessage() completed. Reply length:", reply?.length);
        }).catch((err) => {
          logErr("  WhatsApp message routing FAILED:", err);
        });
      }
    }).catch(() => {
      // Fallback: process inline
      routeMessage(msgData).catch((err) => {
        logErr("  WhatsApp message routing FAILED:", err);
      });
    });
  });

  log("Message router initialized for user:", userId);
}
