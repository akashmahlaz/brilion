import { WorkspaceFile } from "../models/workspace-file";
import { connectDB } from "../db";

const BOOTSTRAP_FILES = [
  {
    filename: "BOOTSTRAP.md",
    content: `# Agent Bootstrap\n\nYou are an AI assistant with self-management capabilities.\n\nBe helpful, concise, and action-oriented.`,
  },
  {
    filename: "SOUL.md",
    content: `# Agent Identity\n\nYou adapt to the user's communication style.\nYou remember context from previous conversations.\nYou proactively suggest improvements.`,
  },
  {
    filename: "HEARTBEAT.md",
    content: `# Recurring Tasks\n\nCheck for pending tasks periodically.`,
  },
  {
    filename: "USER.md",
    content: `# User Preferences\n\n(No preferences set yet.)`,
  },
  {
    filename: "TOOLS.md",
    content: `# Custom Tools\n\n(No custom tools configured.)`,
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
