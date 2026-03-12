import { mongoose } from "../db";

/** Stores Baileys auth state (creds + keys) in MongoDB. */
const waAuthSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      index: true,
    },
    _id: { type: String }, // "userId:creds" or "userId:keys:<type>:<id>"
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const WaAuth =
  mongoose.models.WaAuth || mongoose.model("WaAuth", waAuthSchema);
