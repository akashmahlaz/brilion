import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { getAvailableProviders } from "#/server/lib/providers";
import { discoverModels } from "#/server/lib/model-discovery";

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      // GET /api/models — list providers with config status
      // GET /api/models?provider=xxx — discover models for a provider
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const url = new URL(request.url);
        const providerId = url.searchParams.get("provider");

        if (!providerId) {
          const providers = await getAvailableProviders(userId);
          return Response.json(providers);
        }

        const models = await discoverModels(providerId);
        return Response.json(models);
      },

      // POST /api/models — refresh models or test a key
      // { providerId } — refresh models using stored key
      // { provider, apiKey, baseUrl? } — test a key before saving
      POST: async ({ request }) => {
        await requireAuth(request);
        await connectDB();

        const body = await request.json();
        const { providerId, provider, apiKey, baseUrl } = body;

        // Test connection mode: accept temp key + baseUrl to validate
        if (provider && apiKey) {
          const models = await discoverModels(provider, false, { apiKey, baseUrl });
          return Response.json(models);
        }

        if (!providerId) {
          return Response.json({ error: "providerId required" }, { status: 400 });
        }

        const models = await discoverModels(providerId, true);
        return Response.json(models);
      },
    },
  },
});
