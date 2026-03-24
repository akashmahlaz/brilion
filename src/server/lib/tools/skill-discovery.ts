import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { SkillCatalog } from "../../models/skill-catalog";
import { UserSkill } from "../../models/user-skill";
import { connectDB } from "../../db";
import {
  searchClawHub,
  browseClawHub,
  installFromClawHub,
} from "../skill-installer";

/**
 * AI skill discovery tool — searches BOTH the local Brilion catalog AND
 * the full ClawHub marketplace (34,000+ skills). Designed for non-tech
 * users who just describe what they need.
 */
export function createSkillDiscoveryTool(userId: string) {
  return toolDefinition({
    name: "discover_skills",
    description:
      "Search for skills to extend your capabilities. Searches both the Brilion curated catalog " +
      "AND the ClawHub marketplace (34,000+ community skills). " +
      "Use this when the user asks for something that could be handled by a skill " +
      "(e.g., 'track my expenses', 'help me with Notion', 'monitor a website', 'search X/Twitter'). " +
      "You can search by keyword, browse popular skills, or install directly by slug. " +
      "After installing, the skill's instructions will be available in future conversations.",
    inputSchema: z.object({
      action: z
        .enum(["search", "install", "install-clawhub", "browse", "list-categories"])
        .describe(
          "search: find skills matching a query (searches both local catalog + ClawHub). " +
          "install: install from local Brilion catalog by slug. " +
          "install-clawhub: install from ClawHub marketplace by slug. " +
          "browse: show popular/trending ClawHub skills. " +
          "list-categories: show all local catalog categories."
        ),
      query: z
        .string()
        .optional()
        .describe("Search query for finding skills"),
      category: z
        .string()
        .optional()
        .describe("Filter by category"),
      slug: z
        .string()
        .optional()
        .describe("Skill slug to install (required for install actions)"),
      sort: z
        .enum(["newest", "downloads", "trending", "stars"])
        .optional()
        .describe("Sort order for browse action"),
    }),
  }).server(
    async ({
      action,
      query,
      category,
      slug,
      sort,
    }: {
      action: "search" | "install" | "install-clawhub" | "browse" | "list-categories";
      query?: string;
      category?: string;
      slug?: string;
      sort?: "newest" | "downloads" | "trending" | "stars";
    }) => {
      await connectDB();

      if (action === "list-categories") {
        const counts = await SkillCatalog.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]);
        return {
          categories: counts.map((c: any) => ({
            name: c._id,
            count: c.count,
          })),
          note: "These are Brilion curated categories. Use 'browse' or 'search' to explore 34,000+ ClawHub community skills too.",
        };
      }

      if (action === "browse") {
        const data = await browseClawHub({
          limit: 15,
          sort: sort || "downloads",
        });
        return {
          source: "clawhub",
          total: "34,000+ skills available",
          results: data.results.map((s) => ({
            slug: s.slug,
            name: s.name,
            description: s.description,
            author: s.author,
            downloads: s.downloads,
            stars: s.stars,
            highlighted: s.highlighted,
            official: s.official,
            installWith: `Use discover_skills(action: "install-clawhub", slug: "${s.slug}")`,
          })),
        };
      }

      if (action === "search") {
        if (!query && !category) {
          return { error: "Provide a search query or category" };
        }

        // Search local catalog first
        const filter: Record<string, unknown> = {};
        if (category && category !== "all") filter.category = category;
        if (query) filter.$text = { $search: query };

        let localResults = await SkillCatalog.find(filter)
          .sort(query ? { score: { $meta: "textScore" } } : { sortOrder: 1 })
          .limit(10)
          .lean();

        // Fallback to regex if text search returns nothing
        if (localResults.length === 0 && query) {
          const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          localResults = await SkillCatalog.find({
            $or: [
              { name: { $regex: safeQuery, $options: "i" } },
              { description: { $regex: safeQuery, $options: "i" } },
              { tags: { $regex: safeQuery, $options: "i" } },
            ],
            ...(category && category !== "all" ? { category } : {}),
          })
            .limit(10)
            .lean();
        }

        // Also search ClawHub marketplace
        let clawHubResults: Array<{
          slug: string;
          name: string;
          description: string;
          author: string;
          downloads: number;
          stars: number;
          highlighted: boolean;
          official: boolean;
        }> = [];
        if (query) {
          try {
            const clawHub = await searchClawHub(query);
            clawHubResults = clawHub.results;
          } catch {
            /* ClawHub unavailable — proceed with local results */
          }
        }

        // Check which ones the user already has installed
        const installedNames = await UserSkill.find({ userId })
          .select("name")
          .lean();
        const installedSet = new Set(
          installedNames.map((s: any) => s.name)
        );

        return {
          local: localResults.map((s: any) => ({
            source: "brilion",
            slug: s.slug,
            name: s.name,
            emoji: s.emoji,
            description: s.description,
            category: s.category,
            tags: s.tags,
            requires: s.requires,
            installs: s.installs,
            installed: installedSet.has(s.name),
            installWith: `discover_skills(action: "install", slug: "${s.slug}")`,
          })),
          clawhub: clawHubResults.map((s) => ({
            source: "clawhub",
            slug: s.slug,
            name: s.name,
            description: s.description,
            author: s.author,
            downloads: s.downloads,
            stars: s.stars,
            highlighted: s.highlighted,
            official: s.official,
            installed: installedSet.has(s.slug),
            installWith: `discover_skills(action: "install-clawhub", slug: "${s.slug}")`,
          })),
          note: localResults.length === 0 && clawHubResults.length === 0
            ? "No skills found. Try a different search term, or use auto_create_skill to build a custom one."
            : undefined,
        };
      }

      if (action === "install") {
        if (!slug) return { error: "slug is required for install action" };

        const catalogSkill = (await SkillCatalog.findOne({ slug }).lean()) as any;
        if (!catalogSkill) {
          return { error: `Skill "${slug}" not found in Brilion catalog. Try install-clawhub action for ClawHub marketplace skills.` };
        }

        const existing = await UserSkill.findOne({ userId, name: catalogSkill.name });
        if (existing) {
          return { status: "already-installed", slug, name: catalogSkill.name };
        }

        await UserSkill.create({
          userId,
          name: catalogSkill.name,
          description: catalogSkill.description,
          content: catalogSkill.content,
          category: catalogSkill.category,
          isEnabled: true,
          createdBy: "marketplace",
        });

        await SkillCatalog.updateOne({ slug }, { $inc: { installs: 1 } });

        return {
          status: "installed",
          slug,
          name: catalogSkill.name,
          note: `Skill "${catalogSkill.name}" ${catalogSkill.emoji} installed and active.`,
        };
      }

      if (action === "install-clawhub") {
        if (!slug) return { error: "slug is required" };

        const result = await installFromClawHub(userId, slug);
        if (result.status === "error") {
          return { error: result.error };
        }
        return {
          ...result,
          note: result.status === "installed"
            ? `Skill "${slug}" installed from ClawHub marketplace! It will be active in future conversations.`
            : `Skill "${slug}" is already installed.`,
        };
      }

      return { error: "Unknown action" };
    }
  );
}
