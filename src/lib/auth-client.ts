import { useState, useEffect, useCallback } from "react";

// ── Session helpers ─────────────────────────────────────────
// Auth is now served by TanStack Start on the same origin — no proxy needed.

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

async function getCsrfToken(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  const data = await res.json();
  return data.csrfToken;
}

export async function getSession(): Promise<Session | null> {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.user) return null;
  return data as Session;
}

// ── Sign in (OAuth via form POST) ───────────────────────────

function submitAuthForm(action: string, callbackUrl: string, csrfToken: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;

  const addHidden = (name: string, value: string) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };

  addHidden("csrfToken", csrfToken);
  addHidden("callbackUrl", callbackUrl);

  document.body.appendChild(form);
  form.submit();
}

export async function signInWithGoogle(callbackUrl = "/") {
  const csrfToken = await getCsrfToken();
  const absoluteUrl = new URL(callbackUrl, window.location.origin).href;
  submitAuthForm("/api/auth/signin/google", absoluteUrl, csrfToken);
}

export async function signInWithLinkedIn(callbackUrl = "/") {
  const csrfToken = await getCsrfToken();
  const absoluteUrl = new URL(callbackUrl, window.location.origin).href;
  submitAuthForm("/api/auth/signin/linkedin", absoluteUrl, csrfToken);
}

export async function signInWithEmail(
  email: string,
  password: string,
  callbackUrl = "/"
): Promise<{ error: string | null }> {
  try {
    const csrfToken = await getCsrfToken();
    const absoluteUrl = new URL(callbackUrl, window.location.origin).href;
    await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        callbackUrl: absoluteUrl,
      }),
      credentials: "include",
    });
    const session = await getSession();
    if (session) return { error: null };
    return { error: "Invalid email or password" };
  } catch (err) {
    console.error("[auth-client] email sign-in error:", err);
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
  } catch (err) {
    console.error("[auth-client] registration error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Sign out ────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    const csrfToken = await getCsrfToken();
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken }),
      credentials: "include",
    });
  } catch (err) {
    console.error("[auth-client] signout error:", err);
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
