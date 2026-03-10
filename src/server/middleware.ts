import { getSession } from "start-authjs";
import { authConfig } from "./auth";
import { connectDB } from "./db";

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
 */
export async function requireAuth(request: Request) {
  const session = await getAuthSession(request);
  if (!session?.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}
