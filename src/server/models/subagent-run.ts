import { mongoose } from "../db";

const subagentRunSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentConversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    agentSlug: { type: String, required: true },
    agentName: { type: String, default: "" },
    task: { type: String, required: true },
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "running",
    },
    result: { type: String, default: "" },
    error: { type: String, default: "" },
    model: { type: String, default: "" },
    provider: { type: String, default: "" },
    toolCallCount: { type: Number, default: 0 },
    stepsUsed: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

subagentRunSchema.index({ userId: 1, createdAt: -1 });
subagentRunSchema.index({ parentConversationId: 1 });

export const SubagentRun =
  mongoose.models.SubagentRun ||
  mongoose.model("SubagentRun", subagentRunSchema);
