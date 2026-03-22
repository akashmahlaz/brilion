import { mongoose } from "../db";

/**
 * MemoryChunk — stores embedded text chunks for vector search.
 * Uses MongoDB Atlas Vector Search (or fallback text search).
 * Each chunk is a segment of a workspace file or conversation transcript.
 */
const memoryChunkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Source type: workspace file, session transcript, or manual note */
    source: {
      type: String,
      enum: ["workspace", "session", "note"],
      required: true,
    },
    /** Original file name or conversation ID */
    sourceId: { type: String, required: true },
    /** The actual text content of this chunk */
    text: { type: String, required: true },
    /** Embedding vector (1536-dim for OpenAI, 768 for others) */
    embedding: { type: [Number], default: [] },
    /** Start line in the original document (for workspace files) */
    startLine: { type: Number, default: 0 },
    /** Number of lines in this chunk */
    lineCount: { type: Number, default: 0 },
    /** Token count of this chunk */
    tokenCount: { type: Number, default: 0 },
    /** BM25 keywords extracted from text */
    keywords: { type: [String], default: [] },
  },
  { timestamps: true }
);

memoryChunkSchema.index({ userId: 1, source: 1, sourceId: 1 });
memoryChunkSchema.index({ userId: 1, keywords: 1 });
// Text index for fallback BM25 search when vector search is not available
memoryChunkSchema.index({ text: "text", keywords: "text" });

export const MemoryChunk =
  mongoose.models.MemoryChunk ||
  mongoose.model("MemoryChunk", memoryChunkSchema);
