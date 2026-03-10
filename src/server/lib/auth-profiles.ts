import { AuthProfile } from "../models/auth-profile";
import { connectDB } from "../db";

const ENV_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  github: "GITHUB_TOKEN",
  "github-copilot": "GITHUB_TOKEN",
  xai: "XAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  mistral: "MISTRAL_API_KEY",
  tavily: "TAVILY_API_KEY",
  vercel: "VERCEL_TOKEN",
  netlify: "NETLIFY_TOKEN",
  maton: "MATON_API_KEY",
};

export async function upsertAuthProfile(
  provider: string,
  data: { type: string; provider: string; token: string; baseUrl?: string }
) {
  await connectDB();
  const profileId = `${data.provider}:${data.type}`;
  return AuthProfile.findOneAndUpdate(
    { profileId },
    { ...data, profileId },
    { upsert: true, new: true }
  );
}

export async function removeAuthProfile(profileId: string) {
  await connectDB();
  return AuthProfile.findOneAndDelete({ profileId });
}

export async function listAuthProfiles(userId?: string) {
  await connectDB();
  const filter = userId ? { userId } : {};
  const profiles = await AuthProfile.find(filter).lean();
  return profiles.map((p: any) => ({
    profileId: p.profileId,
    type: p.type,
    provider: p.provider,
    tokenRef: p.token ? `${p.token.slice(0, 6)}...${p.token.slice(-4)}` : "",
    baseUrl: p.baseUrl,
    createdAt: p.createdAt,
  }));
}

/**
 * Resolve an API key for a provider:
 * 1. Check AuthProfile in DB
 * 2. Fall back to environment variable
 */
export async function resolveProviderKey(
  provider: string
): Promise<string | undefined> {
  await connectDB();
  const profile = await AuthProfile.findOne({ provider, type: "api_key" }).lean();
  if (profile && (profile as any).token) return (profile as any).token;
  const envKey = ENV_MAP[provider];
  return envKey ? process.env[envKey] : undefined;
}

export async function resolveProviderBaseUrl(
  provider: string
): Promise<string | undefined> {
  await connectDB();
  const profile = await AuthProfile.findOne({ provider }).lean();
  return (profile as any)?.baseUrl ?? undefined;
}
