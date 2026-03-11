import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import { loadConfig, saveConfig } from "#/server/lib/config";

export const Route = createFileRoute("/api/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;
        const config = await loadConfig(userId);
        return Response.json(config);
      },

      PUT: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;
        const body = await request.json();
        const config = await loadConfig(userId);
        Object.assign(config, body);
        await saveConfig(config);
        return Response.json(config);
      },

      PATCH: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;
        const body = await request.json();

        // Support nested path updates: { path: "agents.defaults.model.primary", value: "gpt-4o" }
        if (body.path && body.value !== undefined) {
          const config = await loadConfig(userId);
          const keys = body.path.split(".");
          let obj: any = config;
          for (let i = 0; i < keys.length - 1; i++) {
            if (obj[keys[i]] === undefined) obj[keys[i]] = {};
            obj = obj[keys[i]];
          }
          obj[keys[keys.length - 1]] = body.value;
          await saveConfig(config);
          return Response.json(config);
        }

        const config = await loadConfig(userId);
        Object.assign(config, body);
        await saveConfig(config);
        return Response.json(config);
      },
    },
  },
});
