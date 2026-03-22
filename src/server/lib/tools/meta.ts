import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { loadConfig, saveConfig } from "../config";
import { getAvailableProviders } from "../providers";
import {
  readWorkspaceFile,
  writeWorkspaceFile,
  listWorkspaceFiles,
  ensureWorkspace,
} from "../workspace";
import { indexWorkspaceFile } from "../memory-manager";
import {
  listAuthProfiles,
  upsertAuthProfile,
} from "../auth-profiles";

export function createMetaTools(userId: string) {
  const readOwnConfig = toolDefinition({
    name: "read_own_config",
    description:
      "Read the agent's current configuration including model, channels (with DM policies, allowed senders, self-chat mode), skills, auth profiles, and workspace info.",
    inputSchema: z.object({}),
  }).server(async () => {
    const config = await loadConfig(userId);
    const providers = await getAvailableProviders(userId);
    const profiles = await listAuthProfiles(userId);
    return {
      config: {
        model: config.agents.defaults.model,
        channels: {
          whatsapp: {
            enabled: config.channels.whatsapp.enabled,
            dmPolicy: config.channels.whatsapp.dmPolicy,
            selfChatMode: config.channels.whatsapp.selfChatMode,
            allowFrom: config.channels.whatsapp.allowFrom,
            groupPolicy: config.channels.whatsapp.groupPolicy,
            groupAllowFrom: config.channels.whatsapp.groupAllowFrom,
            onboarded: config.channels.whatsapp.onboarded,
          },
          telegram: {
            enabled: config.channels.telegram.enabled,
            dmPolicy: config.channels.telegram.dmPolicy,
            allowFrom: config.channels.telegram.allowFrom,
            groupPolicy: config.channels.telegram.groupPolicy,
            groupAllowFrom: config.channels.telegram.groupAllowFrom,
          },
        },
        skillCount: Object.keys(config.skills.entries).length,
      },
      authProfiles: profiles,
      availableProviders: providers,
    };
  });

  const updateModel = toolDefinition({
    name: "update_model",
    description:
      "Change the AI model. Use provider/model format (e.g. 'github/gpt-4.1', 'anthropic/claude-opus-4-20250514').",
    inputSchema: z.object({
      primary: z.string().describe("Primary model in provider:model format"),
      fallbacks: z
        .array(z.string())
        .optional()
        .describe("Fallback models in provider:model format"),
    }),
  }).server(async ({ primary, fallbacks }) => {
    const config = await loadConfig(userId);
    config.agents.defaults.model.primary = primary;
    if (fallbacks) config.agents.defaults.model.fallbacks = fallbacks;
    await saveConfig(config);
    return { status: "ok", model: config.agents.defaults.model };
  });

  const toggleChannel = toolDefinition({
    name: "toggle_channel",
    description: "Enable or disable a messaging channel (whatsapp, telegram).",
    inputSchema: z.object({
      channel: z.enum(["whatsapp", "telegram"]).describe("Channel name"),
      enabled: z.boolean().describe("Whether to enable the channel"),
    }),
  }).server(async ({ channel, enabled }) => {
    const config = await loadConfig(userId);
    config.channels[channel].enabled = enabled;
    await saveConfig(config);
    return { status: "ok", channel, enabled };
  });

  const updateChannelPermissions = toolDefinition({
    name: "update_channel_permissions",
    description:
      `Update who the AI is allowed to reply to on a messaging channel. ` +
      `Use this when the user asks to restrict, open, or change message permissions. ` +
      `dmPolicy values: "open" (reply to everyone), "allowlist" (only listed numbers), "disabled" (reply to nobody). ` +
      `allowFrom is an array of phone numbers (e.g. ["+919876543210"]). Use ["*"] for everyone. ` +
      `selfChatMode controls whether the AI replies when the owner messages their own WhatsApp number.`,
    inputSchema: z.object({
      channel: z.enum(["whatsapp", "telegram"]).describe("Channel name"),
      dmPolicy: z
        .enum(["open", "pairing", "allowlist", "disabled"])
        .optional()
        .describe("DM policy — who can message"),
      allowFrom: z
        .array(z.string())
        .optional()
        .describe('Array of allowed phone numbers / usernames. ["*"] = everyone'),
      selfChatMode: z
        .boolean()
        .optional()
        .describe("Whether the AI replies to the owner's self-chat on WhatsApp"),
      groupPolicy: z
        .enum(["open", "allowlist", "disabled"])
        .optional()
        .describe("Group chat policy"),
      groupAllowFrom: z
        .array(z.string())
        .optional()
        .describe("Allowed group senders"),
    }),
  }).server(async ({ channel, dmPolicy, allowFrom, selfChatMode, groupPolicy, groupAllowFrom }) => {
    const config = await loadConfig(userId);
    const ch = config.channels[channel];
    if (dmPolicy !== undefined) ch.dmPolicy = dmPolicy;
    if (allowFrom !== undefined) ch.allowFrom = allowFrom;
    if (selfChatMode !== undefined && channel === "whatsapp") ch.selfChatMode = selfChatMode;
    if (groupPolicy !== undefined) ch.groupPolicy = groupPolicy;
    if (groupAllowFrom !== undefined) ch.groupAllowFrom = groupAllowFrom;
    await saveConfig(config);
    return {
      status: "ok",
      channel,
      dmPolicy: ch.dmPolicy,
      allowFrom: ch.allowFrom,
      selfChatMode: (ch as any).selfChatMode,
      groupPolicy: ch.groupPolicy,
    };
  });

  const updateSystemPrompt = toolDefinition({
    name: "update_system_prompt",
    description: "Update the agent's system prompt / instructions.",
    needsApproval: true,
    inputSchema: z.object({
      prompt: z.string().describe("The new system prompt text"),
    }),
  }).server(async ({ prompt }) => {
    const config = await loadConfig(userId);
    config.systemPrompt = prompt;
    await saveConfig(config);
    return { status: "ok", length: prompt.length };
  });

  const setApiKey = toolDefinition({
    name: "set_api_key",
    description:
      "Set or update an API key for a provider. Stores in auth-profiles (MongoDB-backed).",
    needsApproval: true,
    inputSchema: z.object({
      key: z.string().describe("Environment variable name (e.g. OPENAI_API_KEY)"),
      value: z.string().describe("The API key value"),
    }),
  }).server(async ({ key, value }) => {
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
      }, userId);
    }

    return {
      status: "ok",
      key,
      note: provider
        ? "Key saved to auth-profiles"
        : "Key not recognized as a known provider",
    };
  });

  const readWorkspaceFileT = toolDefinition({
    name: "read_workspace_file",
    description:
      "Read one of the agent's workspace files (BOOTSTRAP.md, SOUL.md, USER.md, HEARTBEAT.md, TOOLS.md).",
    inputSchema: z.object({
      file: z.string().describe("Filename to read"),
    }),
  }).server(async ({ file }) => {
    await ensureWorkspace(userId);
    const content = await readWorkspaceFile(file, userId);
    if (content === null)
      return { error: `File '${file}' not found in workspace` };
    return { file, content, length: content.length };
  });

  const writeWorkspaceFileT = toolDefinition({
    name: "write_workspace_file",
    description: "Write/update a workspace file to modify the agent's behavior.",
    needsApproval: true,
    inputSchema: z.object({
      file: z.string().describe("Filename to write"),
      content: z.string().describe("New file content"),
    }),
  }).server(async ({ file, content }) => {
    if (!file.endsWith(".md")) return { error: "Only .md files allowed" };
    await writeWorkspaceFile(file, content, userId);
    // Auto-reindex into memory so changes become searchable immediately
    const chunksIndexed = await indexWorkspaceFile(userId, file).catch(() => 0);
    return { status: "ok", file, length: content.length, chunksIndexed };
  });

  const listWorkspaceFilesT = toolDefinition({
    name: "list_workspace_files",
    description: "List all files in the agent's workspace directory.",
    inputSchema: z.object({}),
  }).server(async () => {
    await ensureWorkspace(userId);
    const files = await listWorkspaceFiles(userId);
    return { files };
  });

  const patchConfig = toolDefinition({
    name: "patch_config",
    description:
      "Patch the agent's configuration with a specific path + value.",
    needsApproval: true,
    inputSchema: z.object({
      path: z.string().describe("Dot-separated config path"),
      value: z.string().describe("New value (will be JSON-parsed if possible)"),
    }),
  }).server(async ({ path: configPath, value }) => {
    const config = await loadConfig(userId);
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
  });

  return [
    readOwnConfig,
    updateModel,
    toggleChannel,
    updateChannelPermissions,
    updateSystemPrompt,
    setApiKey,
    readWorkspaceFileT,
    writeWorkspaceFileT,
    listWorkspaceFilesT,
    patchConfig,
  ];
}
