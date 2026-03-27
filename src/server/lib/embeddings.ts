import { resolveProviderKey, resolveProviderBaseUrl } from "./auth-profiles";

const log = (..._args: unknown[]) => {};

/** Supported embedding providers */
type EmbeddingProvider = "openai" | "gemini" | "ollama";

interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

const EMBEDDING_MODELS: Record<EmbeddingProvider, string> = {
  openai: "text-embedding-3-small",
  gemini: "text-embedding-004",
  ollama: "nomic-embed-text",
};

const EMBEDDING_DIMS: Record<EmbeddingProvider, number> = {
  openai: 1536,
  gemini: 768,
  ollama: 768,
};

/** Detect which embedding provider the user has configured */
export async function resolveEmbeddingProvider(
  userId: string
): Promise<{ provider: EmbeddingProvider; apiKey: string; baseUrl?: string } | null> {
  // Priority: OpenAI → Gemini → Ollama (local, no key needed)
  for (const provider of ["openai", "gemini"] as EmbeddingProvider[]) {
    const key = await resolveProviderKey(provider, userId);
    if (key) {
      const baseUrl = await resolveProviderBaseUrl(provider, userId);
      return { provider, apiKey: key, baseUrl: baseUrl || undefined };
    }
  }

  // Try Ollama (no API key, just needs to be running)
  try {
    const ollamaBase = (await resolveProviderBaseUrl("ollama", userId)) || "http://localhost:11434";
    const res = await fetch(`${ollamaBase}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return { provider: "ollama", apiKey: "", baseUrl: ollamaBase };
  } catch {
    // Ollama not available
  }

  return null;
}

/** Embed a single text string */
export async function embedText(
  text: string,
  userId: string
): Promise<EmbeddingResult | null> {
  const resolved = await resolveEmbeddingProvider(userId);
  if (!resolved) return null;

  const { provider, apiKey, baseUrl } = resolved;

  switch (provider) {
    case "openai":
      return embedOpenAI(text, apiKey, baseUrl);
    case "gemini":
      return embedGemini(text, apiKey);
    case "ollama":
      return embedOllama(text, baseUrl || "http://localhost:11434");
  }
}

/** Embed multiple texts in a batch */
export async function embedBatch(
  texts: string[],
  userId: string
): Promise<(EmbeddingResult | null)[]> {
  const resolved = await resolveEmbeddingProvider(userId);
  if (!resolved) return texts.map(() => null);

  const { provider, apiKey, baseUrl } = resolved;

  if (provider === "openai") {
    return embedOpenAIBatch(texts, apiKey, baseUrl);
  }

  // Fallback: embed one at a time
  const results: (EmbeddingResult | null)[] = [];
  for (const text of texts) {
    switch (provider) {
      case "gemini":
        results.push(await embedGemini(text, apiKey));
        break;
      case "ollama":
        results.push(await embedOllama(text, baseUrl || "http://localhost:11434"));
        break;
    }
  }
  return results;
}

/** Get embedding dimensions for the current provider */
export function getEmbeddingDims(provider: EmbeddingProvider): number {
  return EMBEDDING_DIMS[provider];
}

// --- Provider implementations ---

async function embedOpenAI(
  text: string,
  apiKey: string,
  baseUrl?: string
): Promise<EmbeddingResult | null> {
  try {
    const url = `${baseUrl || "https://api.openai.com/v1"}/embeddings`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODELS.openai,
        input: text,
      }),
    });
    if (!res.ok) {
      log("OpenAI embed error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      embedding: data.data[0].embedding,
      tokenCount: data.usage?.total_tokens ?? Math.ceil(text.length / 4),
    };
  } catch (e) {
    log("OpenAI embed failed:", e);
    return null;
  }
}

async function embedOpenAIBatch(
  texts: string[],
  apiKey: string,
  baseUrl?: string
): Promise<(EmbeddingResult | null)[]> {
  try {
    const url = `${baseUrl || "https://api.openai.com/v1"}/embeddings`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODELS.openai,
        input: texts,
      }),
    });
    if (!res.ok) {
      log("OpenAI batch embed error:", res.status);
      return texts.map(() => null);
    }
    const data = await res.json();
    const tokensPerInput = Math.ceil(
      (data.usage?.total_tokens ?? texts.join("").length / 4) / texts.length
    );
    return data.data.map((d: any) => ({
      embedding: d.embedding,
      tokenCount: tokensPerInput,
    }));
  } catch (e) {
    log("OpenAI batch embed failed:", e);
    return texts.map(() => null);
  }
}

async function embedGemini(
  text: string,
  apiKey: string
): Promise<EmbeddingResult | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODELS.gemini}:embedContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    });
    if (!res.ok) {
      log("Gemini embed error:", res.status);
      return null;
    }
    const data = await res.json();
    return {
      embedding: data.embedding.values,
      tokenCount: Math.ceil(text.length / 4),
    };
  } catch (e) {
    log("Gemini embed failed:", e);
    return null;
  }
}

async function embedOllama(
  text: string,
  baseUrl: string
): Promise<EmbeddingResult | null> {
  try {
    const res = await fetch(`${baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODELS.ollama, input: text }),
    });
    if (!res.ok) {
      log("Ollama embed error:", res.status);
      return null;
    }
    const data = await res.json();
    return {
      embedding: data.embeddings?.[0] ?? data.embedding,
      tokenCount: Math.ceil(text.length / 4),
    };
  } catch (e) {
    log("Ollama embed failed:", e);
    return null;
  }
}
