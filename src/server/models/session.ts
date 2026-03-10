import { mongoose } from "../db";

const sessionSchema = new mongoose.Schema(
  {
    expiresAt: { type: Date, required: true },
    token: { type: String, required: true, unique: true, index: true },
    ipAddress: String,
    userAgent: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const Session =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);
