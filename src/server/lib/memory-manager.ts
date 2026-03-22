import { MemoryChunk } from "../models/memory-chunk";
import { WorkspaceFile } from "../models/workspace-file";
import { Conversation } from "../models/conversation";
import { connectDB } from "../db";
import { embedText, embedBatch } from "./embeddings";

const log = (...args: unknown[]) => console.log("[memory]", ...args);

// --- Chunking ---

const CHUNK_SIZE = 400; // tokens
const CHUNK_OVERLAP = 80; // token overlap between chunks

/** Simple token estimator (~4 chars per token) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Extract keywords from text for BM25 fallback search */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "about", "like",
    "through", "after", "over", "between", "out", "up", "down", "off",
    "then", "than", "so", "no", "not", "only", "own", "same", "but",
    "and", "or", "nor", "if", "this", "that", "these", "those", "it",
    "its", "my", "your", "his", "her", "our", "their", "i", "you", "he",
    "she", "we", "they", "me", "him", "us", "them", "what", "which",
    "who", "when", "where", "how", "all", "each", "every", "both", "few",
    "more", "most", "other", "some", "such", "just", "also", "very",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 50);
}

/** Split text into overlapping chunks by estimated token count */
function chunkText(
  text: string,
  _source: string,
  _sourceId: string
): Array<{
  text: string;
  startLine: number;
  lineCount: number;
  tokenCount: number;
  keywords: string[];
}> {
  const lines = text.split("\n");
  const chunks: Array<{
    text: string;
    startLine: number;
    lineCount: number;
    tokenCount: number;
    keywords: string[];
  }> = [];

  let currentLines: string[] = [];
  let currentTokens = 0;
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineTokens = estimateTokens(lines[i]);
    currentLines.push(lines[i]);
    currentTokens += lineTokens;

    if (currentTokens >= CHUNK_SIZE || i === lines.length - 1) {
      const chunkText = currentLines.join("\n");
      chunks.push({
        text: chunkText,
        startLine,
        lineCount: currentLines.length,
        tokenCount: currentTokens,
        keywords: extractKeywords(chunkText),
      });

      // Overlap: keep last ~CHUNK_OVERLAP tokens worth of lines
      let overlapTokens = 0;
      let overlapStart = currentLines.length;
      for (let j = currentLines.length - 1; j >= 0; j--) {
        overlapTokens += estimateTokens(currentLines[j]);
        if (overlapTokens >= CHUNK_OVERLAP) {
          overlapStart = j;
          break;
        }
      }

      startLine = startLine + overlapStart;
      currentLines = currentLines.slice(overlapStart);
      currentTokens = currentLines.reduce(
        (acc, l) => acc + estimateTokens(l),
        0
      );
    }
  }

  return chunks;
}

// --- Indexing ---

/** Index a workspace file into memory chunks with embeddings */
export async function indexWorkspaceFile(
  userId: string,
  filename: string
): Promise<number> {
  await connectDB();
  const file = await WorkspaceFile.findOne({ userId, filename });
  if (!file || !file.content) return 0;

  // Remove old chunks for this file
  await MemoryChunk.deleteMany({
    userId,
    source: "workspace",
    sourceId: filename,
  });

  const chunks = chunkText(file.content, "workspace", filename);
  if (chunks.length === 0) return 0;

  // Embed all chunks in batch
  const embeddings = await embedBatch(
    chunks.map((c) => c.text),
    userId
  );

  // Create memory chunks
  const docs = chunks.map((chunk, i) => ({
    userId,
    source: "workspace" as const,
    sourceId: filename,
    text: chunk.text,
    embedding: embeddings[i]?.embedding ?? [],
    startLine: chunk.startLine,
    lineCount: chunk.lineCount,
    tokenCount: chunk.tokenCount,
    keywords: chunk.keywords,
  }));

  await MemoryChunk.insertMany(docs);
  log(`Indexed ${docs.length} chunks from ${filename} for user ${userId}`);
  return docs.length;
}

/** Index a conversation's messages into memory */
export async function indexConversation(
  userId: string,
  conversationId: string
): Promise<number> {
  await connectDB();
  const conv = await Conversation.findOne({ _id: conversationId, userId });
  if (!conv || !conv.messages || conv.messages.length === 0) return 0;

  // Build transcript text
  const transcript = conv.messages
    .map(
      (m: any) =>
        `${m.role === "user" ? "User" : "Assistant"}: ${typeof m.content === "string" ? m.content : "[multimodal]"}`
    )
    .join("\n");

  // Remove old chunks for this conversation
  await MemoryChunk.deleteMany({
    userId,
    source: "session",
    sourceId: conversationId,
  });

  const chunks = chunkText(transcript, "session", conversationId);
  if (chunks.length === 0) return 0;

  const embeddings = await embedBatch(
    chunks.map((c) => c.text),
    userId
  );

  const docs = chunks.map((chunk, i) => ({
    userId,
    source: "session" as const,
    sourceId: conversationId,
    text: chunk.text,
    embedding: embeddings[i]?.embedding ?? [],
    startLine: chunk.startLine,
    lineCount: chunk.lineCount,
    tokenCount: chunk.tokenCount,
    keywords: chunk.keywords,
  }));

  await MemoryChunk.insertMany(docs);
  log(`Indexed ${docs.length} chunks from conversation ${conversationId}`);
  return docs.length;
}

