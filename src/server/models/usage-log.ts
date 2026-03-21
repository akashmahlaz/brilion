import mongoose, { Schema } from "mongoose";

export interface IUsageLog {
  userId: string;
  conversationId?: string;
  channel: "web" | "whatsapp" | "telegram";
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls: number;
  success: boolean;
  error?: string;
  createdAt: Date;
}

const UsageLogSchema = new Schema<IUsageLog>(
  {
    userId: { type: String, required: true, index: true },
    conversationId: { type: String },
    channel: { type: String, enum: ["web", "whatsapp", "telegram"], default: "web" },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    toolCalls: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    error: { type: String },
  },
  { timestamps: true }
);

UsageLogSchema.index({ userId: 1, createdAt: -1 });
UsageLogSchema.index({ userId: 1, model: 1, createdAt: -1 });

// Cost per 1M tokens (approximate, can be updated in config)
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "claude-opus-4-20250514": { input: 15, output: 75 },
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-haiku-4-20250514": { input: 0.8, output: 4 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "mistral-large-latest": { input: 2, output: 6 },
  "grok-3": { input: 3, output: 15 },
};

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model];
  if (!costs) return 0;
  return (promptTokens * costs.input + completionTokens * costs.output) / 1_000_000;
}

export const UsageLog =
  mongoose.models.UsageLog || mongoose.model<IUsageLog>("UsageLog", UsageLogSchema);
