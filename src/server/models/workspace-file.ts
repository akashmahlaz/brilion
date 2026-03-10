import { mongoose } from "../db";

const workspaceFileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    filename: { type: String, required: true },
    content: { type: String, default: "" },
  },
  { timestamps: true }
);

workspaceFileSchema.index({ userId: 1, filename: 1 }, { unique: true });

export const WorkspaceFile =
  mongoose.models.WorkspaceFile ||
  mongoose.model("WorkspaceFile", workspaceFileSchema);
