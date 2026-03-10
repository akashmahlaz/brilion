import { tool } from "ai";
import { z } from "zod";
import { loadConfig, saveConfig } from "../config";
import { getAvailableProviders } from "../providers";
import {
  readWorkspaceFile,
  writeWorkspaceFile,
  listWorkspaceFiles,
  ensureWorkspace,
} from "../workspace";
import {
  listAuthProfiles,
  upsertAuthProfile,
} from "../auth-profiles";

export const readOwnConfig = tool({
  description:
    "Read the agent's current configuration including model, channels, skills, auth profiles, and workspace info.",
  inputSchema: z.object({}),
  execute: async () => {
    const config = await loadConfig();
    const providers = await getAvailableProviders();
    const profiles = await listAuthProfiles();
    return {
      config: {
        model: config.agents.defaults.model,
        channels: {
          whatsapp: {
            enabled: config.channels.whatsapp.enabled,
            dmPolicy: config.channels.whatsapp.dmPolicy,
            onboarded: config.channels.whatsapp.onboarded,
          },
          telegram: { enabled: config.channels.telegram.enabled },
        },
        gateway: { port: config.gateway.port, mode: config.gateway.mode },
        skillCount: Object.keys(config.skills.entries).length,
      },
      authProfiles: profiles,
      availableProviders: providers,
    };
  },
});

export const updateModel = tool({
  description:
    "Change the AI model. Use provider/model format (e.g. 'github/gpt-4.1', 'anthropic/claude-opus-4-20250514').",
  inputSchema: z.object({
    primary: z.string().describe("Primary model in provider:model format"),
    fallbacks: z
      .array(z.string())
      .optional()
      .describe("Fallback models in provider:model format"),
  }),
  execute: async ({ primary, fallbacks }) => {
    const config = await loadConfig();
    config.agents.defaults.model.primary = primary;
    if (fallbacks) config.agents.defaults.model.fallbacks = fallbacks;
    await saveConfig(config);
    return { status: "ok", model: config.agents.defaults.model };
  },
});

export const toggleChannel = tool({
  description: "Enable or disable a messaging channel (whatsapp, telegram).",
  inputSchema: z.object({
    channel: z.enum(["whatsapp", "telegram"]).describe("Channel name"),
    enabled: z.boolean().describe("Whether to enable the channel"),
  }),
  execute: async ({ channel, enabled }) => {
    const config = await loadConfig();
    config.channels[channel].enabled = enabled;
    await saveConfig(config);
    return { status: "ok", channel, enabled };
  },
});

export const updateSystemPrompt = tool({
  description: "Update the agent's system prompt / instructions.",
  inputSchema: z.object({
    prompt: z.string().describe("The new system prompt text"),
  }),
  execute: async ({ prompt }) => {
    const config = await loadConfig();
    config.systemPrompt = prompt;
    await saveConfig(config);
    return { status: "ok", length: prompt.length };
  },
});

export const setApiKey = tool({
  description:
    "Set or update an API key for a provider. Stores in auth-profiles (MongoDB-backed).",
  inputSchema: z.object({
    key: z
      .string()
      .describe("Environment variable name (e.g. OPENAI_API_KEY)"),
    value: z.string().describe("The API key value"),
  }),
  execute: async ({ key, value }) => {
    const envToProvider: Record<string, string> = {
      OPENAI_API_KEY: "openai",
      ANTHROPIC_API_KEY: "anthropic",
      GOOGLE_GENERATIVE_AI_API_KEY: "google",
      GITHUB_TOKEN: "github",
      GITHUB_COPILOT_TOKEN: "github-copilot",
      XAI_API_KEY: "xai",
      OPENROUTER_API_KEY: "openrouter",
    };

    const provider = envToProvider[key];
    if (provider) {
      await upsertAuthProfile(provider, {
        type: "api_key",
        provider,
        token: value,
      });
    }

    return {
      status: "ok",
      key,
      note: provider
        ? "Key saved to auth-profiles"
        : "Key not recognized as a known provider",
    };
  },
});

export const readWorkspaceFileT = tool({
  description:
    "Read one of the agent's workspace files (BOOTSTRAP.md, SOUL.md, USER.md, HEARTBEAT.md, TOOLS.md).",
  inputSchema: z.object({
    file: z.string().describe("Filename to read"),
  }),
  execute: async ({ file }) => {
    await ensureWorkspace();
    const content = await readWorkspaceFile(file);
    if (content === null)
      return { error: `File '${file}' not found in workspace` };
    return { file, content, length: content.length };
  },
});

export const writeWorkspaceFileT = tool({
  description: "Write/update a workspace file to modify the agent's behavior.",
  inputSchema: z.object({
    file: z.string().describe("Filename to write"),
    content: z.string().describe("New file content"),
  }),
  execute: async ({ file, content }) => {
    if (!file.endsWith(".md")) return { error: "Only .md files allowed" };
    await writeWorkspaceFile(file, content);
    return { status: "ok", file, length: content.length };
  },
});

export const listWorkspaceFilesT = tool({
  description: "List all files in the agent's workspace directory.",
  inputSchema: z.object({}),
  execute: async () => {
    await ensureWorkspace();
    const files = await listWorkspaceFiles();
    return { files };
  },
});

export const patchConfig = tool({
  description:
    "Patch the agent's configuration with a specific path + value.",
  inputSchema: z.object({
    path: z.string().describe("Dot-separated config path"),
    value: z.string().describe("New value (will be JSON-parsed if possible)"),
  }),
  execute: async ({ path: configPath, value }) => {
    const config = await loadConfig();
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
    const keys = configPath.split(".");
    let obj: any = config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] === undefined) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = parsed;
    await saveConfig(config);
    return { status: "ok", path: configPath, value: parsed };
  },
});
