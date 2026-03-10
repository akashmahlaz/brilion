import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { createMistral } from "@ai-sdk/mistral";
import type { LanguageModel } from "ai";
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

function buildProvider(
  providerId: string,
  apiKey: string,
  baseUrl?: string
) {
  switch (providerId) {
    case "github":
      return createOpenAI({
        apiKey,
        baseURL: baseUrl || "https://models.inference.ai.azure.com",
      });
    case "github-copilot":
      return createOpenAI({
        apiKey,
        baseURL: baseUrl || "https://api.githubcopilot.com",
      });
    case "openai":
      return createOpenAI({ apiKey, baseURL: baseUrl });
    case "anthropic":
      return createAnthropic({ apiKey, baseURL: baseUrl });
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL: baseUrl });
    case "xai":
      return createXai({ apiKey, baseURL: baseUrl });
    case "mistral":
      return createMistral({ apiKey, baseURL: baseUrl });
    case "openrouter":
      return createOpenAI({
        apiKey,
        baseURL: baseUrl || "https://openrouter.ai/api/v1",
      });
    default:
      return createOpenAI({ apiKey, baseURL: baseUrl });
  }
}

/**
 * Resolve a model spec (e.g. "github/gpt-4o") into an AI SDK LanguageModel.
 */
export async function resolveModel(modelSpec?: string): Promise<LanguageModel> {
  const config = await loadConfig();
  const spec = modelSpec || config.agents?.defaults?.model?.primary || "gpt-4o";

  let providerId: string;
  let modelId: string;

  if (spec.includes("/")) {
    [providerId, modelId] = spec.split("/", 2);
  } else {
    modelId = spec;
    // Try to find a configured provider
    for (const p of PROVIDER_CATALOG) {
      const key = await resolveProviderKey(p.id);
      if (key) {
        providerId = p.id;
        break;
      }
    }
    providerId ??= "github";
  }

  const apiKey = await resolveProviderKey(providerId!);
  if (!apiKey) {
    throw new Error(
      `No API key configured for provider '${providerId}'. Set one in settings.`
    );
  }

  const baseUrl = await resolveProviderBaseUrl(providerId!);
  const provider = buildProvider(providerId!, apiKey, baseUrl ?? undefined);
  return (provider as any)(modelId);
}

export async function resolveModelBySpec(spec: string): Promise<LanguageModel> {
  return resolveModel(spec);
}

export async function getAvailableProviders() {
  const result = [];
  for (const p of PROVIDER_CATALOG) {
    const key = await resolveProviderKey(p.id);
    result.push({
      ...p,
      configured: !!key,
    });
  }
  return result;
}
