import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import {
  listAuthProfiles,
  upsertAuthProfile,
  removeAuthProfile,
} from "#/server/lib/auth-profiles";
import {
  startDeviceCodeFlow,
  checkDeviceCode,
} from "#/server/lib/copilot-auth";

export const Route = createFileRoute("/api/keys")({
  server: {
    handlers: {
      // GET /api/keys — list API key profiles
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;
        const profiles = await listAuthProfiles(userId);
        return Response.json(profiles);
      },

      // POST /api/keys — save an API key
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();

        // Copilot device flow endpoints
        if (body.action === "copilot-device-code") {
          const data = await startDeviceCodeFlow();
          return Response.json(data);
        }
        if (body.action === "copilot-check") {
          const data = await checkDeviceCode(body.deviceCode);
          if (data.access_token) {
            await upsertAuthProfile("github-copilot", {
              type: "oauth",
              provider: "github-copilot",
              token: data.access_token,
            }, userId);
          }
          return Response.json(data);
        }

        // Regular API key save
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
        }, userId);

        return Response.json({ ok: true });
      },

      // DELETE /api/keys — remove an API key
      DELETE: async ({ request }) => {
        await requireAuth(request);
        await connectDB();

        const url = new URL(request.url);
        const profileId = url.searchParams.get("profileId");
        if (!profileId) {
          return Response.json(
            { error: "profileId required" },
            { status: 400 }
          );
        }

        await removeAuthProfile(profileId);
        return Response.json({ ok: true });
      },
    },
  },
});
