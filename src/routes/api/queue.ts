import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import {
  getFailedJobs,
  retryFailedJob,
  getQueueMetrics,
} from "#/server/lib/message-queue";
import { isRedisConfigured } from "#/server/lib/redis";

export const Route = createFileRoute("/api/queue")({
  server: {
    handlers: {
      // GET /api/queue?action=metrics|failed&queue=inbound|cron&start=0&end=20
      GET: async ({ request }) => {
        await requireAuth(request);
        await connectDB();

        if (!isRedisConfigured()) {
          return Response.json(
            { error: "Redis not configured — queue features unavailable" },
            { status: 503 },
          );
        }

        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "metrics";
        const queueName = (url.searchParams.get("queue") || "inbound") as
          | "inbound"
          | "cron";

        if (queueName !== "inbound" && queueName !== "cron") {
          return Response.json(
            { error: 'Invalid queue name. Use "inbound" or "cron".' },
            { status: 400 },
          );
        }

        if (action === "metrics") {
          const [inbound, cron] = await Promise.all([
            getQueueMetrics("inbound"),
            getQueueMetrics("cron"),
          ]);
          return Response.json({ inbound, cron });
        }

        if (action === "failed") {
          const start = parseInt(url.searchParams.get("start") || "0", 10);
          const end = parseInt(url.searchParams.get("end") || "20", 10);
          const jobs = await getFailedJobs(queueName, start, end);
          return Response.json({ queue: queueName, jobs });
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
      },

      // POST /api/queue — retry failed job
      POST: async ({ request }) => {
        await requireAuth(request);
        await connectDB();

        if (!isRedisConfigured()) {
          return Response.json(
            { error: "Redis not configured" },
            { status: 503 },
          );
        }

        const body = await request.json();
        const { action, queue: queueName, jobId } = body;

        if (action === "retry") {
          if (!queueName || !jobId) {
            return Response.json(
              { error: "queue and jobId required" },
              { status: 400 },
            );
          }
          if (queueName !== "inbound" && queueName !== "cron") {
            return Response.json(
              { error: 'Invalid queue name. Use "inbound" or "cron".' },
              { status: 400 },
            );
          }
          const ok = await retryFailedJob(queueName, jobId);
          return Response.json({ ok, jobId });
        }

        return Response.json({ error: "Unknown action" }, { status: 400 });
      },
    },
  },
});
