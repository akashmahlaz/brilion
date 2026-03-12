import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { Conversation } from "#/server/models/conversation";
import { getAgentConfig } from "#/server/lib/agent";

/**
 * Generate a short title from the first user message using a simple heuristic.
 * Takes first ~60 chars, trims to last complete word.
 */
function generateTitle(text: string): string {
  const cleaned = text.replace(/\n+/g, " ").trim();
  if (cleaned.length <= 50) return cleaned;
  const truncated = cleaned.slice(0, 50);
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
        const modelOverride = modelSpec
          ? await (
              await import("#/server/lib/providers")
            ).resolveModel(modelSpec, userId)
          : undefined;

        const result = streamText({
          ...agentConfig,
          ...(modelOverride ? { model: modelOverride } : {}),
          messages,
        });

        // Save conversation in background (web chat only — channel messages saved by router)
        if (conversationId) {
          result.text.then(async (fullText) => {
            try {
              const lastUserMsg = messages[messages.length - 1];

              // Generate title from first user message if still "New Chat"
              const conv = await Conversation.findById(conversationId);
              if (!conv) return;

              conv.messages.push(
                { role: lastUserMsg.role, content: lastUserMsg.content },
                { role: "assistant", content: fullText }
              );

              // Auto-title: if title is default and this is the first real message
              if (
                (conv.title === "New Chat" || !conv.title) &&
                lastUserMsg.content
              ) {
                conv.title = generateTitle(lastUserMsg.content);
              }

              await conv.save(); // Triggers updatedAt via timestamps
            } catch (e) {
              console.error("[chat] Failed to save conversation:", e);
            }
          });
        }

        return result.toTextStreamResponse();
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
