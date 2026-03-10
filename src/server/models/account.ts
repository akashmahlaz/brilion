import { mongoose } from "../db";

const accountSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true },
    providerId: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accessToken: String,
    refreshToken: String,
    idToken: String,
    accessTokenExpiresAt: Date,
    refreshTokenExpiresAt: Date,
    scope: String,
    password: String,
  },
  { timestamps: true }
);

export const Account =
  mongoose.models.Account || mongoose.model("Account", accountSchema);
