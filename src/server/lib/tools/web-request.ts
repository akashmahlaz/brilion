import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { resolveProviderKey } from "../auth-profiles";

/**
 * Generic HTTP request tool — the AI agent can call ANY API using stored tokens.
 * This replaces OpenClaw's maton_gateway + exec_command with a SaaS-friendly approach.
 * Skills teach the AI which APIs to call; this tool executes them.
 */
export const webRequest = toolDefinition({
  name: "web_request",
  description: `Make an HTTP request to any API. Use this to interact with external services like Vercel, Netlify, GitHub, Slack, Notion, etc. Tokens are stored in the user's auth-profiles — retrieve them by provider name. Always include the appropriate Authorization header.`,
  inputSchema: z.object({
    url: z.string().describe("Full API URL to call (e.g. https://api.example.com/v1/resource)"),
    method: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
      .optional()
      .describe("HTTP method (default: GET)"),
    headers: z
      .string()
      .optional()
      .describe(
        'Additional request headers as a JSON object string, e.g. \'{"Content-Type": "application/json"}\'. Common auth headers are added automatically via tokenProvider.'
      ),
    body: z
      .string()
      .optional()
      .describe("Request body — plain text or JSON string"),
    tokenProvider: z
      .string()
      .optional()
      .describe(
        "Provider name to auto-inject Bearer token from auth-profiles (e.g. 'vercel', 'netlify', 'github')"
      ),
  }),
}).server(async ({ url, method = "GET", headers: headersJson, body, tokenProvider }) => {
  // Parse headers from JSON string
  let headers: Record<string, string> = {};
  if (headersJson) {
    try {
      headers = JSON.parse(headersJson);
    } catch {
      return { error: "Invalid JSON for headers parameter" };
    }
  }
  // Validate URL to prevent SSRF — block private/internal ranges
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname === "[::1]" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return { error: "Requests to internal/private networks are not allowed" };
    }
  } catch {
    return { error: "Invalid URL" };
  }

  // Auto-inject token if provider specified
  if (tokenProvider) {
    const token = await resolveProviderKey(tokenProvider);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      return {
        error: `No token found for provider '${tokenProvider}'. Add it in Settings → API Keys.`,
      };
    }
  }

  // Ensure content-type for body requests
  if (body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      method,
      headers: headers as HeadersInit,
      body: body || undefined,
    });

    const contentType = res.headers.get("content-type") || "";
    let responseBody: unknown;

    if (contentType.includes("application/json")) {
      responseBody = await res.json();
    } else {
      const text = await res.text();
      // Truncate long responses
      responseBody = text.length > 5000 ? text.slice(0, 5000) + "\n...(truncated)" : text;
    }

    return {
      status: res.status,
      ok: res.ok,
      data: responseBody,
    };
  } catch (err) {
    return {
      error: `Request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
});

/**
 * Retrieve a stored API token for a provider — the AI can use this
 * to check if a token exists or get it for manual header construction.
 */
export const getToken = toolDefinition({
  name: "get_token",
  description:
    "Check if an API token is configured for a provider. Returns masked token info (not the full token for security). Use web_request with tokenProvider instead to make authenticated calls.",
  inputSchema: z.object({
    provider: z
      .string()
      .describe(
        "Provider name (e.g. 'github', 'vercel', 'netlify', 'openai', 'tavily')"
      ),
  }),
}).server(async ({ provider }) => {
  const token = await resolveProviderKey(provider);
  if (!token) {
    return {
      configured: false,
      message: `No token for '${provider}'. User needs to add it in Settings → API Keys.`,
    };
  }
  return {
    configured: true,
    provider,
    tokenPreview: `${token.slice(0, 6)}...${token.slice(-4)}`,
  };
});
