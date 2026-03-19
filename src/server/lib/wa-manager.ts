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

type MessageHandler = (userId: string, msg: { jid: string; text: string; pushName?: string; imageBase64?: string; imageMime?: string }) => void;

const connections = new Map<string, UserConnection>();
const loginSessions = new Map<string, LoginSession>();
const messageHandlers: MessageHandler[] = [];

const LOGIN_TTL_MS = 3 * 60 * 1000;

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

      if (statusCode === DisconnectReason.loggedOut) {
        conn.status = "failed";
        conn.socket = null;
        if (conn.clearAuthState) await conn.clearAuthState().catch(() => {});
        if (session) {
          session.status = "failed";
          session.message = "Logged out. Please restart login.";
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
      log("========== CONNECTION OPEN ==========");
      log("User:", userId);
      log("JID:", conn.jid);
      log("WhatsApp user info:", JSON.stringify(sock.user));
      
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
  sock.ev.on("messages.upsert", (update) => {
    log("========== messages.upsert ==========");
    log("User:", userId);
    log("Message count:", update.messages.length);
    log("Type:", update.type);
    log("Handler count:", messageHandlers.length);
    
    for (const msg of update.messages) {
      log("--- Message ---");
      log("  key:", JSON.stringify(msg.key));
      log("  fromMe:", msg.key.fromMe);
      log("  remoteJid:", msg.key.remoteJid);
      log("  pushName:", msg.pushName);
      log("  messageType:", msg.message ? Object.keys(msg.message).join(", ") : "null");
      
      if (msg.key.fromMe) {
        log("  SKIPPED: fromMe=true");
        continue;
      }
      
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";
      
      // Check for image message
      const imageMsg = msg.message?.imageMessage;
      let imageBase64: string | undefined;
      let imageMime: string | undefined;

      if (imageMsg) {
        try {
          log("  Downloading image media...");
          const buffer = await downloadMediaMessage(msg, "buffer", {});
          imageBase64 = Buffer.from(buffer as Buffer).toString("base64");
          imageMime = imageMsg.mimetype || "image/jpeg";
          log("  Image downloaded:", Math.round((imageBase64.length * 3) / 4 / 1024), "KB", imageMime);
        } catch (e) {
          logErr("  Failed to download image:", e);
        }
      }

      log("  Extracted text:", text ? `"${text.substring(0, 100)}"` : "null/empty");
      
      if (!text && !imageBase64) {
        log("  SKIPPED: no text or image content");
        log("  Full message object keys:", msg.message ? Object.keys(msg.message).join(", ") : "null");
        continue;
      }
      
      if (!msg.key.remoteJid) {
        log("  SKIPPED: no remoteJid");
        continue;
      }

      log("  >>> Dispatching to", messageHandlers.length, "handlers");
      for (let i = 0; i < messageHandlers.length; i++) {
        log("  Calling handler", i);
        try {
          messageHandlers[i](userId, {
            jid: msg.key.remoteJid,
            text: text || (imageBase64 ? "[User sent an image]" : ""),
            pushName: msg.pushName || undefined,
            imageBase64,
            imageMime,
          });
          log("  Handler", i, "called successfully");
        } catch (e) {
          logErr("  Handler", i, "threw error:", e);
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

export async function send(userId: string, jid: string, text: string) {
  log("========== send() ==========");
  log("userId:", userId, "jid:", jid, "text length:", text.length);
  log("text preview:", text.substring(0, 200));
  
  const conn = connections.get(userId);
  if (!conn?.socket || conn.status !== "connected") {
    logErr("SEND FAILED: not connected. status:", conn?.status, "hasSocket:", !!conn?.socket);
    return { status: "error", error: "WhatsApp not connected" };
  }
  try {
    log("Calling socket.sendMessage...");
    await conn.socket.sendMessage(jid, { text });
    log("Message SENT successfully to", jid);
    return { status: "sent" };
  } catch (err) {
    logErr("SEND ERROR:", err);
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
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
