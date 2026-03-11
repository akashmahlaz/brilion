import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { Conversation } from "#/server/models/conversation";
import { getAgentConfig } from "#/server/lib/agent";

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

        // Save conversation in background
        if (conversationId) {
          result.text.then(async (fullText) => {
            try {
              await Conversation.findByIdAndUpdate(conversationId, {
                $push: {
                  messages: {
                    $each: [
                      ...messages
                        .filter(
                          (m: any) =>
                            m.role === "user" &&
                            !body._alreadySaved
                        )
                        .map((m: any) => ({
                          role: m.role,
                          content: m.content,
                        })),
                      {
                        role: "assistant",
                        content: fullText,
                      },
                    ],
                  },
                },
              });
            } catch (e) {
              console.error("[chat] Failed to save conversation:", e);
            }
          });
        }

        return result.toTextStreamResponse();
      },

      // GET /api/chat — list conversations
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (id) {
          const conv = await Conversation.findOne({
            _id: id,
            userId,
          });
          if (!conv) {
            return Response.json(
              { error: "Conversation not found" },
              { status: 404 }
            );
          }
          return Response.json(conv);
        }

        const conversations = await Conversation.find({ userId })
          .select("title channel model createdAt updatedAt")
          .sort({ updatedAt: -1 })
          .limit(50)
          .lean();

        return Response.json(conversations);
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
