import { mongoose } from "../db";

const agentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    systemPrompt: { type: String, default: "" },
    model: { type: String, default: "" },
    provider: { type: String, default: "" },
    /** Whitelist of tool names this agent can use. Empty = all tools. */
    allowedTools: [{ type: String }],
    /** Max agentic loop iterations for this sub-agent */
    maxSteps: { type: Number, default: 10 },
    isBuiltin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

agentProfileSchema.index({ userId: 1, slug: 1 }, { unique: true });

export const AgentProfile =
  mongoose.models.AgentProfile ||
  mongoose.model("AgentProfile", agentProfileSchema);
