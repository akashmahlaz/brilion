import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { User } from "#/server/models/user";
import { AuthProfile } from "#/server/models/auth-profile";
import { UserSkill } from "#/server/models/user-skill";
import { upsertAuthProfile } from "#/server/lib/auth-profiles";
import { PROVIDER_CATALOG } from "#/server/lib/providers";

const DEFAULT_SKILLS = [
  {
    name: "General Assistant",
    description: "Helpful general-purpose AI assistant",
    content:
      "You are a helpful, concise assistant. Answer questions clearly and provide actionable advice.",
    createdBy: "system",
  },
  {
    name: "Code Helper",
    description: "Programming and development assistance",
    content:
      "You are a coding expert. Help with debugging, writing code, explaining concepts, and reviewing code.",
    createdBy: "system",
  },
  {
    name: "Writer",
    description: "Content writing and editing",
    content:
      "You are a skilled writer. Help with drafting, editing, and improving text content.",
    createdBy: "system",
  },
];

export const Route = createFileRoute("/api/onboarding")({
  server: {
    handlers: {
      // GET /api/onboarding?action=status|providers
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "status";

        if (action === "providers") {
          return Response.json(
            PROVIDER_CATALOG.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              website: p.website,
            }))
          );
        }

        // Default: status
        const user = await User.findById(userId).lean();
        if (!user) {
          return Response.json({ error: "User not found" }, { status: 404 });
        }
        return Response.json({
          onboardingCompleted: (user as any).onboardingCompleted,
          onboardingStep: (user as any).onboardingStep,
        });
      },

      // POST /api/onboarding — step update, complete, set provider key
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();
        const { action } = body;

        // Update step
        if (action === "step") {
          const { step } = body;
          await User.findByIdAndUpdate(userId, { onboardingStep: step });
          return Response.json({ ok: true, step });
        }

        // Complete onboarding
        if (action === "complete") {
          await User.findByIdAndUpdate(userId, {
            onboardingCompleted: true,
            onboardingStep: 99,
          });

          // Seed default skills
          for (const skill of DEFAULT_SKILLS) {
            await UserSkill.findOneAndUpdate(
              { userId, name: skill.name },
              { ...skill, userId },
              { upsert: true }
            );
          }

          return Response.json({ ok: true });
        }

        // Save provider API key
        if (action === "provider") {
          const { provider, apiKey, baseUrl } = body;
          if (!provider || !apiKey) {
            return Response.json(
              { error: "provider and apiKey required" },
              { status: 400 }
            );
          }

          await upsertAuthProfile(provider, {
            type: "api_key",
            provider,
            token: apiKey,
            baseUrl,
          });

          return Response.json({ ok: true });
        }

        return Response.json(
          { error: "Unknown action" },
          { status: 400 }
        );
      },
    },
  },
});
