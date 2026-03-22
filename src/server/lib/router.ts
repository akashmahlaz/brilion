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
  log("╔══════════════════════════════════════╗");
  log("║       routeMessage() START           ║");
  log("╚══════════════════════════════════════╝");
  log(`[route] Channel: ${msg.channel}`);
  log(`[route] UserId: ${msg.userId}`);
  log(`[route] SenderId: ${msg.senderId}`);
  log(`[route] SenderName: ${msg.senderName || "(none)"}`);
  log(`[route] Text: "${msg.text?.substring(0, 200)}" (${msg.text?.length || 0} chars)`);
  log(`[route] isGroup: ${msg.isGroup} | groupId: ${msg.groupId || "(none)"}`);
  log(`[route] hasImage: ${!!msg.imageBase64} | messageId: ${msg.messageId || "(none)"}`);
  
  await connectDB();

  const ownerId = msg.userId;
  
  log("[route] Loading config for userId:", ownerId);
  const config = await loadConfig(ownerId);
  log("[route] Config loaded:", !!config, "config.userId:", config?.userId);
  
  if (!config || !config.userId) {
    logErr("[route] ❌ NO CONFIG for userId:", ownerId, "— user must open dashboard first");
    return "[error] Agent not configured yet. Open the dashboard first.";
  }

  // Check channel permissions
  const channelCfg = config.channels?.[msg.channel] as ChannelConfig | undefined;
  log("[route] Channel config:", JSON.stringify({
    enabled: channelCfg?.enabled,
    dmPolicy: channelCfg?.dmPolicy,
    selfChatMode: config.channels?.whatsapp?.selfChatMode,
    groupPolicy: channelCfg?.groupPolicy,
  }));

  // --- Access control hierarchy (OpenClaw-style) ---
  let isSelfChat = false;

  // Step 1: Self-chat detection (owner bypass)
  if (msg.channel === "whatsapp") {
    const { getOwnerJid } = await import("./wa-manager");
    const ownerJid = getOwnerJid(ownerId);
    isSelfChat = ownerJid
      ? normalizeJid(msg.senderId) === normalizeJid(ownerJid)
      : false;
    log(`[route] Self-chat: senderId="${normalizeJid(msg.senderId)}" ownerJid="${ownerJid ? normalizeJid(ownerJid) : "null"}" → isSelfChat=${isSelfChat}`);

    if (isSelfChat) {
      const selfChatEnabled = config.channels?.whatsapp?.selfChatMode !== false;
      if (!selfChatEnabled) {
        log("[route] ❌ BLOCKED: selfChatMode is disabled in config");
        return "[blocked] Self-chat mode is disabled.";
      }
      log("[route] ✅ Self-chat ALLOWED — bypassing access control");
    }
  }

  // Step 2: Channel access control (if not self-chat)
  if (!isSelfChat && channelCfg) {
    const access = resolveAccess(msg.senderId, channelCfg, {
      isGroup: msg.isGroup,
      groupId: msg.groupId,
    });
    log(`[route] Access decision: allowed=${access.allowed}${!access.allowed ? ` reason=${(access as any).reason}` : ""}`);

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
        log("[route] 🔗 Pairing challenge issued:", pairing.code, "alreadyPending:", pairing.alreadyPending);

        if (msg.channel === "whatsapp") {
          await sendWhatsAppMessage(ownerId, msg.senderId, pairing.message);
        }
        return "[pairing] Challenge issued.";
      }

      // Blocked
      const blockMsg = `[blocked] ${access.reason}`;
      log("[route] ❌ BLOCKED:", blockMsg);
      if (msg.channel === "whatsapp") {
        await sendWhatsAppMessage(ownerId, msg.senderId, blockMsg);
      }
      return blockMsg;
    }
  } else if (!isSelfChat && !channelCfg) {
    // OpenClaw-style: default to BLOCKING when no channel config exists.
    // Only self-chat is allowed without explicit channel configuration.
    log("[route] ❌ BLOCKED: No channel config found — blocking by default (only self-chat allowed without config)");
    return "[blocked] Channel not configured. Set up channel policies in the dashboard.";
  }

  // Step 3: Group activation gating (mention/command modes)
  if (msg.isGroup && channelCfg) {
    const groupPolicy = channelCfg.groupPolicy ?? "disabled";
    // In "disabled" mode, all group messages are already blocked by resolveAccess
    // In "mention" or non-"open" modes, require @mention or /command
    if (groupPolicy !== "open" && !msg.isMentioned && !msg.text.startsWith("/")) {
      log("[route] Group message skipped: not @mentioned and not a /command");
      return "[skipped] Group message — not mentioned.";
    }
  }

  // Handle chat commands
  if (msg.text.startsWith("/")) {
    log("[route] Processing chat command:", msg.text);
    const cmdResult = await handleChatCommand(msg.text, msg, ownerId);
    if (cmdResult !== null) {
      log("[route] Command result:", cmdResult);
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
  log(`[route] Conversation lookup: channel=${msg.channel} foreignId=${conversationKey}`);
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
    
    log("[route] No existing conversation — creating new one");
    conv = await Conversation.create({
      userId: ownerId,
      channel: msg.channel,
      foreignId: conversationKey,
      title,
      messages: [],
      model: config.agents?.defaults?.model?.primary || "gpt-4o",
    });
    log(`[route] Created conversation: ${conv._id} title="${title}"`);
  } else {
    log(`[route] Found existing conversation: ${conv._id} messages=${conv.messages?.length}`);
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
  log(`[route] Message history: ${history.length} messages (last 20 + current)`);

  // Get agent config (model + tools + system prompt)
  log("[route] Getting agent config...");
  let agentConfig;
  try {
    agentConfig = await getAgentConfig(ownerId);
    log(`[route] Agent config ready — adapter=${(agentConfig.adapter as any)?.model || "unknown"}, tools=[${Object.keys(agentConfig.tools || {}).join(", ")}], systemPromptLen=${agentConfig.systemPrompts?.[0]?.length || 0}`);
  } catch (e) {
    logErr("[route] ❌ getAgentConfig FAILED:", e);
    const errMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
    if (msg.channel === "whatsapp") {
      await sendWhatsAppMessage(ownerId, msg.senderId, errMsg);
    }
    return errMsg;
  }

  // Check for model override on conversation
  let adapterOverride;
  if (conv.model && conv.model !== config.agents?.defaults?.model?.primary) {
    log("[route] Conversation has model override:", conv.model);
    try {
      const { resolveModel } = await import("./providers");
      adapterOverride = await resolveModel(conv.model, ownerId);
      log("[route] Model override resolved");
    } catch (e) {
      log("[route] Model override failed, using default:", e);
    }
  }

  // Send typing indicator before AI processes (OpenClaw-style)
  if (msg.channel === "whatsapp") {
    const replyJid = msg.isGroup && msg.groupId ? msg.groupId : msg.senderId;
    sendComposing(ownerId, replyJid).catch(() => {});
  }

  // Call AI via TanStack AI chat()
  log(`[route] 🤖 Calling chat() — model=${modelName} provider=${providerName}...`);
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
    log(`[route] ✅ AI response: ${fullText.length} chars in ${durationMs}ms`);
    log(`[route] Preview: "${fullText.substring(0, 200)}"`);

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
    logErr("[route] ❌ chat() FAILED:", e);
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
  log("[route] Saving messages to conversation...");
  try {
    conv.messages.push(
      { role: "user", content: msg.text },
      { role: "assistant", content: fullText }
    );
    await conv.save();
    log(`[route] Conversation saved. Total messages: ${conv.messages.length}`);

    // Auto-compact if conversation is getting long + index for memory
    autoCompact(ownerId, conv._id.toString()).catch(() => {});
    indexConversation(ownerId, conv._id.toString()).catch(() => {});
  } catch (e) {
    logErr("[route] ❌ Failed to save conversation:", e);
  }

  // Send reply back through channel
  // For groups, reply to the group JID; for DMs, reply to the sender
  const replyTarget = msg.isGroup && msg.groupId ? msg.groupId : msg.senderId;
  log(`[route] 📤 Sending reply via ${msg.channel} to ${replyTarget} (${fullText.length} chars)`);
  switch (msg.channel) {
    case "whatsapp": {
      const sendResult = await sendWhatsAppMessage(ownerId, replyTarget, fullText);
      log(`[route] WhatsApp send result: ${JSON.stringify(sendResult)}`);
      break;
    }
    case "telegram":
      log("Telegram reply handled by caller (telegram.ts)");
      break;
  }

  log("[route] ════════ routeMessage() DONE ════════");
  return fullText;
}

const _initializedUsers = new Set<string>();

export async function initMessageRouter(userId: string): Promise<void> {
  if (_initializedUsers.has(userId)) {
    log("[router] initMessageRouter() SKIPPED — already initialized for:", userId);
    return;
  }
  _initializedUsers.add(userId);
  log("[router] ════════ initMessageRouter() ════════");
  log("[router] Registering WhatsApp message handler for user:", userId);

  onWhatsAppMessage((ownerUserId, msg) => {
    log("[router] >>> onWhatsAppMessage callback fired");
    log(`[router]   ownerUserId=${ownerUserId} expected=${userId}`);
    log(`[router]   jid=${msg.jid} text="${msg.text?.substring(0, 80)}" pushName=${msg.pushName || "(none)"}`);
    log(`[router]   isGroup=${msg.isGroup} remoteJid=${msg.remoteJid || "(none)"} messageId=${msg.messageId || "(none)"}`);
    
    if (ownerUserId !== userId) {
      log("[router]   ⏭ SKIP: wrong user (ownerUserId !== userId)");
      return;
    }
    
    log("[router]   ✅ User matched — routing message...");
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
        log(`[router]   📦 Enqueued to BullMQ: job ${jobId}`);
      } else {
        // Redis not available — process inline
        log("[router]   ⚡ Redis unavailable — processing inline");
        routeMessage(msgData).then((reply) => {
          log(`[router]   ✅ routeMessage() done. Reply: ${reply?.length || 0} chars`);
        }).catch((err) => {
          logErr("[router]   ❌ routeMessage() FAILED:", err);
        });
      }
    }).catch((err) => {
      // Fallback: process inline
      logErr("[router]   ❌ BullMQ import failed — processing inline:", err);
      routeMessage(msgData).catch((err2) => {
        logErr("[router]   ❌ routeMessage() FAILED:", err2);
      });
    });
  });

  log("[router] ✅ Message router initialized for user:", userId);
}
