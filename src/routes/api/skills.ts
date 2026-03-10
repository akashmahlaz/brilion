import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { UserSkill } from "#/server/models/user-skill";
import {
  searchClawHub,
  installFromClawHub,
  installFromContent,
  uninstallSkill,
} from "#/server/lib/skill-installer";

export const Route = createFileRoute("/api/skills")({
  server: {
    handlers: {
      // GET /api/skills — list skills or search marketplace
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        // Search ClawHub marketplace
        if (action === "search") {
          const query = url.searchParams.get("q") || "";
          if (!query) return Response.json({ results: [] });
          const results = await searchClawHub(query);
          return Response.json(results);
        }

        const skills = await UserSkill.find({ userId })
          .sort({ createdAt: -1 })
          .lean();
        return Response.json(skills);
      },

      // POST /api/skills — create, update, toggle, install from marketplace
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();

        // Toggle action
        if (body.action === "toggle") {
          const { skillId, isEnabled } = body;
          const skill = await UserSkill.findOneAndUpdate(
            { _id: skillId, userId },
            { isEnabled },
            { new: true }
          );
          if (!skill) {
            return Response.json(
              { error: "Skill not found" },
              { status: 404 }
            );
          }
          return Response.json(skill);
        }

        // Install from ClawHub marketplace
        if (body.action === "install") {
          const { slug, repo } = body;
          if (!slug) {
            return Response.json(
              { error: "slug required" },
              { status: 400 }
            );
          }
          const result = await installFromClawHub(userId, slug, repo);
          return Response.json(result);
        }

        // Install from raw content (paste/upload)
        if (body.action === "install-content") {
          const { name, content, description } = body;
          if (!name || !content) {
            return Response.json(
              { error: "name and content required" },
              { status: 400 }
            );
          }
          const result = await installFromContent(userId, name, content, description);
          return Response.json(result);
        }

        // Create or update
        const { name, description, content, skillId } = body;
        if (!name || !content) {
          return Response.json(
            { error: "name and content required" },
            { status: 400 }
          );
        }

        if (skillId) {
          // Update
          const skill = await UserSkill.findOneAndUpdate(
            { _id: skillId, userId },
            { name, description, content },
            { new: true }
          );
          return Response.json(skill);
        }

        // Create
        const skill = await UserSkill.create({
          userId,
          name,
          description: description || "",
          content,
          createdBy: "user",
        });
        return Response.json(skill);
      },

      // DELETE /api/skills
      DELETE: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const skillId = url.searchParams.get("id");
        if (!skillId) {
          return Response.json(
            { error: "id required" },
            { status: 400 }
          );
        }

        await UserSkill.findOneAndDelete({ _id: skillId, userId });
        return Response.json({ ok: true });
      },
    },
  },
});
