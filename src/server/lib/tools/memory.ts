import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import {
  searchMemory,
  indexAllWorkspaceFiles,
  getMemoryStats,
} from "../memory-manager";
import { readWorkspaceFile } from "../workspace";

/**
 * Memory tools — give the agent the ability to search and manage long-term memory.
 * These enable the OpenClaw-style personalization loop:
 * 1. Agent writes to workspace files (SOUL.md, USER.md, MEMORY.md)
 * 2. Files are indexed into vector memory (embeddings + BM25 keywords)
 * 3. Agent searches memory before answering user questions
 * 4. Session transcripts are auto-indexed for long-term recall
 */
export function createMemoryTools(userId: string) {
  const memorySearch = toolDefinition({
    name: "memory_search",
    description:
      "Search your long-term memory for relevant information. Use this BEFORE answering questions about " +
      "prior conversations, user preferences, decisions, people, projects, or anything that was discussed " +
      "in past sessions. Returns the most relevant memory chunks ranked by relevance.",
    inputSchema: z.object({
      query: z.string().describe("What to search for in memory"),
      sources: z
        .array(z.enum(["workspace", "session", "note"]))
        .optional()
        .describe("Filter by source type: workspace files, session transcripts, or notes"),
      topK: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Max results to return (default: 6)"),
    }),
  }).server(async ({ query, sources, topK }) => {
    const results = await searchMemory(userId, query, { sources, topK });
    if (results.length === 0) {
      return { results: [], note: "No relevant memories found. This might be new information." };
    }
    return {
      results: results.map((r) => ({
        text: r.text,
        source: r.source,
        sourceId: r.sourceId,
        startLine: r.startLine,
        relevance: Math.round(r.score * 100) / 100,
      })),
    };
  });

  const memoryGet = toolDefinition({
    name: "memory_get",
    description:
      "Get specific content from a workspace file by filename and optional line range. " +
      "Use after memory_search returns a result — you can pull the exact lines for more context.",
    lazy: true,
    inputSchema: z.object({
      filename: z.string().describe("The workspace file to read (e.g. MEMORY.md, USER.md, SOUL.md)"),
      startLine: z
        .number()
        .optional()
        .describe("Start line (0-based). Omit to read entire file."),
      numLines: z
        .number()
        .optional()
        .describe("Number of lines to read from startLine"),
    }),
  }).server(async ({ filename, startLine, numLines }) => {
    const content = await readWorkspaceFile(filename, userId);
    if (content === null) {
      return { error: `File '${filename}' not found` };
    }

    if (startLine !== undefined) {
      const lines = content.split("\n");
      const end = numLines ? startLine + numLines : lines.length;
      const slice = lines.slice(startLine, end);
      return { filename, startLine, lines: slice.length, content: slice.join("\n") };
    }

    return { filename, content, length: content.length };
  });

  const memoryIndex = toolDefinition({
    name: "memory_index",
    description:
      "Re-index your workspace files into vector memory. Run this after writing or updating workspace files " +
      "so the changes become searchable. This creates embeddings for semantic search.",
    lazy: true,
    inputSchema: z.object({}),
  }).server(async () => {
    const count = await indexAllWorkspaceFiles(userId);
    return { status: "ok", chunksIndexed: count };
  });

  const memoryStats = toolDefinition({
    name: "memory_stats",
    description: "Get statistics about your long-term memory: total chunks, sources breakdown.",
    lazy: true,
    inputSchema: z.object({}),
  }).server(async () => {
    return getMemoryStats(userId);
  });

  return [memorySearch, memoryGet, memoryIndex, memoryStats];
}
