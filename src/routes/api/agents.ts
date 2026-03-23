import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { AgentProfile } from "#/server/models/agent-profile";
import { SubagentRun } from "#/server/models/subagent-run";

export const Route = createFileRoute("/api/agents")({
  server: {
    handlers: {
      // GET /api/agents — list agent profiles and run history
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        // Get sub-agent run history
        if (action === "runs") {
          const agentSlug = url.searchParams.get("agent");
          const filter: Record<string, unknown> = { userId };
          if (agentSlug) filter.agentSlug = agentSlug;

          const runs = await SubagentRun.find(filter)
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
          return Response.json(runs);
        }

        const profiles = await AgentProfile.find({ userId })
          .sort({ isBuiltin: -1, name: 1 })
          .lean();
        return Response.json(profiles);
      },

      // POST /api/agents — create or update agent profile
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();
        const { slug: rawSlug, name, description, systemPrompt, model, maxSteps, allowedTools, profileId } = body;

        if (!rawSlug || !name) {
          return Response.json({ error: "slug and name required" }, { status: 400 });
        }

        const slug = String(rawSlug).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
        if (!slug) {
          return Response.json({ error: "slug must contain alphanumeric characters" }, { status: 400 });
        }
        const clampedMaxSteps = Math.max(1, Math.min(Number(maxSteps) || 10, 50));

        if (profileId) {
          const profile = await AgentProfile.findOneAndUpdate(
            { _id: profileId, userId },
            { slug, name, description, systemPrompt, model, maxSteps: clampedMaxSteps, allowedTools },
            { new: true }
          );
          return Response.json(profile);
        }

        const profile = await AgentProfile.create({
          userId,
          slug,
          name,
          description: description || "",
          systemPrompt: systemPrompt || "",
          model: model || "",
          maxSteps: clampedMaxSteps,
          allowedTools: allowedTools || [],
        });
        return Response.json(profile);
      },

      // DELETE /api/agents — delete agent profile
      DELETE: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const profileId = url.searchParams.get("id");
        if (!profileId) {
          return Response.json({ error: "id required" }, { status: 400 });
        }

        // Don't allow deleting builtin agents
        const profile = await AgentProfile.findOne({ _id: profileId, userId });
        if (profile?.isBuiltin) {
          return Response.json({ error: "Cannot delete built-in agents" }, { status: 400 });
        }

        await AgentProfile.findOneAndDelete({ _id: profileId, userId });
        return Response.json({ ok: true });
      },
    },
  },
});
