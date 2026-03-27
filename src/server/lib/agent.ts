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
import { createMemoryTools } from "./tools/memory";
import { loadSkillTools, getSkillContext } from "./skill-loader";
import { createSubagentTool, ensureDefaultAgents } from "./tools/subagent";
import { createImageGenTool } from "./tools/image-gen";
import { createTTSTool } from "./tools/tts";
import { createStructuredOutputTool } from "./tools/structured";
import { createAutoSkillTool } from "./tools/auto-skill";
import { createSkillDiscoveryTool } from "./tools/skill-discovery";
import { createVideoGenTool } from "./tools/video-gen";
import { createChannelMediaTools } from "./tools/channel-media";
import { createLogger } from "../models/log-entry";
import { searchMemory } from "./memory-manager";
import { getHookRunner, hasHooks } from "./hooks";

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
- **Memory**: Search your long-term memory for past conversations, user preferences, and decisions
- **Image Generation**: Generate images using generate_image. Choose the best model: dall-e-3 (artistic, creative) or gpt-image-1 (accurate, text rendering). All images uploaded to CDN automatically.
- **Video Generation**: Generate videos from text prompts or images using generate_video (Sora). Videos uploaded to CDN for permanent storage. When the user uploads an image, its CDN URL (https://res.cloudinary.com/...) is available in the message — pass it directly as image_url.
- **Text-to-Speech**: Convert text to audio using text_to_speech — great for voice messages. Audio uploaded to CDN.
- **Channel Media**: After generating media (image/audio/video), ALWAYS send it to the channel using send_image_to_channel, send_audio_to_channel, or send_video_to_channel. The tools are pre-configured with the current channel — just pass the media URL.
- **Structured Output**: Generate structured JSON data using structured_output
- **Sub-Agents**: Delegate complex tasks to specialized agents using spawn_subagent (researcher, coder, planner, writer)
- **Auto-Skills**: When you notice recurring patterns in the user's requests, use auto_create_skill to save reusable instructions that persist across all future conversations
- **Skill Discovery**: Use discover_skills to search the Brilion skill catalog and install new capabilities on demand
- **Failure Handling**: If a tool fails, keep replies short (1-2 lines), explain the exact cause, and retry automatically with a safer fallback when possible. Avoid long option lists unless the user asks.

## SKILL DISCOVERY — PROACTIVE
When the user asks for something you don't have a specific skill for:
1. Use discover_skills(action: "search", query: "...") to find relevant skills in the catalog
2. Show the user what's available and offer to install with discover_skills(action: "install", slug: "...")
3. Once installed, the skill loads automatically in future conversations
4. Examples: user says "track my expenses" → search for expense skills → install expense-tracker

## SKILL LEARNING — PROACTIVE
When you notice the user repeatedly asks for similar things (same format, same workflow, same style):
1. Use auto_create_skill to save the pattern as a reusable skill
2. The skill will automatically load in all future conversations
3. Examples: "always review code in this format", "draft emails in my style", "summarize meetings with action items"

## MEMORY RECALL — CRITICAL
Before answering about prior work, decisions, people, preferences, projects, or todos:
1. Run memory_search(query) to find relevant memories
2. Use memory_get(filename, startLine, numLines) to pull exact content
3. After updating workspace files (SOUL.md, USER.md, MEMORY.md), run memory_index() to make changes searchable
4. Always check USER.md for user preferences before giving advice

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

export async function buildToolSet(
  userId: string,
  conversationId?: string,
  channelContext?: { channelId: string; channel: "whatsapp" | "telegram" }
): Promise<Array<Tool>> {
  const metaTools = createMetaTools(userId);
  const memoryTools = createMemoryTools(userId);

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

  // AI-powered tools (image gen, TTS, video gen, structured output, sub-agents, auto-skills)
  const aiTools: Tool[] = [
    createImageGenTool(userId),
    createTTSTool(userId),
    createVideoGenTool(userId),
    createStructuredOutputTool(userId),
    createSubagentTool(userId, conversationId),
    createAutoSkillTool(userId),
    createSkillDiscoveryTool(userId),
    ...createChannelMediaTools(userId, channelContext),
  ];

  // Ensure default agent profiles exist for sub-agent tool
  ensureDefaultAgents(userId).catch(() => {});

  // Load dynamic skill tools from user's installed skills
  let skillTools: Tool[] = [];
  try {
    skillTools = await loadSkillTools(userId);
  } catch {
    // skills not loaded — proceed without
  }

  return [...builtInTools, ...metaTools, ...memoryTools, ...aiTools, ...skillTools];
}

async function getSystemPrompt(
  userId: string,
  options: { channel?: string; userMessage?: string } = {}
): Promise<string> {
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

  // --- Session Startup: Date/Time + Channel Awareness ---
  // Use user's configured timezone (OpenClaw-style)
  let userTimezone = "UTC";
  try {
    const cfg = await loadConfig(userId);
    userTimezone = cfg.agents?.defaults?.userTimezone || "UTC";
  } catch {
    // ignore
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: userTimezone,
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
    timeZone: userTimezone,
  });
  const utcStr = now.toISOString().slice(0, 16).replace("T", " ") + " UTC";

  let channelDirective = "";
  if (options.channel === "whatsapp") {
    channelDirective = `\n## Active Channel: WHATSAPP
- Keep replies SHORT and punchy — max 2-3 sentences unless asked for detail
- Use line breaks, not paragraphs
- Emoji is OK if it matches user's style
- No markdown headers, code blocks, or markdown image links (WhatsApp renders them as plain text)
- MEDIA DELIVERY: After calling generate_image, you MUST call send_image_to_channel to deliver the image. Do NOT put markdown image links in your text — the user cannot see them on WhatsApp.
- AUDIO DELIVERY: After calling text_to_speech, you MUST call send_audio_to_channel to deliver the voice note.
- VIDEO DELIVERY: After calling generate_video, you MUST call send_video_to_channel to deliver the video.
- Your text reply should just confirm the action (e.g. "Done, here's your image!") — the media is sent separately.`;
  } else if (options.channel === "telegram") {
    channelDirective = `\n## Active Channel: TELEGRAM
- Medium-length replies — more room than WhatsApp but stay concise
- Telegram supports basic markdown (bold, italic, code)
- Use formatting sparingly`;
  } else {
    channelDirective = `\n## Active Channel: WEB DASHBOARD
- You can use longer, richer replies with full markdown formatting
- Use headers, lists, code blocks, tables when helpful
- Be thorough but conversational`;
  }

  parts.push(`## Current Context
Date: ${dateStr}
Time: ${timeStr} (${userTimezone}) / ${utcStr}
${channelDirective}

## Session Startup — EXECUTE EVERY CONVERSATION
1. Mentally recall who the user is from your loaded system prompt (USER.md / SOUL.md)
2. If this is a NEW conversation (first message), greet them BY NAME warmly
3. Reference something you remember about them (a project, preference, recent topic) if available
4. If USER.md says "(No preferences set yet)" — run the FIRST-RUN PROTOCOL from BOOTSTRAP.md
5. NEVER say "Hello! How can I assist you today?" — that's a generic bot. You are PERSONAL.
6. Match their communication style from SOUL.md
7. When you learn something new about the user, IMMEDIATELY update USER.md using write_workspace_file`);

  // --- Memory Pre-fetch: Auto-recall relevant context ---
  if (options.userMessage && options.userMessage.length > 5) {
    try {
      const results = await searchMemory(userId, options.userMessage, { topK: 3 });
      if (results.length > 0) {
        const memoryBlock = results
          .map(r => `- [${r.source}] ${r.text.slice(0, 300)}`)
          .join("\n");
        parts.push(`## Auto-Recalled Memories (relevant to this message)
${memoryBlock}
Use these memories naturally in your response. Don't say "according to my memory" — just know it.`);
      }
    } catch {
      // Memory search failed — continue without
    }
  }

  let assembled = parts.join("\n\n---\n\n");

  // Run before_prompt_build modifying hook — plugins can prepend/append/replace the system prompt
  if (hasHooks("before_prompt_build")) {
    const hookResult = await getHookRunner().runBeforePromptBuild({
      userId,
      channel: options.channel || "web",
      messages: [],
      currentSystemPrompt: assembled,
    });
    if (hookResult.systemPrompt) assembled = hookResult.systemPrompt;
    if (hookResult.prependContext || hookResult.prependSystemContext) {
      assembled = (hookResult.prependContext || hookResult.prependSystemContext) + "\n\n" + assembled;
    }
    if (hookResult.appendSystemContext) {
      assembled = assembled + "\n\n" + hookResult.appendSystemContext;
    }
  }

  return assembled;
}

