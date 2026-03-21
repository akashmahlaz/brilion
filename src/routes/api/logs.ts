import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { LogEntry } from "#/server/models/log-entry";

export const Route = createFileRoute("/api/logs")({
  server: {
    handlers: {
      // GET /api/logs — paginated log entries with level/source filtering
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const level = url.searchParams.get("level"); // debug|info|warn|error
        const source = url.searchParams.get("source"); // router|agent|channel|cron|system|api|skill
        const cursor = url.searchParams.get("cursor"); // last log ID for pagination
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);

        const filter: Record<string, unknown> = { userId };
        if (level) filter.level = level;
        if (source) filter.source = source;
        if (cursor) filter._id = { $lt: cursor };

        const logs = await LogEntry.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit + 1)
          .lean();

        const hasMore = logs.length > limit;
        if (hasMore) logs.pop();

        const nextCursor = hasMore ? (logs[logs.length - 1] as any)._id?.toString() : null;

        // Level counts
        const counts = await LogEntry.aggregate([
          { $match: { userId } },
          { $group: { _id: "$level", count: { $sum: 1 } } },
        ]);

        const levelCounts: Record<string, number> = {};
        for (const c of counts) {
          levelCounts[c._id] = c.count;
        }

        return Response.json({
          logs,
          nextCursor,
          hasMore,
          levelCounts,
        });
      },

      // DELETE /api/logs — clear logs for user
      DELETE: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const result = await LogEntry.deleteMany({ userId });
        return Response.json({ deleted: result.deletedCount });
      },
    },
  },
});
