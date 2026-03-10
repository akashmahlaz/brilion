import { mongoose } from "../db";

const userSkillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    content: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    createdBy: {
      type: String,
      enum: ["system", "user", "ai"],
      default: "system",
    },
  },
  { timestamps: true }
);

userSkillSchema.index({ userId: 1, name: 1 }, { unique: true });

export const UserSkill =
  mongoose.models.UserSkill || mongoose.model("UserSkill", userSkillSchema);
