import { UserSkill } from "../models/user-skill";
import { connectDB } from "../db";
import {
  searchClawHubSkills,
  exploreClawHubSkills,
  getClawHubSkillContent,
  type ClawHubSkill,
} from "./clawhub-client";

/**
 * Install a skill from ClawHub marketplace.
 * Fetches SKILL.md via the ClawHub public API and saves to MongoDB.
 */
export async function installFromClawHub(
  userId: string,
  slug: string
): Promise<{ status: string; slug: string; error?: string }> {
  await connectDB();

  // Check if already installed
  const existing = await UserSkill.findOne({
    userId,
    name: slug,
  });
  if (existing) return { status: "already-installed", slug };

  // Fetch SKILL.md content from ClawHub
  const content = await getClawHubSkillContent(slug);

  if (!content) {
    return {
      status: "error",
      slug,
      error: `Skill "${slug}" not found on ClawHub or content unavailable`,
    };
  }

  // Parse frontmatter for description
  const descMatch = content.match(/^description:\s*(.+)$/m);
  const description = descMatch
    ? descMatch[1].trim().replace(/^['"]|['"]$/g, "")
    : `Installed from ClawHub: ${slug}`;

  // Parse emoji
  const emojiMatch = content.match(/^emoji:\s*(.+)$/m);
  const emoji = emojiMatch ? emojiMatch[1].trim() : undefined;

  await UserSkill.create({
    userId,
    name: slug,
    description,
    content,
    isEnabled: true,
    createdBy: "marketplace",
    ...(emoji ? { emoji } : {}),
  });

  return { status: "installed", slug };
}

/**
 * Install a skill from raw content (paste / upload).
 */
export async function installFromContent(
  userId: string,
  name: string,
  content: string,
  description?: string
): Promise<{ status: string; name: string }> {
  await connectDB();

  await UserSkill.findOneAndUpdate(
    { userId, name },
    {
      userId,
      name,
      description: description || "",
      content,
      isEnabled: true,
      createdBy: "user",
    },
    { upsert: true }
  );

  return { status: "installed", name };
}

/**
 * Uninstall a skill for a user.
 */
export async function uninstallSkill(
  userId: string,
  skillId: string
): Promise<{ status: string }> {
  await connectDB();
  await UserSkill.findOneAndDelete({ _id: skillId, userId });
  return { status: "uninstalled" };
}

/**
 * Search ClawHub marketplace (34,000+ skills).
 * Uses the ClawHub public REST API with vector search.
 */
export async function searchClawHub(query: string): Promise<{
  results: Array<{
    slug: string;
    name: string;
    description: string;
    author: string;
    downloads: number;
    stars: number;
    highlighted: boolean;
    official: boolean;
  }>;
}> {
  const { skills } = await searchClawHubSkills(query, 20);

  return {
    results: skills.map((s: ClawHubSkill) => ({
      slug: s.slug,
      name: s.displayName || s.slug,
      description: s.summary,
      author: s.ownerHandle,
      downloads: s.stats.downloads,
      stars: s.stats.stars,
      highlighted: s.badges?.highlighted ?? false,
      official: s.badges?.official ?? false,
    })),
  };
}

/**
 * Browse popular/trending ClawHub skills.
 */
export async function browseClawHub(options?: {
  limit?: number;
  sort?: "newest" | "downloads" | "installs" | "trending" | "stars";
}): Promise<{
  results: Array<{
    slug: string;
    name: string;
    description: string;
    author: string;
    downloads: number;
    stars: number;
    highlighted: boolean;
    official: boolean;
  }>;
}> {
  const skills = await exploreClawHubSkills(options);

  return {
    results: skills.map((s: ClawHubSkill) => ({
      slug: s.slug,
      name: s.displayName || s.slug,
      description: s.summary,
      author: s.ownerHandle,
      downloads: s.stats.downloads,
      stars: s.stats.stars,
      highlighted: s.badges?.highlighted ?? false,
      official: s.badges?.official ?? false,
    })),
  };
}

/**
 * Get default skills that are seeded during onboarding.
 * These teach the AI how to use common tools with stored tokens.
 */
export const DEFAULT_SKILLS = [
  {
    name: "General Assistant",
    description: "Helpful general-purpose AI assistant",
    content: `You are a helpful, concise assistant. Answer questions clearly and provide actionable advice.
When you don't know something, use the tavily_search tool to look it up.
When the user asks about their setup, use read_own_config to check current configuration.`,
    createdBy: "system" as const,
  },
  {
    name: "Code Helper",
    description: "Programming and development assistance",
    content: `You are a coding expert. Help with debugging, writing code, explaining concepts, and reviewing code.
When the user wants to work with GitHub repos, use the github tools (github_read_file, github_write_file, github_list_repo_contents).
For deploying code, use web_request with the user's stored tokens (vercel, netlify) to interact with deployment APIs.`,
    createdBy: "system" as const,
  },
  {
    name: "Vercel Deploy",
    description: "Deploy and manage projects on Vercel using the Vercel API",
    content: `# Vercel Deployment Skill

You can deploy and manage projects on Vercel using the user's Vercel token.

## How to use
- Use the **web_request** tool with tokenProvider: "vercel"
- Vercel API base: https://api.vercel.com

## Common operations
- **List projects**: GET https://api.vercel.com/v9/projects
- **Get project**: GET https://api.vercel.com/v9/projects/{projectId}
- **Create deployment**: POST https://api.vercel.com/v13/deployments with body: { name, gitSource: { type: "github", org, repo, ref } }
- **Get deployment**: GET https://api.vercel.com/v13/deployments/{id}
- **List deployments**: GET https://api.vercel.com/v6/deployments?projectId={id}&limit=10
- **Set env var**: POST https://api.vercel.com/v10/projects/{projectId}/env with body: { key, value, target: ["production"] }
- **Get domains**: GET https://api.vercel.com/v9/projects/{projectId}/domains

Always check if the vercel token is configured first. Guide the user to Settings → API Keys if not.`,
    createdBy: "system" as const,
  },
  {
    name: "Netlify Deploy",
    description: "Deploy and manage sites on Netlify using the Netlify API",
    content: `# Netlify Deployment Skill

You can deploy and manage sites on Netlify using the user's Netlify token.

## How to use
- Use the **web_request** tool with tokenProvider: "netlify"
- Netlify API base: https://api.netlify.com/api/v1

## Common operations
- **List sites**: GET https://api.netlify.com/api/v1/sites
- **Get site**: GET https://api.netlify.com/api/v1/sites/{siteId}
- **List deploys**: GET https://api.netlify.com/api/v1/sites/{siteId}/deploys
- **Trigger build hook**: POST the build hook URL (found in site settings)
- **Set env var**: PATCH https://api.netlify.com/api/v1/sites/{siteId} with body: { build_settings: { env: { KEY: "value" } } }
- **Get DNS**: GET https://api.netlify.com/api/v1/dns_zones

Always check if the netlify token is configured first. Guide the user to Settings → API Keys if not.`,
    createdBy: "system" as const,
  },
  {
    name: "Web Search",
    description: "Search the web for current information",
    content: `When the user asks about current events, facts, or anything requiring up-to-date info, use the tavily_search tool.
Present results clearly with source links. Summarize findings concisely.`,
    createdBy: "system" as const,
  },
];
