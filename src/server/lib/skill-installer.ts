import { UserSkill } from "../models/user-skill";
import { connectDB } from "../db";
import { resolveProviderKey } from "./auth-profiles";

// ClawHub — community skill marketplace via GitHub
const CLAWHUB_RAW_BASE = "https://raw.githubusercontent.com";
const CLAWHUB_DEFAULT_ORG = "nicepkg";
const CLAWHUB_DEFAULT_REPO = "clawhub-skills";

/**
 * Install a skill from ClawHub by downloading its SKILL.md from GitHub.
 * Saves to MongoDB (not filesystem) for multi-user SaaS.
 */
export async function installFromClawHub(
  userId: string,
  slug: string,
  repo?: string
): Promise<{ status: string; slug: string; error?: string }> {
  await connectDB();

  // Check if already installed
  const existing = await UserSkill.findOne({
    userId,
    name: slug,
    createdBy: "system",
  });
  if (existing) return { status: "already-installed", slug };

  const repoPath = repo || `${CLAWHUB_DEFAULT_ORG}/${CLAWHUB_DEFAULT_REPO}`;

  // Try multiple URL patterns
  const urls = [
    `${CLAWHUB_RAW_BASE}/${repoPath}/main/skills/${slug}/SKILL.md`,
    `${CLAWHUB_RAW_BASE}/${repoPath}/main/${slug}/SKILL.md`,
  ];

  let content: string | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        content = await res.text();
        break;
      }
    } catch {
      /* try next */
    }
  }

  if (!content) {
    return {
      status: "error",
      slug,
      error: `Skill "${slug}" not found in ${repoPath}`,
    };
  }

  // Parse frontmatter for description
  const descMatch = content.match(/^description:\s*(.+)$/m);
  const description = descMatch
    ? descMatch[1].trim().replace(/^['"]|['"]$/g, "")
    : `Installed from ClawHub: ${slug}`;

  await UserSkill.create({
    userId,
    name: slug,
    description,
    content,
    isEnabled: true,
    createdBy: "system",
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
 * Search ClawHub (GitHub) for skills matching a query.
 * Uses GitHub search API — optionally uses stored GitHub token.
 */
export async function searchClawHub(
  query: string
): Promise<{
  results: { slug: string; name: string; description: string; url: string; repo: string }[];
}> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "brilion-agent",
  };

  // Use stored GitHub token if available (higher rate limits)
  const token = await resolveProviderKey("github");
  if (token) headers.Authorization = `Bearer ${token}`;

  const searchQuery = encodeURIComponent(`${query} filename:SKILL.md`);
  const searchUrl = `https://api.github.com/search/code?q=${searchQuery}&per_page=20`;

  try {
    const res = await fetch(searchUrl, { headers });
    if (!res.ok) return { results: [] };

    const data = await res.json();
    const results = (data.items || []).map(
      (item: {
        repository: { full_name: string };
        path: string;
        html_url: string;
      }) => {
        const pathParts = item.path.split("/");
        const slug = pathParts[pathParts.length - 2] || pathParts[0];
        return {
          slug,
          name: slug,
          description: `From ${item.repository.full_name}`,
          url: item.html_url,
          repo: item.repository.full_name,
        };
      }
    );

    return { results };
  } catch {
    return { results: [] };
  }
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
