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
    category: { type: String, default: "general" },
    version: { type: String, default: "1.0.0" },
    downloads: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    sourceRepo: { type: String, default: "" },
    createdBy: {
      type: String,
      enum: ["system", "user", "ai", "marketplace"],
      default: "system",
    },
  },
  { timestamps: true }
);

userSkillSchema.index({ userId: 1, name: 1 }, { unique: true });

export const UserSkill =
  mongoose.models.UserSkill || mongoose.model("UserSkill", userSkillSchema);
