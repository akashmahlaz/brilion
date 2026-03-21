import { createOpenaiChat } from "@tanstack/ai-openai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createGeminiChat } from "@tanstack/ai-gemini";
import type { AnyTextAdapter } from "@tanstack/ai";
import { resolveProviderKey, resolveProviderBaseUrl } from "./auth-profiles";
import { loadConfig } from "./config";

export interface ProviderEntry {
  id: string;
  name: string;
  description: string;
  envKey?: string;
  website: string;
  docsUrl?: string;
  modelsEndpoint?: string;
  defaultBaseUrl?: string;
  freeModels?: string[];
}

export const PROVIDER_CATALOG: ProviderEntry[] = [
  {
    id: "github",
    name: "GitHub Models",
    description: "Free AI models via GitHub Marketplace",
    envKey: "GITHUB_TOKEN",
    website: "https://github.com/marketplace/models",
    modelsEndpoint: "https://models.inference.ai.azure.com/models",
    defaultBaseUrl: "https://models.inference.ai.azure.com",
    freeModels: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "o4-mini",
      "o3-mini",
    ],
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    description: "GitHub Copilot Chat completions API",
    envKey: "GITHUB_TOKEN",
    website: "https://github.com/features/copilot",
    defaultBaseUrl: "https://api.githubcopilot.com",
    freeModels: ["gpt-4o", "gpt-4.1", "claude-sonnet-4-20250514", "o3-mini", "gemini-2.0-flash"],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4.1, o3, o4-mini and more",
    envKey: "OPENAI_API_KEY",
    website: "https://openai.com",
    modelsEndpoint: "https://api.openai.com/v1/models",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude Opus, Sonnet, Haiku models",
    envKey: "ANTHROPIC_API_KEY",
    website: "https://anthropic.com",
  },
  {
    id: "google",
    name: "Google AI",
    description: "Gemini 2.5 Pro, Flash, and more",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    website: "https://ai.google.dev",
    modelsEndpoint:
      "https://generativelanguage.googleapis.com/v1beta/models",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Unified gateway to 200+ models",
    envKey: "OPENROUTER_API_KEY",
    website: "https://openrouter.ai",
    modelsEndpoint: "https://openrouter.ai/api/v1/models",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: "xai",
    name: "xAI",
    description: "Grok models from xAI",
    envKey: "XAI_API_KEY",
    website: "https://x.ai",
    modelsEndpoint: "https://api.x.ai/v1/models",
  },
];

function buildAdapter(
  providerId: string,
  modelId: string,
  apiKey: string,
  baseUrl?: string
): AnyTextAdapter {
  switch (providerId) {
    case "github":
      return createOpenaiChat({
        model: modelId,
        apiKey,
        baseUrl: baseUrl || "https://models.inference.ai.azure.com",
      });
    case "github-copilot":
      return createOpenaiChat({
        model: modelId,
        apiKey,
        baseUrl: baseUrl || "https://api.githubcopilot.com",
      });
    case "openai":
      return createOpenaiChat({ model: modelId, apiKey, baseUrl });
    case "anthropic":
      return createAnthropicChat({ model: modelId, apiKey, baseUrl });
    case "google":
      return createGeminiChat({ model: modelId, apiKey, baseUrl });
    case "xai":
      // xAI uses OpenAI-compatible API
      return createOpenaiChat({
        model: modelId,
        apiKey,
        baseUrl: baseUrl || "https://api.x.ai/v1",
      });
    case "mistral":
      // Mistral uses OpenAI-compatible API
      return createOpenaiChat({
        model: modelId,
        apiKey,
        baseUrl: baseUrl || "https://api.mistral.ai/v1",
      });
    case "openrouter":
      return createOpenaiChat({
        model: modelId,
        apiKey,
        baseUrl: baseUrl || "https://openrouter.ai/api/v1",
      });
    default:
      return createOpenaiChat({ model: modelId, apiKey, baseUrl });
  }
}

/**
 * Resolve a model spec (e.g. "github/gpt-4o") into a TanStack AI adapter.
 * Implements OpenClaw-style failover: tries primary, then each fallback.
 */
export async function resolveModel(modelSpec?: string, userId?: string): Promise<AnyTextAdapter> {
  console.log("[providers] resolveModel() called, spec:", modelSpec || "default", "userId:", userId || "none");
  const config = await loadConfig(userId);
  const spec = modelSpec || config.agents?.defaults?.model?.primary || "gpt-4o";
  const fallbacks: string[] = config.agents?.defaults?.model?.fallbacks || [];
  console.log("[providers] resolved spec:", spec, "fallbacks:", fallbacks);

  // Try primary first, then each fallback
  const specs = [spec, ...fallbacks];
  let lastError: Error | null = null;

  for (const currentSpec of specs) {
    try {
      const adapter = await resolveModelSingle(currentSpec, userId);
      if (currentSpec !== spec) {
        console.log("[providers] Failover succeeded with:", currentSpec);
      }
      return adapter;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.log("[providers] Failed to resolve", currentSpec, ":", lastError.message);
    }
  }

  throw lastError || new Error("No AI provider configured. Set an API key first.");
}

async function resolveModelSingle(spec: string, userId?: string): Promise<AnyTextAdapter> {
  let providerId: string = "github";
  let modelId: string;

  if (spec.includes("/")) {
    [providerId, modelId] = spec.split("/", 2);
  } else {
    modelId = spec;
    // Try to find a configured provider
    for (const p of PROVIDER_CATALOG) {
      const key = await resolveProviderKey(p.id, userId);
      if (key) {
        providerId = p.id;
        break;
      }
    }
  }

  console.log("[providers] using provider:", providerId!, "model:", modelId);
  const apiKey = await resolveProviderKey(providerId!, userId);
  if (!apiKey) {
    throw new Error(
      `No API key configured for provider '${providerId}'. Set one in settings.`
    );
  }

  const baseUrl = await resolveProviderBaseUrl(providerId!, userId);
  console.log("[providers] baseUrl:", baseUrl || "default");
  return buildAdapter(providerId!, modelId, apiKey, baseUrl ?? undefined);
}

export async function resolveModelBySpec(spec: string, userId?: string): Promise<AnyTextAdapter> {
  return resolveModel(spec, userId);
}

export async function getAvailableProviders(userId?: string) {
  const result = [];
  for (const p of PROVIDER_CATALOG) {
    const key = await resolveProviderKey(p.id, userId);
    result.push({
      ...p,
      configured: !!key,
    });
  }
  return result;
}
