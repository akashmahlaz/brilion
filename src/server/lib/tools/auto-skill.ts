import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { UserSkill } from "../../models/user-skill";
import { connectDB } from "../../db";

/**
 * AI-driven auto-skill creation tool.
 * The AI can call this when it detects a recurring user pattern
 * or when a non-tech user describes what they want in plain language.
 * No manual user intervention needed.
 */
export function createAutoSkillTool(userId: string) {
  return toolDefinition({
    name: "auto_create_skill",
    description:
      "Create a reusable skill from a detected pattern OR from a user's plain-language description. " +
      "Use case 1: You notice recurring patterns (e.g., always wants code reviews in a specific style). " +
      "Use case 2: A non-technical user says 'I want a skill that...' or 'make me a skill for...'. " +
      "Generate the full skill instructions yourself — the user doesn't need to write any YAML or markdown. " +
      "The skill will be permanently saved and loaded into your context for all future conversations.",
    inputSchema: z.object({
      name: z
        .string()
        .describe(
          "Short kebab-case name for the skill (e.g., 'standup-report', 'pr-review-style')"
        ),
      description: z
        .string()
        .describe("One-line description of what this skill does"),
      category: z
        .string()
        .describe(
          "Category: productivity, development, communication, automation, or general"
        ),
      emoji: z.string().describe("Single emoji representing this skill"),
      instructions: z
        .string()
        .describe(
          "Detailed skill instructions in markdown. Include: when to activate, step-by-step behavior, formatting rules, and any user preferences learned."
        ),
    }),
  }).server(
    async ({
      name,
      description,
      category,
      emoji,
      instructions,
    }: {
      name: string;
      description: string;
      category: string;
      emoji: string;
      instructions: string;
    }) => {
      await connectDB();

      // Sanitize name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);

      if (!slug) return { error: "Invalid skill name" };

      // Check if skill already exists
      const existing = await UserSkill.findOne({ userId, name: slug });
      if (existing) {
        // Update existing skill
        existing.description = description;
        existing.content = buildSkillContent({
          slug,
          description,
          emoji,
          instructions,
        });
        existing.category = category;
        existing.isEnabled = true;
        await existing.save();
        return {
          status: "updated",
          skill: slug,
          note: `Skill "${slug}" updated and active. It will be loaded in all future conversations.`,
        };
      }

      // Create new skill
      await UserSkill.create({
        userId,
        name: slug,
        description,
        content: buildSkillContent({ slug, description, emoji, instructions }),
        category,
        isEnabled: true,
        createdBy: "ai",
      });

      return {
        status: "created",
        skill: slug,
        note: `Skill "${slug}" created and active. It will be loaded in all future conversations automatically.`,
      };
    }
  );
}

function buildSkillContent(opts: {
  slug: string;
  description: string;
  emoji: string;
  instructions: string;
}): string {
  return `---
name: ${opts.slug}
description: ${opts.description}
emoji: ${opts.emoji}
---

# ${opts.slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")} Skill

${opts.instructions}`;
}
