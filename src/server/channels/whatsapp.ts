import makeWASocket, {
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import type { ConnectionState } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { useMongoAuthState } from "../lib/mongo-auth-state";

const log = (...args: unknown[]) => console.log("[whatsapp]", ...args);
const logErr = (...args: unknown[]) => console.error("[whatsapp]", ...args);

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

// Pending message handlers registered before socket connects
const pendingHandlers: Array<
  (msg: { jid: string; text: string; pushName?: string }) => void
> = [];

async function connectSocket(
  session: LoginSession,
  sessionId: string
): Promise<void> {
  log("connectSocket() called, sessionId:", sessionId);
  const { state, saveCreds, clearState } = await useMongoAuthState();
  clearAuthState = clearState;
  const { version } = await fetchLatestBaileysVersion();
  log("Baileys version:", version);

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
    log("connection.update:", { connection, hasQr: !!qr });

    if (qr) {
      try {
        session.qrDataUrl = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        session.message = "Scan QR code with WhatsApp on your phone";
        log("QR code generated for session:", sessionId);
      } catch (e) {
        session.message = "Failed to generate QR code";
        logErr("QR generation failed:", e);
      }
    }

    if (connection === "close") {
      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } }
      )?.output?.statusCode;
      log("Connection closed, statusCode:", statusCode);

      if (statusCode === DisconnectReason.loggedOut) {
        session.status = "failed";
        session.message = "Logged out. Please restart login.";
        if (clearAuthState) await clearAuthState().catch(() => {});
      } else if (statusCode === 515 && !session.restartAttempted) {
        session.restartAttempted = true;
        session.message = "Pairing successful, reconnecting...";
        log("515 restart — reconnecting...");
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
      log("CONNECTION OPEN — socket stored, registering pending handlers:", pendingHandlers.length);

      // Register any handlers that were queued before socket connected
      for (const handler of pendingHandlers) {
        registerListener(sock, handler);
      }

      // Auto-start message router when WhatsApp connects
      import("../lib/router").then(({ initMessageRouter }) => {
        log("Auto-initializing message router on connection open");
        initMessageRouter();
      }).catch((e) => {
        logErr("Failed to init message router:", e);
      });
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

export async function startQrLogin() {
  log("startQrLogin() called");
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
    logErr("startQrLogin error:", err);
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
  log("sendWhatsAppMessage() jid:", jid, "text length:", text.length);
  if (!connectedSocket) {
    logErr("sendWhatsAppMessage: socket not connected!");
    return { status: "error", error: "WhatsApp not connected" };
  }
  try {
    await connectedSocket.sendMessage(jid, { text });
    log("Message sent successfully to:", jid);
    return { status: "sent" };
  } catch (err) {
    logErr("sendWhatsAppMessage error:", err);
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function registerListener(
  sock: ReturnType<typeof makeWASocket>,
  handler: (msg: { jid: string; text: string; pushName?: string }) => void
) {
  log("registerListener() attaching messages.upsert handler");
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
      if (msg.key.fromMe) {
        log("Skipping own message (fromMe)");
        continue;
      }
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text;
      log("Incoming message:", { jid: msg.key.remoteJid, text: text?.slice(0, 100), pushName: msg.pushName });
      if (text && msg.key.remoteJid) {
        log("Dispatching to handler, jid:", msg.key.remoteJid);
        handler({
          jid: msg.key.remoteJid,
          text,
          pushName: msg.pushName || undefined,
        });
      }
    }
  };
  sock.ev.on("messages.upsert", listener);
}

export function onWhatsAppMessage(
  handler: (msg: { jid: string; text: string; pushName?: string }) => void
): () => void {
  log("onWhatsAppMessage() registering handler, total pending:", pendingHandlers.length + 1);
  // Always store the handler so it gets re-registered on reconnect
  pendingHandlers.push(handler);

  // If socket is already connected, register immediately
  if (connectedSocket) {
    registerListener(connectedSocket, handler);
  }

  return () => {
    const idx = pendingHandlers.indexOf(handler);
    if (idx >= 0) pendingHandlers.splice(idx, 1);
    // Note: cannot easily remove from socket.ev, but handler removal
    // from pendingHandlers prevents re-registration on reconnect
  };
}

export async function disconnectWhatsApp(): Promise<void> {
  log("disconnectWhatsApp() called");
  connectedSocket?.end(undefined);
  connectedSocket = null;
}

export async function logoutWhatsApp(): Promise<void> {
  log("logoutWhatsApp() called");
  try {
    await connectedSocket?.logout();
  } catch (e) {
    logErr("logoutWhatsApp error:", e);
  }
  connectedSocket = null;
  if (clearAuthState) await clearAuthState().catch(() => {});
  log("WhatsApp logged out, auth state cleared");
}
