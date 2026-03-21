import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { UsageLog } from "#/server/models/usage-log";

export const Route = createFileRoute("/api/usage")({
  server: {
    handlers: {
      // GET /api/usage — usage analytics with aggregation
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const days = parseInt(url.searchParams.get("days") || "30", 10);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Summary aggregation
        const [summary] = await UsageLog.aggregate([
          { $match: { userId, createdAt: { $gte: since } } },
          {
            $group: {
              _id: null,
              totalRequests: { $sum: 1 },
              totalTokens: { $sum: "$totalTokens" },
              totalPromptTokens: { $sum: "$promptTokens" },
              totalCompletionTokens: { $sum: "$completionTokens" },
              totalCost: { $sum: "$costUsd" },
              avgDuration: { $avg: "$durationMs" },
              totalToolCalls: { $sum: "$toolCalls" },
              errorCount: { $sum: { $cond: ["$success", 0, 1] } },
            },
          },
        ]);

        // Per-model breakdown
        const byModel = await UsageLog.aggregate([
          { $match: { userId, createdAt: { $gte: since } } },
          {
            $group: {
              _id: "$model",
              requests: { $sum: 1 },
              tokens: { $sum: "$totalTokens" },
              cost: { $sum: "$costUsd" },
              avgDuration: { $avg: "$durationMs" },
            },
          },
          { $sort: { cost: -1 } },
        ]);

        // Per-channel breakdown
        const byChannel = await UsageLog.aggregate([
          { $match: { userId, createdAt: { $gte: since } } },
          {
            $group: {
              _id: "$channel",
              requests: { $sum: 1 },
              tokens: { $sum: "$totalTokens" },
              cost: { $sum: "$costUsd" },
            },
          },
        ]);

        // Daily usage for chart
        const daily = await UsageLog.aggregate([
          { $match: { userId, createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              requests: { $sum: 1 },
              tokens: { $sum: "$totalTokens" },
              cost: { $sum: "$costUsd" },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        // Recent logs (last 50)
        const recent = await UsageLog.find({ userId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        return Response.json({
          period: { days, since: since.toISOString() },
          summary: summary || {
            totalRequests: 0,
            totalTokens: 0,
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalCost: 0,
            avgDuration: 0,
            totalToolCalls: 0,
            errorCount: 0,
          },
          byModel,
          byChannel,
          daily,
          recent,
        });
      },
    },
  },
});
