// ── Session helpers ─────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  plan?: string;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

export async function getSession(): Promise<Session | null> {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.user) return null;
  return data as Session;
}

// ── Sign in with email/password (Credentials provider) ─────

export async function signInWithEmail(
  email: string,
  password: string,
  callbackUrl = "/"
): Promise<{ error: string | null }> {
  try {
    const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" });
    const { csrfToken } = await csrfRes.json();

    await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        callbackUrl: new URL(callbackUrl, window.location.origin).href,
      }),
      credentials: "include",
    });
    const session = await getSession();
    if (session) return { error: null };
    return { error: "Invalid email or password" };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Sign up ─────────────────────────────────────────────────

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ error: string | null }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      return { error: data.error || "Registration failed" };
    }
    return signInWithEmail(email, password, "/onboarding");
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Sign out ────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" });
    const { csrfToken } = await csrfRes.json();
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken }),
      credentials: "include",
    });
  } catch {
    // ignore
  }
}

// ── React hook ──────────────────────────────────────────────

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await getSession();
      setSession(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data: session,
    isPending: loading,
    refresh,
  };
}
