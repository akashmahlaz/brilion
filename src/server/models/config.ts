import { mongoose } from "../db";

const configSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    meta: {
      lastTouchedVersion: { type: String, default: "1.0.0" },
      lastTouchedAt: { type: String, default: () => new Date().toISOString() },
    },
    agents: {
      defaults: {
        model: {
          primary: { type: String, default: "gpt-4o" },
          fallbacks: { type: [String], default: ["gpt-4.1"] },
        },
        workspace: { type: String, default: "./skills" },
        thinkingDefault: { type: String, default: "off" },
        maxConcurrent: { type: Number, default: 4 },
        compaction: { mode: { type: String, default: "safeguard" } },
      },
    },
    channels: {
      whatsapp: {
        enabled: { type: Boolean, default: true },
        dmPolicy: { type: String, default: "pairing" },
        selfChatMode: { type: Boolean, default: true },
        onboarded: { type: Boolean, default: false },
        allowFrom: { type: [String], default: ["*"] },
        groupAllowFrom: { type: [String], default: ["*"] },
        groupPolicy: { type: String, default: "disabled" },
      },
      telegram: {
        enabled: { type: Boolean, default: true },
        dmPolicy: { type: String, default: "pairing" },
        allowFrom: { type: [String], default: [] },
        groupAllowFrom: { type: [String], default: ["*"] },
        groupPolicy: { type: String, default: "disabled" },
        botToken: String,
      },
    },
    skills: {
      entries: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    plugins: {
      entries: {
        type: mongoose.Schema.Types.Mixed,
        default: { whatsapp: { enabled: true }, telegram: { enabled: true } },
      },
    },
    gateway: {
      port: { type: Number, default: 18789 },
      mode: { type: String, default: "local" },
    },
    systemPrompt: String,
  },
  { timestamps: true }
);

export const Config =
  mongoose.models.Config || mongoose.model("Config", configSchema);