export async function getAgentConfig(
  userId: string,
  options: { channel?: string; channelId?: string; userMessage?: string } = {}
) {
  log("getAgentConfig() called, userId:", userId || "none");
  const sysLogger = createLogger(userId, "agent");

  // Build channel context for media tools (auto-binds channelId/channel)
  const channelContext = options.channelId && (options.channel === "whatsapp" || options.channel === "telegram")
    ? { channelId: options.channelId, channel: options.channel as "whatsapp" | "telegram" }
    : undefined;

  const tools = await buildToolSet(userId, undefined, channelContext);
  const toolNames = tools.map((t) => t.name);
  log("Tools built, count:", tools.length);

  const systemPrompt = await getSystemPrompt(userId, options);
  log("System prompt built, length:", systemPrompt.length);

  let adapter: AnyTextAdapter;
  try {
    // Run before_model_resolve modifying hook — plugins can override model/provider
    let modelSpec: string | undefined;
    if (hasHooks("before_model_resolve")) {
      const hookResult = await getHookRunner().runBeforeModelResolve({
        userId,
        channel: options.channel || "web",
        requestedModel: undefined,
      });
      if (hookResult.modelOverride) modelSpec = hookResult.modelOverride;
    }

    adapter = await resolveModel(modelSpec, userId);
    const adapterModel = (adapter as any).model || "unknown";
    const adapterProvider = (adapter as any).provider || "unknown";
    log("Adapter resolved:", adapterModel);

    // Deep diagnostic log: full agent config summary
    sysLogger.info("Agent config built", {
      model: adapterModel,
      provider: adapterProvider,
      toolCount: tools.length,
      tools: toolNames,
      systemPromptLength: systemPrompt.length,
      maxSteps: 20,
      adapterType: adapter?.constructor?.name || typeof adapter,
    });
  } catch (e) {
    logErr("resolveModel() failed:", e);
    sysLogger.error("Agent config failed — no AI provider", {
      error: e instanceof Error ? e.message : String(e),
    });
    throw new Error("No AI provider configured. Set an API key first.");
  }

  return {
    adapter,
    systemPrompts: [systemPrompt],
    tools,
    maxSteps: 20,
  };
}
