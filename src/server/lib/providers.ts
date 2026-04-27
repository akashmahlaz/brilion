import { createOpenaiChat } from "@tanstack/ai-openai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createGeminiChat } from "@tanstack/ai-gemini";
import type { AnyTextAdapter } from "@tanstack/ai";
import { resolveProviderKey, resolveProviderBaseUrl } from "./auth-profiles";
import { loadConfig } from "./config";
import { createLogger } from "../models/log-entry";

// ── Runtime Adapter Switching (typed factory map) ──
type AdapterFactory = (modelId: string, apiKey: string, baseUrl?: string) => AnyTextAdapter;

const ADAPTER_FACTORIES: Record<string, AdapterFactory> = {
  github: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://models.inference.ai.azure.com" }),
  "github-copilot": (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.githubcopilot.com" }),
  openai: (model, key, base) =>
    createOpenaiChat(model as any, key, base ? { baseURL: base } : undefined),
  anthropic: (model, key, base) =>
    createAnthropicChat(model as any, key, base ? { baseURL: base } : undefined),
  google: (model, key, base) =>
    createGeminiChat(model as any, key, base ? { baseURL: base } : undefined),
  xai: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.x.ai/v1" }),
  mistral: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.mistral.ai/v1" }),
  openrouter: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://openrouter.ai/api/v1" }),
  groq: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.groq.com/openai/v1" }),
  deepseek: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.deepseek.com/v1" }),
  cohere: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.cohere.ai/v2" }),
  cloudflare: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.cloudflare.com/client/v4" }),
  fireworks: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.fireworks.ai/v1" }),
  perplexity: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.perplexity.ai" }),
  together: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.together.xyz/v1" }),
  nebius: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.nebius.ai/v1" }),
  akash: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://cloud.mymlabs.com/v1" }),
  replicate: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.replicate.com/v1" }),
  minimax: (model, key, base) =>
    createOpenaiChat(model as any, key, { baseURL: base || "https://api.minimax.chat/v1" }),
};

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
  {
    id: "mistral",
    name: "Mistral AI",
    description: "Mistral models — Pixtral, Large, Small",
    envKey: "MISTRAL_API_KEY",
    website: "https://mistral.ai",
    modelsEndpoint: "https://api.mistral.ai/v1/models",
    defaultBaseUrl: "https://api.mistral.ai/v1",
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference, free tier available",
    envKey: "GROQ_API_KEY",
    website: "https://console.groq.com",
    modelsEndpoint: "https://api.groq.com/openai/v1/models",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    freeModels: ["llama-3.1-8b-instant", "llama-3.2-3b-preview", "mixtral-8x7b-32768"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek V3 and Coder models — highly capable, low cost",
    envKey: "DEEPSEEK_API_KEY",
    website: "https://platform.deepseek.com",
    modelsEndpoint: "https://api.deepseek.com/v1/models",
    defaultBaseUrl: "https://api.deepseek.com/v1",
  },
  {
    id: "cohere",
    name: "Cohere",
    description: "Command R+ and Command models for RAG and agents",
    envKey: "COHERE_API_KEY",
    website: "https://cohere.com",
    modelsEndpoint: "https://api.cohere.ai/v2/models",
    defaultBaseUrl: "https://api.cohere.ai/v2",
  },
  {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    description: "Edge AI — Workers AI with free tier",
    envKey: "CLOUDFLARE_API_KEY",
    website: "https://developers.cloudflare.com/workers-ai",
    defaultBaseUrl: "https://api.cloudflare.com/client/v4",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    description: "Fast inference for Llama, Mixtral, and custom models",
    envKey: "FIREWORKS_API_KEY",
    website: "https://fireworks.ai",
    modelsEndpoint: "https://api.fireworks.ai/v1/models",
    defaultBaseUrl: "https://api.fireworks.ai/v1",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "Real-time web search with Sonar models",
    envKey: "PERPLEXITY_API_KEY",
    website: "https://perplexity.ai",
    modelsEndpoint: "https://api.perplexity.ai/v1/models",
    defaultBaseUrl: "https://api.perplexity.ai",
  },
  {
    id: "together",
    name: "Together AI",
    description: "Managed inference for open-source models",
    envKey: "TOGETHER_API_KEY",
    website: "https://together.ai",
    modelsEndpoint: "https://api.together.xyz/v1/models",
    defaultBaseUrl: "https://api.together.xyz/v1",
  },
  {
    id: "nebius",
    name: "Nebius",
    description: "High-performance inference for SDXL, Llama models",
    envKey: "NEBIUS_API_KEY",
    website: "https://nebius.ai",
    modelsEndpoint: "https://api.nebius.ai/v1/models",
    defaultBaseUrl: "https://api.nebius.ai/v1",
  },
  {
    id: "akash",
    name: "Akash Network",
    description: "Decentralized cloud for self-hosted AI models",
    envKey: "AKASH_API_KEY",
    website: "https://akash.network",
    defaultBaseUrl: "https://cloud.mymlabs.com/v1",
  },
  {
    id: "replicate",
    name: "Replicate",
    description: "Run open-source models — Llama, Stable Diffusion, Flux",
    envKey: "REPLICATE_API_KEY",
    website: "https://replicate.com",
    defaultBaseUrl: "https://api.replicate.com/v1",
  },
  {
    id: "minimax",
    name: "MiniMax",
    description: "Mochi, HbY, and Flash models from MiniMax",
    envKey: "MINIMAX_API_KEY",
    website: "https://www.minimax.io",
    modelsEndpoint: "https://api.minimax.chat/v1/models",
    defaultBaseUrl: "https://api.minimax.chat/v1",
  },
  {
    id: "tavily",
    name: "Tavily",
    description: "AI-powered web search for RAG and research",
    envKey: "TAVILY_API_KEY",
    website: "https://tavily.com",
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Vercel deployment and Edge Functions",
    envKey: "VERCEL_TOKEN",
    website: "https://vercel.com",
  },
  {
    id: "netlify",
    name: "Netlify",
    description: "Netlify deployment and serverless functions",
    envKey: "NETLIFY_TOKEN",
    website: "https://netlify.com",
  },
  {
    id: "maton",
    name: "Maton Gateway",
    description: "Unified gateway for various AI providers",
    envKey: "MATON_API_KEY",
    website: "https://maton.io",
  },
];

function buildAdapter(
  providerId: string,
  modelId: string,
  apiKey: string,
  baseUrl?: string
): AnyTextAdapter {

  const factory = ADAPTER_FACTORIES[providerId] || ADAPTER_FACTORIES.openai;
  return factory(modelId, apiKey, baseUrl);
}

/**
 * Resolve a model spec (e.g. "github/gpt-4o") into a TanStack AI adapter.
 * Implements OpenClaw-style failover: tries primary, then each fallback.
 */
export async function resolveModel(modelSpec?: string, userId?: string): Promise<AnyTextAdapter> {
  const config = await loadConfig(userId);
  const spec = modelSpec || config.agents?.defaults?.model?.primary || "gpt-4o";
  const fallbacks: string[] = config.agents?.defaults?.model?.fallbacks || [];


  // Deep diagnostic: log the full model resolution chain
  if (userId) {
    const sysLogger = createLogger(userId, "agent");
    sysLogger.info("Model resolution started", {
      requestedSpec: modelSpec || null,
      resolvedSpec: spec,
      fallbacks,
      configPrimary: config.agents?.defaults?.model?.primary || null,
    });
  }

  // Try primary first, then each fallback
  const specs = [spec, ...fallbacks];
  let lastError: Error | null = null;

  for (const currentSpec of specs) {
    try {
      const adapter = await resolveModelSingle(currentSpec, userId);
      if (currentSpec !== spec) {
        console.warn("[providers] Failover succeeded with:", currentSpec);
      }
      // Log successful resolution
      if (userId) {
        const sysLogger = createLogger(userId, "agent");
        sysLogger.info("Model resolved successfully", {
          spec: currentSpec,
          model: (adapter as any)?.model || "unknown",
          provider: currentSpec.includes("/") ? currentSpec.split("/")[0] : "auto",
          wasFailover: currentSpec !== spec,
        });
      }
      return adapter;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn("[providers] Failed to resolve", currentSpec, ":", lastError.message);
      if (userId) {
        const sysLogger = createLogger(userId, "agent");
        sysLogger.warn("Model resolution failed, trying next", {
          spec: currentSpec,
          error: lastError.message,
          remainingFallbacks: specs.slice(specs.indexOf(currentSpec) + 1),
        });
      }
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


  const apiKey = await resolveProviderKey(providerId!, userId);
  if (!apiKey) {
    throw new Error(
      `No API key configured for provider '${providerId}'. Set one in settings.`
    );
  }

  const baseUrl = await resolveProviderBaseUrl(providerId!, userId);
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
