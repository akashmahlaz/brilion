import type { LanguageModel, ToolSet } from "ai";
import { resolveModel } from "./providers";
import { buildSystemPromptFromWorkspace } from "./workspace";
import { loadConfig } from "./config";
import {
  createMetaTools,
} from "./tools/meta";
import { tavilySearch } from "./tools/tavily";
import {
  githubReadFile,
  githubWriteFile,
  githubListRepoContents,
  githubCreateRepo,
  githubListRepos,
  githubDispatchWorkflow,
} from "./tools/github";
import { webRequest, getToken } from "./tools/web-request";
import { loadSkillTools, getSkillContext } from "./skill-loader";

const log = (...args: unknown[]) => console.log("[agent]", ...args);
const logErr = (...args: unknown[]) => console.error("[agent]", ...args);

const DEFAULT_SYSTEM_PROMPT = `You are an AI agency assistant with full self-management capabilities.

## TOOLS
- **Self-Management**: Read/update your own config, model, channels, API keys
- **Workspace**: Read/write your BOOTSTRAP.md, SOUL.md, USER.md files to customize yourself
- **Config Patch**: Modify your own configuration (model, channels, skills, etc.)
- **Web Search**: Search the web for current information using Tavily
- **GitHub**: Read/write files, list repos, create repos, trigger workflows
- **Web Request**: Call ANY external API using stored tokens (Vercel, Netlify, Slack, etc.)
- **Skills**: Dynamic capabilities loaded from user-installed skills

## SELF-EDITING
You can modify your own behavior by:
1. Writing to workspace files (BOOTSTRAP.md, SOUL.md, USER.md) — changes your system prompt
2. Patching config — changes model, channels, skills settings
3. Setting API keys — enables new providers

## DEPLOYMENT (SaaS-friendly)
Instead of running commands locally, use web_request with stored tokens to:
- Deploy via Vercel API (tokenProvider: "vercel")
- Deploy via Netlify API (tokenProvider: "netlify")
- Manage GitHub repos and trigger CI/CD workflows

Always be helpful, concise, and action-oriented.`;

export async function buildToolSet(userId: string): Promise<ToolSet> {
  const metaTools = createMetaTools(userId);

  const workspaceTools = {};  // Now included in metaTools

  const builtInTools = {
    tavily_search: tavilySearch,
    github_read_file: githubReadFile,
    github_write_file: githubWriteFile,
    github_list_repo_contents: githubListRepoContents,
    github_create_repo: githubCreateRepo,
    github_list_repos: githubListRepos,
    github_dispatch_workflow: githubDispatchWorkflow,
    web_request: webRequest,
    get_token: getToken,
  };

  // Load dynamic skill tools from user's installed skills
  let skillTools: ToolSet = {};
  try {
    skillTools = await loadSkillTools(userId);
  } catch {
    // skills not loaded — proceed without
  }

  return { ...builtInTools, ...metaTools, ...workspaceTools, ...skillTools };
}

async function getSystemPrompt(userId: string): Promise<string> {
  const parts: string[] = [];

  try {
    const workspacePrompt = await buildSystemPromptFromWorkspace(userId);
    parts.push(workspacePrompt.trim() || DEFAULT_SYSTEM_PROMPT);
  } catch {
    parts.push(DEFAULT_SYSTEM_PROMPT);
  }

  try {
    const config = await loadConfig(userId);
    if (config.systemPrompt) parts.push(config.systemPrompt);
  } catch {
    // ignore
  }

  // Inject active skills context so the AI knows what's available
  try {
    const skillContext = await getSkillContext(userId);
    if (skillContext) parts.push(skillContext);
  } catch {
    // ignore
  }

  return parts.join("\n\n---\n\n");
}

export async function getAgentConfig(userId: string) {
  log("getAgentConfig() called, userId:", userId || "none");
  const tools = await buildToolSet(userId);
  log("Tools built, count:", Object.keys(tools).length);
  const systemPrompt = await getSystemPrompt(userId);
  log("System prompt built, length:", systemPrompt.length);

  let model: LanguageModel;
  try {
    model = await resolveModel(undefined, userId);
    log("Model resolved:", (model as any).modelId || "unknown");
  } catch (e) {
    logErr("resolveModel() failed:", e);
    throw new Error("No AI provider configured. Set an API key first.");
  }

  return {
    model,
    system: systemPrompt,
    tools,
    maxSteps: 20,
  };
}
