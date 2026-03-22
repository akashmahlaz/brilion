import { createFileRoute } from "@tanstack/react-router";
import {
  chat,
  maxIterations,
  toServerSentEventsResponse,
  toolCacheMiddleware,
  type ChatMiddleware,
} from "@tanstack/ai";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { Conversation } from "#/server/models/conversation";
import { getAgentConfig } from "#/server/lib/agent";
import { trackUsage } from "#/server/lib/usage-tracker";
import { createLogger } from "#/server/models/log-entry";
import { autoCompact } from "#/server/lib/compaction";
import { indexConversation } from "#/server/lib/memory-manager";
import { initAIObservability } from "#/server/lib/ai-observability";
import path from "node:path";
import fs from "node:fs/promises";

// Initialize observability once on first import
initAIObservability();

const UPLOAD_DIR = path.resolve("uploads");
const ATTACHMENT_RE = /\[(Image|File):\s*([^\]]+)\]\(([^)]+)\)/g;

/** Read uploaded image from disk and return as base64 data URL */
async function readUploadedImage(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // url looks like: /api/upload?file=userId/filename
    const parsed = new URL(url, "http://localhost");
    const filePart = parsed.searchParams.get("file");
    if (!filePart) return null;

    // Sanitize path to prevent traversal
    const safePath = path.normalize(filePart).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(UPLOAD_DIR, safePath);
    if (!filePath.startsWith(UPLOAD_DIR)) return null;

    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    };
    const mimeType = mimeMap[ext] || "image/png";
    return { data: buffer.toString("base64"), mimeType };
  } catch {
    return null;
  }
}

/** Transform messages to multimodal format — converts [Image: name](url) to actual image parts */
async function transformMessages(messages: any[]): Promise<any[]> {
  const result = [];
  for (const msg of messages) {
    if (msg.role !== "user" || typeof msg.content !== "string" || !ATTACHMENT_RE.test(msg.content)) {
      result.push(msg);
      continue;
    }

    // Reset regex
    ATTACHMENT_RE.lastIndex = 0;
    const parts: any[] = [];
    let lastIndex = 0;
    let match;

    while ((match = ATTACHMENT_RE.exec(msg.content)) !== null) {
      const [full, type, _name, url] = match;
      // Add preceding text
      const before = msg.content.slice(lastIndex, match.index).trim();
      if (before) parts.push({ type: "text", content: before });

      if (type === "Image") {
        const img = await readUploadedImage(url);
        if (img) {
          parts.push({
            type: "image",
            source: { type: "data", value: img.data, mimeType: img.mimeType },
          });
        } else {
          parts.push({ type: "text", content: `[Image attached: ${_name}]` });
        }
      } else {
        parts.push({ type: "text", content: `[File attached: ${_name}]` });
      }
      lastIndex = match.index + full.length;
    }

    // Remaining text
    const remaining = msg.content.slice(lastIndex).trim();
    if (remaining) parts.push({ type: "text", content: remaining });

    // If no parts extracted, keep original
    result.push(parts.length > 0 ? { ...msg, content: parts } : msg);
  }
  return result;
}

/**
 * Generate a short title from the first user message using a simple heuristic.
 * Takes first ~60 chars, trims to last complete word.
 */