/** Index all workspace files for a user */
export async function indexAllWorkspaceFiles(userId: string): Promise<number> {
  await connectDB();
  const files = await WorkspaceFile.find({ userId }).select("filename").lean();
  let total = 0;
  for (const file of files) {
    total += await indexWorkspaceFile(userId, (file as any).filename);
  }
  return total;
}

// --- Search ---

interface MemorySearchResult {
  text: string;
  source: "workspace" | "session" | "note";
  sourceId: string;
  startLine: number;
  lineCount: number;
  score: number;
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Hybrid memory search: vector similarity + keyword BM25.
 * Falls back to text-only search when embeddings are not available.
 */
export async function searchMemory(
  userId: string,
  query: string,
  options: {
    sources?: ("workspace" | "session" | "note")[];
    topK?: number;
    minScore?: number;
    vectorWeight?: number;
    textWeight?: number;
  } = {}
): Promise<MemorySearchResult[]> {
  await connectDB();
  const {
    sources,
    topK = 6,
    minScore = 0.3,
    vectorWeight = 0.7,
    textWeight = 0.3,
  } = options;

  const filter: Record<string, any> = { userId };
  if (sources && sources.length > 0) {
    filter.source = { $in: sources };
  }

  // Try vector search
  const queryEmbedding = await embedText(query, userId);

  let vectorResults: Array<MemorySearchResult & { _embedding: number[] }> = [];
  let textResults: MemorySearchResult[] = [];

  if (queryEmbedding && queryEmbedding.embedding.length > 0) {
    // Fetch candidates with embeddings
    const candidates = await MemoryChunk.find({
      ...filter,
      "embedding.0": { $exists: true },
    })
      .select("text source sourceId startLine lineCount embedding")
      .limit(200)
      .lean();

    vectorResults = (candidates as any[])
      .map((doc) => ({
        text: doc.text,
        source: doc.source,
        sourceId: doc.sourceId,
        startLine: doc.startLine ?? 0,
        lineCount: doc.lineCount ?? 0,
        score: cosineSimilarity(queryEmbedding.embedding, doc.embedding || []),
        _embedding: doc.embedding,
      }))
      .filter((r) => r.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK * 2);
  }

  // Text search (BM25 fallback via MongoDB text index)
  const queryKeywords = extractKeywords(query);
  if (queryKeywords.length > 0) {
    const textCandidates = await MemoryChunk.find(
      { ...filter, $text: { $search: queryKeywords.join(" ") } },
      { score: { $meta: "textScore" } }
    )
      .select("text source sourceId startLine lineCount")
      .sort({ score: { $meta: "textScore" } })
      .limit(topK * 2)
      .lean();

    textResults = (textCandidates as any[]).map((doc) => ({
      text: doc.text,
      source: doc.source,
      sourceId: doc.sourceId,
      startLine: doc.startLine ?? 0,
      lineCount: doc.lineCount ?? 0,
      score: doc.score ?? 0,
    }));

    // Normalize text scores to 0-1
    const maxTextScore = Math.max(...textResults.map((r) => r.score), 1);
    for (const r of textResults) {
      r.score = r.score / maxTextScore;
    }
  }

  // Merge: hybrid weighted scoring
  const merged = new Map<string, MemorySearchResult>();

  for (const r of vectorResults) {
    const key = `${r.source}:${r.sourceId}:${r.startLine}`;
    merged.set(key, {
      text: r.text,
      source: r.source,
      sourceId: r.sourceId,
      startLine: r.startLine,
      lineCount: r.lineCount,
      score: r.score * vectorWeight,
    });
  }

  for (const r of textResults) {
    const key = `${r.source}:${r.sourceId}:${r.startLine}`;
    const existing = merged.get(key);
    if (existing) {
      existing.score += r.score * textWeight;
    } else {
      merged.set(key, { ...r, score: r.score * textWeight });
    }
  }

  return Array.from(merged.values())
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Get memory stats for a user
 */
export async function getMemoryStats(userId: string) {
  await connectDB();
  const total = await MemoryChunk.countDocuments({ userId });
  const bySource = await MemoryChunk.aggregate([
    { $match: { userId: userId.toString() } },
    { $group: { _id: "$source", count: { $sum: 1 }, tokens: { $sum: "$tokenCount" } } },
  ]);
  return {
    totalChunks: total,
    sources: Object.fromEntries(
      bySource.map((s: any) => [s._id, { chunks: s.count, tokens: s.tokens }])
    ),
  };
}
