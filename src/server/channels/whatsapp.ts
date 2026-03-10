import makeWASocket, {
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import type { ConnectionState } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { useMongoAuthState } from "../lib/mongo-auth-state";

interface LoginSession {
  qrDataUrl: string | null;
  status: "waiting-qr" | "connected" | "failed" | "timeout";
  message: string;
  createdAt: number;
  socket: ReturnType<typeof makeWASocket> | null;
  restartAttempted: boolean;
}

const activeSessions = new Map<string, LoginSession>();
const LOGIN_TTL_MS = 3 * 60 * 1000;

let connectedSocket: ReturnType<typeof makeWASocket> | null = null;
let clearAuthState: (() => Promise<void>) | null = null;

async function connectSocket(
  session: LoginSession,
  sessionId: string
): Promise<void> {
  const { state, saveCreds, clearState } = await useMongoAuthState();
  clearAuthState = clearState;
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys),
    },
    browser: ["MyAI", "Web", "1.0.0"],
    syncFullHistory: false,
    printQRInTerminal: false,
  });

  if (session.socket) session.socket.end(undefined);
  session.socket = sock;

  sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        session.qrDataUrl = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        session.message = "Scan QR code with WhatsApp on your phone";
      } catch {
        session.message = "Failed to generate QR code";
      }
    }

    if (connection === "close") {
      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } }
      )?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        session.status = "failed";
        session.message = "Logged out. Please restart login.";
        if (clearAuthState) await clearAuthState().catch(() => {});
      } else if (statusCode === 515 && !session.restartAttempted) {
        session.restartAttempted = true;
        session.message = "Pairing successful, reconnecting...";
        try {
          await connectSocket(session, sessionId);
        } catch {
          session.status = "failed";
          session.message = "Reconnection failed after pairing.";
        }
      } else {
        session.status = "failed";
        session.message = `Disconnected (code ${statusCode})`;
      }
    }

    if (connection === "open") {
      session.status = "connected";
      session.message = "WhatsApp connected successfully!";
      connectedSocket = sock;
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

export async function startQrLogin() {
  const sessionId = `wa-${Date.now()}`;
  const session: LoginSession = {
    qrDataUrl: null,
    status: "waiting-qr",
    message: "Initializing WhatsApp connection...",
    createdAt: Date.now(),
    socket: null,
    restartAttempted: false,
  };
  activeSessions.set(sessionId, session);

  setTimeout(() => {
    const s = activeSessions.get(sessionId);
    if (s && s.status === "waiting-qr") {
      s.status = "timeout";
      s.message = "Login session expired. Start a new one.";
      s.socket?.end(undefined);
    }
    activeSessions.delete(sessionId);
  }, LOGIN_TTL_MS);

  try {
    await connectSocket(session, sessionId);
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    return {
      sessionId,
      qrDataUrl: session.qrDataUrl,
      message: session.message,
    };
  } catch (err) {
    session.status = "failed";
    session.message = `Failed to start: ${err instanceof Error ? err.message : String(err)}`;
    return { sessionId, qrDataUrl: null, message: session.message };
  }
}

export function getLoginStatus(sessionId: string) {
  const session = activeSessions.get(sessionId);
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

export function isWhatsAppConnected(): boolean {
  return connectedSocket !== null;
}

export function getWhatsAppSocket() {
  return connectedSocket;
}

export async function sendWhatsAppMessage(jid: string, text: string) {
  if (!connectedSocket)
    return { status: "error", error: "WhatsApp not connected" };
  try {
    await connectedSocket.sendMessage(jid, { text });
    return { status: "sent" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function onWhatsAppMessage(
  handler: (msg: { jid: string; text: string; pushName?: string }) => void
): () => void {
  if (!connectedSocket) return () => {};
  const listener = (update: {
    messages: Array<{
      key: { remoteJid?: string | null; fromMe?: boolean | null };
      message?: {
        conversation?: string | null;
        extendedTextMessage?: { text?: string | null } | null;
      } | null;
      pushName?: string | null;
    }>;
  }) => {
    for (const msg of update.messages) {
      if (msg.key.fromMe) continue;
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text;
      if (text && msg.key.remoteJid) {
        handler({
          jid: msg.key.remoteJid,
          text,
          pushName: msg.pushName || undefined,
        });
      }
    }
  };
  connectedSocket.ev.on("messages.upsert", listener);
  return () => {
    connectedSocket?.ev.off("messages.upsert", listener);
  };
}

export async function disconnectWhatsApp(): Promise<void> {
  connectedSocket?.end(undefined);
  connectedSocket = null;
}

export async function logoutWhatsApp(): Promise<void> {
  try {
    await connectedSocket?.logout();
  } catch {
    /* ignore */
  }
  connectedSocket = null;
  if (clearAuthState) await clearAuthState().catch(() => {});
}
