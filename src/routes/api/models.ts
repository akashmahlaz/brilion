import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { PROVIDER_CATALOG, getAvailableProviders } from "#/server/lib/providers";
import { discoverModels } from "#/server/lib/model-discovery";

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      // GET /api/models?action=providers — list providers with config status
      // GET /api/models?provider=xxx — discover models for a provider
      GET: async ({ request }) => {
        await requireAuth(request);
        await connectDB();

        const url = new URL(request.url);
        const action = url.searchParams.get("action");
        const providerId = url.searchParams.get("provider");

        if (action === "providers" || (!action && !providerId)) {
          const providers = await getAvailableProviders();
          return Response.json(providers);
        }

        if (providerId) {
          const models = await discoverModels(providerId);
          return Response.json(models);
        }

        return Response.json({ error: "Invalid request" }, { status: 400 });
      },

      // POST /api/models — refresh models for a provider
      POST: async ({ request }) => {
        await requireAuth(request);
        await connectDB();

        const body = await request.json();
        const { providerId } = body;
        if (!providerId) {
          return Response.json(
            { error: "providerId required" },
            { status: 400 }
          );
        }

        const models = await discoverModels(providerId, true);
        return Response.json(models);
      },
    },
  },
});
