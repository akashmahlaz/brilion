import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { CronJob } from "#/server/models/cron-job";

export const Route = createFileRoute("/api/cron")({
  server: {
    handlers: {
      // GET /api/cron — list user's cron jobs
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const jobs = await CronJob.find({ userId }).sort({ createdAt: -1 }).lean();
        return Response.json({ jobs });
      },

      // POST /api/cron — create a new cron job
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();
        const { name, description, schedule, timezone, prompt, channel, status } = body;

        if (!name || !schedule || !prompt) {
          return Response.json(
            { error: "name, schedule, and prompt are required" },
            { status: 400 }
          );
        }

        // Validate cron expression (basic check)
        const parts = schedule.trim().split(/\s+/);
        if (parts.length < 5 || parts.length > 6) {
          return Response.json(
            { error: "Invalid cron expression. Expected 5-6 parts." },
            { status: 400 }
          );
        }

        const job = await CronJob.create({
          userId,
          name,
          description,
          schedule,
          timezone: timezone || "UTC",
          prompt,
          channel,
          status: status || "active",
        });

        return Response.json({ job }, { status: 201 });
      },

      // PUT /api/cron — update a cron job
      PUT: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
          return Response.json({ error: "id is required" }, { status: 400 });
        }

        const job = await CronJob.findOneAndUpdate(
          { _id: id, userId },
          { $set: updates },
          { new: true }
        );

        if (!job) {
          return Response.json({ error: "Job not found" }, { status: 404 });
        }

        return Response.json({ job });
      },

      // DELETE /api/cron — delete a cron job
      DELETE: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) {
          return Response.json({ error: "id param required" }, { status: 400 });
        }

        const result = await CronJob.findOneAndDelete({ _id: id, userId });
        if (!result) {
          return Response.json({ error: "Job not found" }, { status: 404 });
        }

        return Response.json({ deleted: true });
      },
    },
  },
});
