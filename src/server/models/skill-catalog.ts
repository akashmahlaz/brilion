import { mongoose } from "../db";

/**
 * Global skill catalog — curated skills available to all users.
 * Different from UserSkill (per-user installed skills).
 * Think of this as the "App Store" for skills.
 */
const skillCatalogSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    emoji: { type: String, default: "🔧" },
    category: {
      type: String,
      enum: [
        "productivity",
        "development",
        "communication",
        "automation",
        "smart-home",
        "media",
        "finance",
        "search",
        "writing",
        "data",
        "general",
      ],
      default: "general",
      index: true,
    },
    content: { type: String, required: true },
    /** Who contributed the skill */
    author: { type: String, default: "Brilion" },
    /** Where it came from */
    source: {
      type: String,
      enum: ["builtin", "openclaw", "community", "ai-generated"],
      default: "builtin",
    },
    /** Comma-separated tags for search */
    tags: [{ type: String }],
    /** What tools/tokens the skill uses */
    requires: [{ type: String }],
    /** Featured in "recommended" sections */
    featured: { type: Boolean, default: false },
    /** Display order weight */
    sortOrder: { type: Number, default: 100 },
    /** Install count across all users */
    installs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

skillCatalogSchema.index({ name: "text", description: "text", tags: "text" });

export const SkillCatalog =
  mongoose.models.SkillCatalog ||
  mongoose.model("SkillCatalog", skillCatalogSchema);