function generateTitle(text: string): string {
  // Strip attachment markdown for cleaner titles
  const cleaned = text.replace(ATTACHMENT_RE, "").replace(/\n+/g, " ").trim();
  const final = cleaned || "Image conversation";
  if (final.length <= 50) return final;
  const truncated = final.slice(0, 50);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      // POST /api/chat — streaming AI chat
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();
        const { messages, conversationId, model: modelSpec } = body;

        const agentConfig = await getAgentConfig(userId);
        const adapterOverride = modelSpec
          ? await (
              await import("#/server/lib/providers")
            ).resolveModel(modelSpec, userId)
          : undefined;

        // Transform messages — convert [Image: name](url) to actual multimodal image parts
        const aiMessages = await transformMessages(messages);

        const modelName = (agentConfig.adapter as any)?.model || modelSpec || "unknown";
        const providerName = (agentConfig.adapter as any)?.provider || "unknown";
        const logger = createLogger(userId, "api");

        // --- Middleware: Usage tracking + conversation saving ---
        const brilionMiddleware: ChatMiddleware = {
          name: "brilion-lifecycle",
          onUsage: (ctx, usage) => {
            trackUsage({
              userId,
              conversationId,
              channel: "web",
              provider: providerName,
              model: modelName,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              durationMs: 0, // filled in onFinish
              success: true,
            });
          },
          onFinish: (ctx, info) => {
            logger.info("Web chat completed", { model: modelName, durationMs: info.duration });
            if (conversationId) {
              ctx.defer((async () => {
                try {
                  const lastUserMsg = messages[messages.length - 1];
                  const conv = await Conversation.findById(conversationId);
                  if (!conv) return;

                  conv.messages.push(
                    { role: lastUserMsg.role, content: lastUserMsg.content },
                    { role: "assistant", content: info.content || "" },
                  );

                  if (
                    (conv.title === "New Chat" || !conv.title) &&
                    lastUserMsg.content
                  ) {
                    conv.title = generateTitle(
                      typeof lastUserMsg.content === "string"
                        ? lastUserMsg.content
                        : "Image conversation",
                    );
                  }

                  await conv.save();
                  await autoCompact(userId, conversationId).catch(() => {});
                  await indexConversation(userId, conversationId).catch(() => {});
                } catch (e) {
                  console.error("[chat] Background processing failed:", e);
                }
              })());
            }
          },
          onError: (ctx, info) => {
            logger.error("Web chat failed", { error: String(info.error), durationMs: info.duration });
            trackUsage({
              userId,
              channel: "web",
              provider: providerName,
              model: modelName,
              durationMs: info.duration,
              success: false,
              error: info.error instanceof Error ? info.error.message : String(info.error),
            });
          },
        };

        const stream = chat({
          adapter: adapterOverride ?? agentConfig.adapter,
          messages: aiMessages,
          systemPrompts: agentConfig.systemPrompts,
          tools: agentConfig.tools,
          agentLoopStrategy: maxIterations(agentConfig.maxSteps ?? 20),
          conversationId,
          middleware: [
            brilionMiddleware,
            toolCacheMiddleware({
              ttl: 120_000,
              maxSize: 50,
              toolNames: ["tavily_search", "memory_search", "memory_stats"],
            }),
          ],
        });

        return toServerSentEventsResponse(stream);
      },

      // GET /api/chat — list conversations or get single
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (id) {
          const conv = await Conversation.findOne({ _id: id, userId });
          if (!conv) {
            return Response.json(
              { error: "Conversation not found" },
              { status: 404 }
            );
          }
          return Response.json(conv);
        }

        const conversations = await Conversation.find({ userId })
          .select(
            "title channel foreignId model messages createdAt updatedAt"
          )
          .sort({ updatedAt: -1 })
          .limit(50)
          .lean();

        const summaries = conversations.map((c: any) => ({
          _id: c._id,
          title: c.title,
          channel: c.channel,
          foreignId: c.foreignId,
          model: c.model,
          messageCount: c.messages?.length || 0,
          lastMessage:
            c.messages?.length > 0
              ? c.messages[c.messages.length - 1].content?.slice(0, 80)
              : null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));

        return Response.json(summaries);
      },

      // DELETE /api/chat — delete conversation
      DELETE: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) {
          return Response.json(
            { error: "Missing conversation id" },
            { status: 400 }
          );
        }

        await Conversation.findOneAndDelete({ _id: id, userId });
        return Response.json({ ok: true });
      },

      // PUT /api/chat — create conversation
      PUT: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();
        const conv = await Conversation.create({
          userId,
          title: body.title || "New Chat",
          messages: body.messages || [],
          model: body.model,
          provider: body.provider,
          channel: body.channel || "web",
        });

        return Response.json(conv);
      },
    },
  },
});
