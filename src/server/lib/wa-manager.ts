import makeWASocket, {
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
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

type MessageHandler = (userId: string, msg: { jid: string; text: string; pushName?: string }) => void;

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
  log("connectForUser():", userId);
  const conn = getOrCreateConnection(userId);
  conn.status = "connecting";

  const { state, saveCreds, clearState } = await useMongoAuthState(userId);
  conn.clearAuthState = clearState;
  const { version } = await fetchLatestBaileysVersion();

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

  if (conn.socket) conn.socket.end(undefined);
  conn.socket = sock;

  sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && session) {
      try {
        session.qrDataUrl = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        session.message = "Scan QR code with WhatsApp on your phone";
      } catch (e) {
        session.message = "Failed to generate QR code";
        logErr("QR generation failed:", e);
      }
    }

    if (connection === "close") {
      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } }
      )?.output?.statusCode;
      log("Connection closed for", userId, "code:", statusCode);

      if (statusCode === DisconnectReason.loggedOut) {
        conn.status = "failed";
        conn.socket = null;
        if (conn.clearAuthState) await conn.clearAuthState().catch(() => {});
        if (session) {
          session.status = "failed";
          session.message = "Logged out. Please restart login.";
        }
      } else if (statusCode === 515 && session && !session.restartAttempted) {
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
      log("Connected for user:", userId, "jid:", conn.jid);
      if (session) {
        session.status = "connected";
        session.message = "WhatsApp connected successfully!";
      }

      // Auto-start message router
      import("./router").then(({ initMessageRouter }) => {
        initMessageRouter(userId);
      }).catch((e) => {
        logErr("Failed to init message router:", e);
      });
    }
  });

  // Register message listener
  sock.ev.on("messages.upsert", (update) => {
    for (const msg of update.messages) {
      if (msg.key.fromMe) continue;
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text;
      if (text && msg.key.remoteJid) {
        for (const handler of messageHandlers) {
          handler(userId, {
            jid: msg.key.remoteJid,
            text,
            pushName: msg.pushName || undefined,
          });
        }
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// ── Public API ──

export async function startQrLogin(userId: string) {
  log("startQrLogin() for user:", userId);
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

  setTimeout(() => {
    const s = loginSessions.get(sessionId);
    if (s && s.status === "waiting-qr") {
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
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    return {
      sessionId,
      qrDataUrl: session.qrDataUrl,
      message: session.message,
    };
  } catch (err) {
    logErr("startQrLogin error:", err);
    session.status = "failed";
    session.message = `Failed to start: ${err instanceof Error ? err.message : String(err)}`;
    return { sessionId, qrDataUrl: null, message: session.message };
  }
}

export function getLoginStatus(sessionId: string) {
  const session = loginSessions.get(sessionId);
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
  return conn?.status === "connected" && conn.socket !== null;
}

export function getStatus(userId: string): string {
  return connections.get(userId)?.status || "disconnected";
}

export async function send(userId: string, jid: string, text: string) {
  const conn = connections.get(userId);
  if (!conn?.socket || conn.status !== "connected") {
    return { status: "error", error: "WhatsApp not connected" };
  }
  try {
    await conn.socket.sendMessage(jid, { text });
    return { status: "sent" };
  } catch (err) {
    logErr("send error:", err);
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function disconnect(userId: string): Promise<void> {
  const conn = connections.get(userId);
  if (conn?.socket) {
    conn.socket.end(undefined);
    conn.socket = null;
    conn.status = "disconnected";
  }
}

export async function logout(userId: string): Promise<void> {
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
  log("Reconnecting stored session for:", userId);
  try {
    await connectForUser(userId);
  } catch (e) {
    logErr("Reconnect failed for", userId, ":", e);
  }
}

export function getConnectedUserIds(): string[] {
  return Array.from(connections.entries())
    .filter(([, c]) => c.status === "connected")
    .map(([id]) => id);
}
