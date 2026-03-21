import { mongoose } from "../db";

const pairingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      required: true,
      enum: ["whatsapp", "telegram"],
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: String,
    code: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

// Compound index: one pending request per sender per user per channel
pairingSchema.index(
  { userId: 1, channel: 1, senderId: 1, status: 1 },
  { unique: false }
);

export const Pairing =
  mongoose.models.Pairing || mongoose.model("Pairing", pairingSchema);
