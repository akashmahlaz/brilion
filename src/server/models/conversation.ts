import { mongoose } from "../db";

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, default: "New Chat" },
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant", "system", "tool"],
          required: true,
        },
        content: { type: String, default: "" },
        parts: { type: mongoose.Schema.Types.Mixed },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    model: String,
    provider: String,
    channel: {
      type: String,
      enum: ["web", "whatsapp", "telegram"],
      default: "web",
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Conversation =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);
