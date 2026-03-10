import { tool } from "ai";
import { z } from "zod";
import { UserSkill } from "../models/user-skill";
import { connectDB } from "../db";

export interface ParsedSkill {
  slug: string;
  name: string;
  description: string;
  emoji?: string;
  envVars: string[];
  rawContent: string;
}

/**
 * Parse a SKILL.md content string into a structured skill object.
 * Handles YAML frontmatter + markdown body.
 */
export function parseSkillContent(
  content: string,
  fallbackName: string
): ParsedSkill {
  const slug = fallbackName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Extract YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const fm = fmMatch ? fmMatch[1] : "";

  const name = yamlVal(fm, "name") || fallbackName;
  const description = yamlVal(fm, "description") || "";
  const emoji = yamlVal(fm, "emoji") || undefined;
  const envVars = yamlList(fm, "env");

  return { slug, name, description, emoji, envVars, rawContent: content };
}

function yamlVal(yaml: string, key: string): string {
  const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : "";
}

function yamlList(yaml: string, key: string): string[] {
  const m = yaml.match(
    new RegExp(`${key}:\\s*\\n((?:\\s+-\\s*.+\\n?)*)`, "m")
  );
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean)
    .map((v) => v.replace(/^['"]|['"]$/g, ""));
}

/**
 * Load all enabled skills for a user from MongoDB and convert to AI tools.
 * Each skill becomes a tool that injects the skill's instructions into the AI context.
 */
export async function loadSkillTools(
  userId?: string
): Promise<Record<string, any>> {
  await connectDB();
  const filter: Record<string, unknown> = { isEnabled: true };
  if (userId) filter.userId = userId;

  const skills = await UserSkill.find(filter).lean();
  const tools: Record<string, any> = {};

  for (const s of skills) {
    const skill = s as {
      _id: { toString(): string };
      name: string;
      description: string;
      content: string;
    };
    const toolName = `skill_${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

    tools[toolName] = createSkillTool(
      skill.name,
      skill.description,
      skill.content
    );
  }

  return tools;
}

/**
 * Convert a single skill into an AI SDK tool.
 * The skill's content becomes the tool's behavior instructions.
 */
function createSkillTool(
  name: string,
  description: string,
  content: string
) {
  return tool({
    description: `Skill: ${name} — ${description || "Custom skill"}. Use this when the user's request matches this skill's purpose.`,
    inputSchema: z.object({
      userRequest: z.string().describe("The user's request to handle with this skill"),
    }),
    execute: async ({ userRequest }: { userRequest: string }) => {
      return {
        skill: name,
        instructions: content,
        userRequest,
        note: "Follow the skill instructions above to handle this request. Use other tools (web_request, github, etc.) as needed.",
      };
    },
  });
}

/**
 * Get skill summaries for the system prompt — injected so the AI
 * knows what skills are available without needing to call a tool.
 */
export async function getSkillContext(userId?: string): Promise<string> {
  await connectDB();
  const filter: Record<string, unknown> = { isEnabled: true };
  if (userId) filter.userId = userId;

  const skills = await UserSkill.find(filter)
    .select("name description content")
    .lean();

  if (skills.length === 0) return "";

  const lines = (
    skills as { name: string; description: string; content: string }[]
  ).map((s) => {
    const preview =
      s.content.length > 200
        ? s.content.slice(0, 200) + "..."
        : s.content;
    return `- **${s.name}**: ${s.description || "(no description)"}\n  Instructions: ${preview}`;
  });

  return `## Active Skills\n\n${lines.join("\n\n")}`;
}
