import { mongoose } from "../db";

const verificationSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true },
    value: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Verification =
  mongoose.models.Verification ||
  mongoose.model("Verification", verificationSchema);
