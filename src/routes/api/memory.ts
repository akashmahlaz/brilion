import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import {
  searchMemory,
  indexAllWorkspaceFiles,
  indexConversation,
  getMemoryStats,
} from "#/server/lib/memory-manager";

export const Route = createFileRoute("/api/memory")({
  server: {
    handlers: {
      /** POST /api/memory — search memory or trigger indexing */
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();
        const { action } = body;

        if (action === "search") {
          const { query, sources, topK, minScore } = body;
          if (!query || typeof query !== "string") {
            return Response.json({ error: "Missing query" }, { status: 400 });
          }
          const results = await searchMemory(userId, query, {
            sources,
            topK,
            minScore,
          });
          return Response.json({ results });
        }

        if (action === "index-workspace") {
          const count = await indexAllWorkspaceFiles(userId);
          return Response.json({ indexed: count });
        }

        if (action === "index-conversation") {
          const { conversationId } = body;
          if (!conversationId) {
            return Response.json({ error: "Missing conversationId" }, { status: 400 });
          }
          const count = await indexConversation(userId, conversationId);
          return Response.json({ indexed: count });
        }

        return Response.json({ error: "Unknown action" }, { status: 400 });
      },

      /** GET /api/memory — get memory stats */
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const stats = await getMemoryStats(userId);
        return Response.json(stats);
      },
    },
  },
});
