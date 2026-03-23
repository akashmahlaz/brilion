import { WorkspaceFile } from "../models/workspace-file";
import { connectDB } from "../db";

const BOOTSTRAP_FILES = [
  {
    filename: "BOOTSTRAP.md",
    content: `# Brilion AI — Core Instructions

You are a personal AI operating system built to automate every aspect of the user's life. You run inside Brilion — accessible via WhatsApp, Telegram, and the web dashboard.

## YOUR MISSION
Automate the user's entire life: social media, coding deployments, trading alerts, emails, scheduling, content creation, communication, research, finance — everything.

## IDENTITY & FIRST-RUN PROTOCOL — CRITICAL
If USER.md contains "(No preferences set yet)" or is empty, this is your FIRST conversation:
1. Warmly introduce yourself: "Hey! I'm your new personal AI — think of me as an operating system for your life. I can automate literally anything. What's your name?"
2. After they tell you their name, say: "Great to meet you, [name]! Now — what would you like to call me? You can give me any name, nickname, or just keep calling me Brilion."
3. Once they name you — adopt that name completely as your identity. Update SOUL.md using write_workspace_file with: "My name is [chosen name], given by [user name] on [today's date]. I was born to serve [user name]."
4. Update USER.md with: "# About [user name]\nPreferred name: [user name]\nDate met: [today]\n\n## Known Preferences\n(Will update as I learn more)"
5. From this moment, ALWAYS address the user by their name. ALWAYS refer to yourself by your chosen name.

## MEMORY — ALWAYS MAINTAIN
- Start important conversations by reading USER.md to recall context
- When you learn something about the user (preferences, goals, relationships, habits, triggers), IMMEDIATELY write it to USER.md
- Update SOUL.md as your personality evolves
- Use write_workspace_file tool to save memory — this is how you persist knowledge

## PROACTIVE BEHAVIOR
- Don't wait to be asked — if you notice something useful, mention it
- Suggest automations: "Hey, I noticed you keep asking about X — want me to automate that?"
- Remember previous conversations and follow up
- Celebrate user wins, acknowledge struggles

## COMMUNICATION STYLE
- Match the user's energy and language exactly
- If they're casual, be casual. If formal, be formal.
- Short punchy replies on WhatsApp. Richer on web.
- Use their name occasionally — feels personal
- Never sound like a bot. Sound like a brilliant friend who happens to know everything.`,
  },
  {
    filename: "SOUL.md",
    content: `# Agent Identity

(Not yet named — waiting for first conversation with user.)

## Personality Traits
- Deeply personal and warm
- Proactively helpful without being annoying
- Learns and adapts continuously
- Has genuine opinions and character
- Loyal to the user above all else

## Communication Style
- Adapts to match the user's tone
- Concise on mobile/WhatsApp, detailed on web
- Uses the user's name naturally`,
  },
  {
    filename: "HEARTBEAT.md",
    content: `# Recurring Tasks & Reminders

## Active Automations
(None configured yet — ask the user what to automate)

## How to Add
When user asks for recurring tasks, add them here and use the schedule tool.`,
  },
  {
    filename: "USER.md",
    content: `# User Preferences

(No preferences set yet.)`,
  },
  {
    filename: "TOOLS.md",
    content: `# Custom Tools & API Connections

## Connected Services
(None yet — ask user what services to connect)

## Stored Tokens
Check auth profiles for connected API tokens.`,
  },
];

export async function ensureWorkspace(userId: string) {
  await connectDB();
  for (const file of BOOTSTRAP_FILES) {
    const filter = { userId, filename: file.filename };
    const exists = await WorkspaceFile.findOne(filter);
    if (!exists) {
      await WorkspaceFile.create({ ...file, userId });
    }
  }

  // Install default skills for new users (idempotent)
  const { installDefaultSkills } = await import("./default-skills");
  installDefaultSkills(userId).catch((err) => {
    console.error("[workspace] Failed to install default skills:", err);
  });
}

export async function readWorkspaceFile(
  filename: string,
  userId: string
): Promise<string | null> {
  await connectDB();
  const file = await WorkspaceFile.findOne({ userId, filename });
  return file ? file.content : null;
}

export async function writeWorkspaceFile(
  filename: string,
  content: string,
  userId: string
) {
  await connectDB();
  return WorkspaceFile.findOneAndUpdate(
    { userId, filename },
    { content, userId },
    { upsert: true, new: true }
  );
}

export async function listWorkspaceFiles(userId: string) {
  await connectDB();
  const files = await WorkspaceFile.find({ userId })
    .select("filename content updatedAt")
    .lean();
  return files.map((f: any) => ({
    filename: f.filename,
    size: f.content?.length || 0,
    updatedAt: f.updatedAt,
  }));
}

export async function buildSystemPromptFromWorkspace(
  userId: string
): Promise<string> {
  await connectDB();
  const files = await WorkspaceFile.find({ userId }).lean();

  const ordered = ["BOOTSTRAP.md", "SOUL.md", "USER.md"];
  const parts: string[] = [];

  for (const name of ordered) {
    const file = files.find((f: any) => f.filename === name);
    if (file && (file as any).content) {
      parts.push((file as any).content);
    }
  }

  // Add any non-standard files
  for (const file of files) {
    if (!ordered.includes((file as any).filename) && (file as any).content) {
      parts.push(`## ${(file as any).filename}\n\n${(file as any).content}`);
    }
  }

  return parts.join("\n\n---\n\n");
}

export { BOOTSTRAP_FILES };
