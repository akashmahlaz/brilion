import { getSession } from "start-authjs";
import { authConfig } from "./auth";
import { connectDB } from "./db";
import { ensureServerInit } from "./init";

/**
 * Get the current user session from a Request.
 * Returns null if not authenticated.
 */
export async function getAuthSession(request: Request) {
  await connectDB();
  return getSession(request, authConfig);
}

/**
 * Require authentication — returns session or throws 401 Response.
 * Also triggers lazy server init (WhatsApp reconnect, Telegram bots).
 */
export async function requireAuth(request: Request) {
  const session = await getAuthSession(request);
  if (!session?.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Lazy init — reconnects WhatsApp/Telegram on first authenticated request
  ensureServerInit().catch((e) => {
    console.error("[middleware] ensureServerInit failed:", e);
  });

  return session;
}
