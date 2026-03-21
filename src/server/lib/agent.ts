import type { AnyTextAdapter, Tool } from "@tanstack/ai";
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
- **Channel Permissions**: Control who can message you — use update_channel_permissions to change DM policy, allowed senders, self-chat mode, group policy. When the user says "don't reply to anyone except me", set dmPolicy to "allowlist" and put only the owner's number in allowFrom. When they say "reply to everyone", set dmPolicy to "open".
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
4. Updating channel permissions — controls who can DM you and how

## CHANNEL PERMISSION EXAMPLES
- "Only reply to me" → update_channel_permissions(channel="whatsapp", dmPolicy="allowlist", allowFrom=[owner's number])
- "Reply to everyone" → update_channel_permissions(channel="whatsapp", dmPolicy="open")
- "Stop replying on WhatsApp" → update_channel_permissions(channel="whatsapp", dmPolicy="disabled")
- "Allow my friend +91..." → read current allowFrom, append the number, then update

## DEPLOYMENT (SaaS-friendly)
Instead of running commands locally, use web_request with stored tokens to:
- Deploy via Vercel API (tokenProvider: "vercel")
- Deploy via Netlify API (tokenProvider: "netlify")
- Manage GitHub repos and trigger CI/CD workflows

Always be helpful, concise, and action-oriented.`;

export async function buildToolSet(userId: string): Promise<Array<Tool>> {
  const metaTools = createMetaTools(userId);

  const builtInTools: Tool[] = [
    tavilySearch,
    githubReadFile,
    githubWriteFile,
    githubListRepoContents,
    githubCreateRepo,
    githubListRepos,
    githubDispatchWorkflow,
    webRequest,
    getToken,
  ];

  // Load dynamic skill tools from user's installed skills
  let skillTools: Tool[] = [];
  try {
    skillTools = await loadSkillTools(userId);
  } catch {
    // skills not loaded — proceed without
  }

  return [...builtInTools, ...metaTools, ...skillTools];
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
  log("Tools built, count:", tools.length);
  const systemPrompt = await getSystemPrompt(userId);
  log("System prompt built, length:", systemPrompt.length);

  let adapter: AnyTextAdapter;
  try {
    adapter = await resolveModel(undefined, userId);
    log("Adapter resolved:", (adapter as any).model || "unknown");
  } catch (e) {
    logErr("resolveModel() failed:", e);
    throw new Error("No AI provider configured. Set an API key first.");
  }

  return {
    adapter,
    systemPrompts: [systemPrompt],
    tools,
    maxSteps: 20,
  };
}
