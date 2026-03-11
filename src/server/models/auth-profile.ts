import { mongoose } from "../db";

const authProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    profileId: { type: String, required: true, index: true },
    type: { type: String, enum: ["api_key", "token", "oauth"], required: true },
    provider: { type: String, required: true, index: true },
    token: { type: String, required: true },
    tokenRef: String,
    expiresAt: Number,
    baseUrl: String,
  },
  { timestamps: true }
);

authProfileSchema.index({ userId: 1, profileId: 1 }, { unique: true });

export const AuthProfile =
  mongoose.models.AuthProfile ||
  mongoose.model("AuthProfile", authProfileSchema);
