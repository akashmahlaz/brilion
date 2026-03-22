import makeWASocket, {
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import type { ConnectionState } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { useMongoAuthState } from "./mongo-auth-state";

const log = (...args: unknown[]) => console.log("[wa-manager]", ...args);
const logErr = (...args: unknown[]) => console.error("[wa-manager]", ...args);

type WASocket = ReturnType<typeof makeWASocket>;

interface UserConnection {
  socket: WASocket | null;
  status: "disconnected" | "connecting" | "connected" | "failed";
  jid: string | null;
  clearAuthState: (() => Promise<void>) | null;
}

interface LoginSession {
  qrDataUrl: string | null;
  status: "waiting-qr" | "connected" | "failed" | "timeout";
  message: string;
  createdAt: number;
  userId: string;
  restartAttempted: boolean;
}

type MessageHandler = (userId: string, msg: {
  jid: string;
  text: string;
  pushName?: string;
  imageBase64?: string;
  imageMime?: string;
  isGroup: boolean;
  groupId?: string;
  senderJid?: string;
  isMentioned?: boolean;
  messageId?: string;
  remoteJid?: string;
}) => void;

const connections = new Map<string, UserConnection>();
const loginSessions = new Map<string, LoginSession>();
const messageHandlers: MessageHandler[] = [];

/** Track message IDs sent by our bot to prevent self-chat infinite loops */
const sentByUs = new Set<string>();

const LOGIN_TTL_MS = 3 * 60 * 1000;

// ── Error tracking: detect Bad MAC / decryption cascades ──
interface ErrorTracker {
  count: number;
  firstSeen: number;
  lastSeen: number;
}
const decryptionErrors = new Map<string, ErrorTracker>();
const DECRYPTION_ERROR_WINDOW_MS = 60_000; // 1 minute window
const DECRYPTION_ERROR_THRESHOLD = 5; // 5+ errors → trigger cleanup

function trackDecryptionError(userId: string): boolean {
  const now = Date.now();
  let tracker = decryptionErrors.get(userId);
  if (!tracker || now - tracker.firstSeen > DECRYPTION_ERROR_WINDOW_MS) {
    tracker = { count: 0, firstSeen: now, lastSeen: now };
    decryptionErrors.set(userId, tracker);
  }
  tracker.count++;
  tracker.lastSeen = now;
  return tracker.count >= DECRYPTION_ERROR_THRESHOLD;
}

function clearDecryptionErrors(userId: string): void {
  decryptionErrors.delete(userId);
}

// ── Outbound rate limiter — Redis-backed (falls back to in-memory) ──
const outboundTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 second window
const RATE_LIMIT_MAX = 10; // Max 10 messages per window per user

/** In-memory fallback rate limiter */
function checkRateLimitLocal(userId: string): boolean {
  const now = Date.now();
  let timestamps = outboundTimestamps.get(userId);
  if (!timestamps) {
    timestamps = [];
    outboundTimestamps.set(userId, timestamps);
  }
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  timestamps.push(now);
  return true;
}

/** Rate limiter: uses Redis if available, falls back to in-memory */
async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const { checkRedisRateLimit, isRedisConfigured } = await import("./redis");
    if (isRedisConfigured()) {
      return await checkRedisRateLimit(`rl:outbound:${userId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    }
  } catch {
    // Redis unavailable — fall through to local
  }
  return checkRateLimitLocal(userId);
}

/** Split long text into chunks at word/line boundaries */
function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Find a good split point: newline > space > maxLen
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen * 0.3) splitAt = remaining.lastIndexOf(" ", maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}

// ── Message debounce — batch rapid messages from same sender ──
const debounceTimers = new Map<string, NodeJS.Timeout>();
const debounceBuffer = new Map<string, Array<{
  userId: string;
  msg: Parameters<MessageHandler>[1];
}>>();
const DEBOUNCE_MS = 1500; // 1.5 second debounce window

function debounceMessage(
  key: string,
  userId: string,
  msg: Parameters<MessageHandler>[1],
  flush: (userId: string, msgs: Array<Parameters<MessageHandler>[1]>) => void,
): void {
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);

  let buffer = debounceBuffer.get(key);
  if (!buffer) {
    buffer = [];
    debounceBuffer.set(key, buffer);
  }
  buffer.push({ userId, msg });

  // Images/media skip debounce — flush immediately
  if (msg.imageBase64) {
    debounceTimers.delete(key);
    debounceBuffer.delete(key);
    flush(userId, buffer.map(b => b.msg));
    return;
  }

  const timer = setTimeout(() => {
    debounceTimers.delete(key);
    const buffered = debounceBuffer.get(key);
    debounceBuffer.delete(key);
    if (buffered && buffered.length > 0) {
      // Merge text from multiple rapid messages
      const merged = buffered.map(b => b.msg);
      flush(userId, merged);
    }
  }, DEBOUNCE_MS);
  debounceTimers.set(key, timer);
}

function getOrCreateConnection(userId: string): UserConnection {
  let conn = connections.get(userId);
  if (!conn) {
    conn = { socket: null, status: "disconnected", jid: null, clearAuthState: null };
    connections.set(userId, conn);
  }
  return conn;
}

async function connectForUser(userId: string, session?: LoginSession): Promise<void> {
  log("========== connectForUser() START ==========");
  log("userId:", userId);
  log("Has login session:", !!session);
  
  const conn = getOrCreateConnection(userId);
  conn.status = "connecting";

  log("Loading auth state from MongoDB...");
  const { state, saveCreds, clearState } = await useMongoAuthState(userId);
  conn.clearAuthState = clearState;
  log("Auth state loaded. Has creds:", !!state.creds);
  log("Creds registered:", state.creds.registered);
  
  const { version } = await fetchLatestBaileysVersion();
  log("Baileys version:", version);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys),
    },
    browser: ["Brilion", "Web", "1.0.0"],
    syncFullHistory: false,
    printQRInTerminal: false,
  });
  log("WASocket created");

  if (conn.socket) {
    log("Closing existing socket for user:", userId);
    conn.socket.end(undefined);
  }
  conn.socket = sock;

  sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = update;
    log(">>> connection.update for", userId, ":", JSON.stringify({ connection, hasQr: !!qr, hasLastDisconnect: !!lastDisconnect }));

    if (qr) {
      log("QR code received for user:", userId);
      if (session) {
        try {
          session.qrDataUrl = await QRCode.toDataURL(qr, {
            width: 300,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
          session.message = "Scan QR code with WhatsApp on your phone";
          log("QR data URL generated successfully");
        } catch (e) {
          session.message = "Failed to generate QR code";
          logErr("QR generation failed:", e);
        }
      } else {
        log("WARNING: QR received but no login session to store it in!");
      }
    }

    if (connection === "close") {
      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } }
      )?.output?.statusCode;
      log("Connection CLOSED for", userId, "statusCode:", statusCode);
      log("DisconnectReason.loggedOut =", DisconnectReason.loggedOut);
      log("Full lastDisconnect:", JSON.stringify(lastDisconnect, null, 2));

      if (statusCode === DisconnectReason.loggedOut || statusCode === 428 /* device_removed */) {
        log(statusCode === 428 ? "Device removed (428)" : "Logged out (401)", "— clearing auth for:", userId);
        conn.status = "failed";
        conn.socket = null;
        clearDecryptionErrors(userId);
        if (conn.clearAuthState) await conn.clearAuthState().catch(() => {});
        if (session) {
          session.status = "failed";
          session.message = statusCode === 428
            ? "Device removed. Please re-link WhatsApp."
            : "Logged out. Please restart login.";
        }
      } else if (statusCode === 515 && session && !session.restartAttempted) {
        log("Status 515 — pairing restart for user:", userId);
        session.restartAttempted = true;
        session.message = "Pairing successful, reconnecting...";
        try {
          await connectForUser(userId, session);
        } catch {
          conn.status = "failed";
          if (session) {
            session.status = "failed";
            session.message = "Reconnection failed after pairing.";
          }
        }
      } else {
        conn.status = "disconnected";
        conn.socket = null;
        if (session) {
          session.status = "failed";
          session.message = `Disconnected (code ${statusCode})`;
        }
      }
    }

    if (connection === "open") {
      conn.status = "connected";
      conn.jid = sock.user?.id || null;
      clearDecryptionErrors(userId);
      log("========== CONNECTION OPEN ==========");
      log("User:", userId);
      log("JID:", conn.jid);
      log("WhatsApp user info:", JSON.stringify(sock.user));

      // Cache connection status in Redis for cross-instance awareness
      import("./redis").then(({ cacheConnectionStatus }) => {
        cacheConnectionStatus(userId, "connected", conn.jid || undefined).catch(() => {});
      }).catch(() => {});
      
      if (session) {
        session.status = "connected";
        session.message = "WhatsApp connected successfully!";
      }

      // Auto-start message router
      log("Initializing message router for user:", userId);
      import("./router").then(({ initMessageRouter }) => {
        initMessageRouter(userId);
        log("Message router initialized for user:", userId);
        log("Current handler count:", messageHandlers.length);
      }).catch((e) => {
        logErr("FAILED to init message router:", e);
      });
    }
  });

  // Register message listener
  sock.ev.on("messages.upsert", async (update) => {
    log("========== messages.upsert ==========");
    log("User:", userId);
    log("Message count:", update.messages.length);
    log("Type:", update.type);
    log("Handler count:", messageHandlers.length);
    
    for (const msg of update.messages) {
      try {
      log("--- Message ---");
      log("  key:", JSON.stringify(msg.key));
      log("  fromMe:", msg.key.fromMe);
      log("  remoteJid:", msg.key.remoteJid);
      log("  pushName:", msg.pushName);
      log("  messageType:", msg.message ? Object.keys(msg.message).join(", ") : "null");

      // Skip messages sent by our own bot to prevent infinite loops
      if (msg.key.id && sentByUs.has(msg.key.id)) {
        log("  SKIPPED: message sent by our bot (id:", msg.key.id, ")");
        continue;
      }
      
      if (msg.key.fromMe) {
        // Allow self-chat: user messaging their own WhatsApp number
        // Normalize JIDs: strip device suffix AND handle LID format
        // e.g. "123:5@s.whatsapp.net" → "123@s.whatsapp.net"
        const normalizeJid = (jid: string) =>
          jid.replace(/:\d+@/, "@").split("@")[0];
        const ownJid = conn.jid ? normalizeJid(conn.jid) : "";
        const remoteJid = msg.key.remoteJid ? normalizeJid(msg.key.remoteJid) : "";
        const isSelfChat = ownJid && remoteJid === ownJid;
        if (!isSelfChat) {
          log("  SKIPPED: fromMe=true (not self-chat, own:", ownJid, "remote:", remoteJid, ")");
          continue;
        }
        log("  ALLOWED: self-chat message (fromMe=true, remoteJid matches own JID)");
      }
      
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";
      
      // Check for media messages (image, audio, video, document, sticker)
      const imageMsg = msg.message?.imageMessage;
      const audioMsg = msg.message?.audioMessage;
      const videoMsg = msg.message?.videoMessage;
      const documentMsg = msg.message?.documentMessage;
      const stickerMsg = msg.message?.stickerMessage;
      let imageBase64: string | undefined;
      let imageMime: string | undefined;
      let mediaType: string | undefined;
      let mediaFileName: string | undefined;

      const mediaSource = imageMsg || audioMsg || videoMsg || documentMsg || stickerMsg;
      if (mediaSource) {
        try {
          mediaType = imageMsg ? "image" : audioMsg ? "audio" : videoMsg ? "video" : stickerMsg ? "sticker" : "document";
          mediaFileName = documentMsg?.fileName || undefined;
          log(`  Downloading ${mediaType} media...`);
          const buffer = await downloadMediaMessage(msg, "buffer", {});
          imageBase64 = Buffer.from(buffer as Buffer).toString("base64");
          imageMime = mediaSource.mimetype || (imageMsg ? "image/jpeg" : audioMsg ? "audio/ogg" : videoMsg ? "video/mp4" : stickerMsg ? "image/webp" : "application/octet-stream");
          log(`  ${mediaType} downloaded:`, Math.round((imageBase64.length * 3) / 4 / 1024), "KB", imageMime);
        } catch (e) {
          logErr(`  Failed to download ${mediaType}:`, e);
        }
      }

      const caption = imageMsg?.caption || videoMsg?.caption || audioMsg?.caption || "";

      log("  Extracted text:", text ? `"${text.substring(0, 100)}"` : "null/empty");
      
      if (!text && !imageBase64) {
        log("  SKIPPED: no text or media content");
        log("  Full message object keys:", msg.message ? Object.keys(msg.message).join(", ") : "null");
        continue;
      }
      
      if (!msg.key.remoteJid) {
        log("  SKIPPED: no remoteJid");
        continue;
      }

      log("  >>> Dispatching to", messageHandlers.length, "handlers");

      // Detect group messages (JID ends with @g.us)
      const remoteJid = msg.key.remoteJid!;
      const isGroup = remoteJid.endsWith("@g.us");
      // In groups, participant is the actual sender; in DMs, it's the remoteJid
      const senderJid = isGroup ? (msg.key.participant || remoteJid) : remoteJid;
      // Check if bot was @mentioned in the message
      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const isMentioned = conn.jid
        ? mentionedJids.some((m: string) =>
            m.replace(/:\d+@/, "@") === conn.jid!.replace(/:\d+@/, "@")
          )
        : false;

      log("  isGroup:", isGroup, "senderJid:", senderJid, "isMentioned:", isMentioned);

      // Build descriptive text for non-image media
      const mediaDescription = !text && imageBase64 && mediaType && mediaType !== "image"
        ? `[User sent ${mediaType === "document" ? `a document: ${mediaFileName || "file"}` : `${mediaType}`}]`
        : "";

      const handlerMsg = {
        jid: senderJid,
        text: text || caption || (imageBase64 ? (mediaType === "image" ? "[User sent an image]" : mediaDescription) : ""),
        pushName: msg.pushName || undefined,
        imageBase64,
        imageMime,
        isGroup,
        groupId: isGroup ? remoteJid : undefined,
        senderJid,
        isMentioned,
        messageId: msg.key.id || undefined,
        remoteJid,
      };

      // Debounce: batch rapid messages from same sender (1.5s window)
      const debounceKey = `${userId}:${senderJid}`;
      debounceMessage(debounceKey, userId, handlerMsg, (_uid, msgs) => {
        // Merge debounced messages: concatenate text, keep latest metadata
        const merged = { ...msgs[msgs.length - 1] };
        if (msgs.length > 1) {
          merged.text = msgs.map(m => m.text).filter(Boolean).join("\n");
        }
        for (let i = 0; i < messageHandlers.length; i++) {
          log("  Calling handler", i, "(debounced, merged", msgs.length, "msgs)");
          try {
            messageHandlers[i](_uid, merged);
            log("  Handler", i, "called successfully");
          } catch (e) {
            logErr("  Handler", i, "threw error:", e);
          }
        }
      });
      } catch (msgErr) {
        // Catch Bad MAC, decryption, and other per-message errors gracefully
        const errStr = String(msgErr);
        const isBadMac = /bad mac|decrypt|hmac|signal/i.test(errStr);
        if (isBadMac) {
          const shouldCleanup = trackDecryptionError(userId);
          log("  Decryption error (Bad MAC) suppressed for user:", userId, "count:", decryptionErrors.get(userId)?.count);
          if (shouldCleanup) {
            logErr("  Too many decryption errors — clearing auth state and disconnecting:", userId);
            clearDecryptionErrors(userId);
            conn.status = "failed";
            if (conn.clearAuthState) await conn.clearAuthState().catch(() => {});
            sock.end(undefined);
            conn.socket = null;
          }
        } else {
          logErr("  Unexpected error processing message:", msgErr);
        }
      }
    }
  });

  sock.ev.on("creds.update", () => {
    log("Creds updated for user:", userId);
    saveCreds();
  });
  
  log("All event listeners registered for user:", userId);
}

// ── Public API ──

export async function startQrLogin(userId: string) {
  log("========== startQrLogin() ==========");
  log("userId:", userId);
  
  const sessionId = `wa-${userId}-${Date.now()}`;
  const session: LoginSession = {
    qrDataUrl: null,
    status: "waiting-qr",
    message: "Initializing WhatsApp connection...",
    createdAt: Date.now(),
    userId,
    restartAttempted: false,
  };
  loginSessions.set(sessionId, session);
  log("Login session created:", sessionId);

  setTimeout(() => {
    const s = loginSessions.get(sessionId);
    if (s && s.status === "waiting-qr") {
      log("Login session EXPIRED:", sessionId);
      s.status = "timeout";
      s.message = "Login session expired. Start a new one.";
      const conn = connections.get(userId);
      if (conn?.socket) {
        conn.socket.end(undefined);
        conn.socket = null;
        conn.status = "disconnected";
      }
    }
    loginSessions.delete(sessionId);
  }, LOGIN_TTL_MS);

  try {
    await connectForUser(userId, session);
    log("Waiting 2s for QR to generate...");
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    log("QR login result:", { sessionId, hasQr: !!session.qrDataUrl, status: session.status, message: session.message });
    return {
      sessionId,
      qrDataUrl: session.qrDataUrl,
      message: session.message,
    };
  } catch (err) {
    logErr("startQrLogin FAILED:", err);
    session.status = "failed";
    session.message = `Failed to start: ${err instanceof Error ? err.message : String(err)}`;
    return { sessionId, qrDataUrl: null, message: session.message };
  }
}

export function getLoginStatus(sessionId: string) {
  const session = loginSessions.get(sessionId);
  log("getLoginStatus():", sessionId, session ? session.status : "NOT FOUND");
  if (!session)
    return {
      qrDataUrl: null,
      status: "not-found",
      message: "Session not found or expired",
    };
  return {
    qrDataUrl: session.qrDataUrl,
    status: session.status,
    message: session.message,
  };
}

export function isWhatsAppConnected(userId: string): boolean {
  const conn = connections.get(userId);
  const result = conn?.status === "connected" && conn.socket !== null;
  log("isWhatsAppConnected():", userId, "=", result, "(status:", conn?.status, "hasSocket:", !!conn?.socket, ")");
  return result;
}

export function getStatus(userId: string): string {
  return connections.get(userId)?.status || "disconnected";
}

export function getOwnerJid(userId: string): string | null {
  return connections.get(userId)?.jid || null;
}

export async function send(userId: string, jid: string, text: string) {
  log("========== send() ==========");
  log("userId:", userId, "jid:", jid, "text length:", text.length);
  log("text preview:", text.substring(0, 200));
  
  // Outbound rate limiting (Redis-backed, falls back to in-memory)
  const allowed = await checkRateLimit(userId);
  if (!allowed) {
    logErr("SEND RATE LIMITED: userId:", userId, "jid:", jid);
    return { status: "error", error: "Rate limited — too many messages sent. Try again shortly." };
  }

  const conn = connections.get(userId);
  if (!conn?.socket || conn.status !== "connected") {
    logErr("SEND FAILED: not connected. status:", conn?.status, "hasSocket:", !!conn?.socket);
    return { status: "error", error: "WhatsApp not connected" };
  }

  // Split long messages into chunks (WhatsApp ~4096 char practical limit)
  const chunks = chunkText(text, 4000);
  
  try {
    for (let i = 0; i < chunks.length; i++) {
      log(`Calling socket.sendMessage (chunk ${i + 1}/${chunks.length})...`);
      const sent = await conn.socket.sendMessage(jid, { text: chunks[i] });
      if (sent?.key?.id) {
        sentByUs.add(sent.key.id);
        setTimeout(() => sentByUs.delete(sent.key.id!), 30_000);
      }
      // Brief delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    log("Message SENT successfully to", jid, `(${chunks.length} chunk${chunks.length > 1 ? 's' : ''})`);
    return { status: "sent" };
  } catch (err) {
    logErr("SEND ERROR:", err);
    // Exponential backoff retry (max 3 attempts)
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 8000);
      log(`Retry attempt ${attempt}/${MAX_RETRIES} after ${Math.round(backoffMs)}ms...`);
      await new Promise(r => setTimeout(r, backoffMs));
      try {
        // Re-check connection (may have dropped during backoff)
        if (!conn.socket || conn.status !== "connected") break;
        const sent = await conn.socket.sendMessage(jid, { text: chunks.length === 1 ? text : chunks[0] });
        if (sent?.key?.id) {
          sentByUs.add(sent.key.id);
          setTimeout(() => sentByUs.delete(sent.key.id!), 30_000);
        }
        log(`Retry ${attempt} SUCCEEDED`);
        return { status: "sent" };
      } catch (retryErr) {
        logErr(`Retry ${attempt} failed:`, retryErr);
      }
    }
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Send "composing..." typing indicator before replying */
export async function sendComposing(userId: string, jid: string): Promise<void> {
  const conn = connections.get(userId);
  if (!conn?.socket || conn.status !== "connected") return;
  try {
    await conn.socket.sendPresenceUpdate("composing", jid);
  } catch (e) {
    log("sendComposing failed (non-fatal):", e);
  }
}

/** Send read receipt for a message */
export async function markRead(
  userId: string,
  remoteJid: string,
  messageId: string,
  participant?: string
): Promise<void> {
  const conn = connections.get(userId);
  if (!conn?.socket || conn.status !== "connected") return;
  try {
    await conn.socket.readMessages([
      { remoteJid, id: messageId, ...(participant ? { participant } : {}) },
    ]);
  } catch (e) {
    log("markRead failed (non-fatal):", e);
  }
}

/** Send a reaction emoji to a message */
export async function sendReaction(
  userId: string,
  remoteJid: string,
  messageId: string,
  emoji: string,
  participant?: string,
): Promise<void> {
  const conn = connections.get(userId);
  if (!conn?.socket || conn.status !== "connected") return;
  try {
    await conn.socket.sendMessage(remoteJid, {
      react: {
        text: emoji,
        key: {
          remoteJid,
          id: messageId,
          ...(participant ? { participant } : {}),
        },
      },
    });
    log("Reaction sent:", emoji, "to", messageId);
  } catch (e) {
    log("sendReaction failed (non-fatal):", e);
  }
}

/** Delete / revoke a message we sent */
export async function deleteMessage(
  userId: string,
  remoteJid: string,
  messageId: string,
): Promise<void> {
  const conn = connections.get(userId);
  if (!conn?.socket || conn.status !== "connected") return;
  try {
    await conn.socket.sendMessage(remoteJid, {
      delete: {
        remoteJid,
        id: messageId,
        fromMe: true,
      },
    });
    log("Message deleted:", messageId);
  } catch (e) {
    log("deleteMessage failed (non-fatal):", e);
  }
}

/** Edit a message we previously sent */
export async function editMessage(
  userId: string,
  remoteJid: string,
  messageId: string,
  newText: string,
): Promise<void> {
  const conn = connections.get(userId);
  if (!conn?.socket || conn.status !== "connected") return;
  try {
    await conn.socket.sendMessage(remoteJid, {
      text: newText,
      edit: {
        remoteJid,
        id: messageId,
        fromMe: true,
      },
    });
    log("Message edited:", messageId);
  } catch (e) {
    log("editMessage failed (non-fatal):", e);
  }
}

export async function disconnect(userId: string): Promise<void> {
  log("disconnect() userId:", userId);
  const conn = connections.get(userId);
  if (conn?.socket) {
    conn.socket.end(undefined);
    conn.socket = null;
    conn.status = "disconnected";
  }
}

export async function logout(userId: string): Promise<void> {
  log("logout() userId:", userId);
  const conn = connections.get(userId);
  try {
    await conn?.socket?.logout();
  } catch (e) {
    logErr("logout error:", e);
  }
  if (conn) {
    conn.socket = null;
    conn.status = "disconnected";
    if (conn.clearAuthState) await conn.clearAuthState().catch(() => {});
  }
}

export function onMessage(handler: MessageHandler): () => void {
  messageHandlers.push(handler);
  log("onMessage() handler registered. Total handlers:", messageHandlers.length);
  return () => {
    const idx = messageHandlers.indexOf(handler);
    if (idx >= 0) messageHandlers.splice(idx, 1);
  };
}

/**
 * Reconnect a user's WhatsApp session from stored auth state.
 * Used at server startup.
 */
export async function reconnect(userId: string): Promise<void> {
  log("========== reconnect() ==========");
  log("Reconnecting stored session for:", userId);
  try {
    await connectForUser(userId);
    log("Reconnect initiated for:", userId);
  } catch (e) {
    logErr("Reconnect FAILED for", userId, ":", e);
  }
}

export function getConnectedUserIds(): string[] {
  return Array.from(connections.entries())
    .filter(([, c]) => c.status === "connected")
    .map(([id]) => id);
}
