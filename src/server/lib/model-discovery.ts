import { resolveProviderKey } from "./auth-profiles";
import { PROVIDER_CATALOG } from "./providers";

interface DiscoveredModel {
  id: string;
  name: string;
  provider: string;
}

// In-memory cache: provider → models[]
const modelCache = new Map<string, { models: DiscoveredModel[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchOpenAICompatible(
  endpoint: string,
  apiKey: string,
  providerId: string
): Promise<DiscoveredModel[]> {
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: Array<{ id: string }> };
  return (json.data || []).map((m) => ({
    id: m.id,
    name: m.id,
    provider: providerId,
  }));
}

async function fetchGoogleModels(apiKey: string): Promise<DiscoveredModel[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    models?: Array<{ name: string; displayName: string }>;
  };
  return (json.models || [])
    .filter(
      (m) =>
        m.name.includes("gemini") &&
        !m.name.includes("legacy") &&
        !m.name.includes("aqa")
    )
    .map((m) => ({
      id: m.name.replace("models/", ""),
      name: m.displayName,
      provider: "google",
    }));
}

function getStaticModels(providerId: string): DiscoveredModel[] {
  if (providerId === "anthropic") {
    return [
      "claude-opus-4-20250514",
      "claude-sonnet-4-20250514",
      "claude-3.5-haiku-20241022",
    ].map((id) => ({ id, name: id, provider: "anthropic" }));
  }
  const entry = PROVIDER_CATALOG.find((p) => p.id === providerId);
  if (entry?.freeModels) {
    return entry.freeModels.map((id) => ({
      id,
      name: id,
      provider: providerId,
    }));
  }
  return [];
}

export async function discoverModels(
  providerId: string,
  force = false
): Promise<DiscoveredModel[]> {
  if (!force) {
    const cached = modelCache.get(providerId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.models;
  }

  const apiKey = await resolveProviderKey(providerId);
  const entry = PROVIDER_CATALOG.find((p) => p.id === providerId);

  let models: DiscoveredModel[];

  if (!apiKey) {
    models = getStaticModels(providerId);
  } else if (providerId === "google") {
    models = await fetchGoogleModels(apiKey);
  } else if (providerId === "anthropic") {
    models = getStaticModels("anthropic");
  } else if (entry?.modelsEndpoint) {
    models = await fetchOpenAICompatible(
      entry.modelsEndpoint,
      apiKey,
      providerId
    );
  } else if (entry?.freeModels) {
    models = entry.freeModels.map((id) => ({
      id,
      name: id,
      provider: providerId,
    }));
  } else {
    models = [];
  }

  modelCache.set(providerId, { models, ts: Date.now() });
  return models;
}
