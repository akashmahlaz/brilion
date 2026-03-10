import { mongoose } from "../db";

/** Stores Baileys auth state (creds + keys) in MongoDB. */
const waAuthSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    _id: { type: String }, // "userId:creds" or "userId:keys:<type>:<id>"
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const WaAuth =
  mongoose.models.WaAuth || mongoose.model("WaAuth", waAuthSchema);
