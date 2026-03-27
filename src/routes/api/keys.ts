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
import { createLogger } from "#/server/models/log-entry";

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

        const sysLogger = createLogger(userId, "api");

        // Copilot device flow endpoints
        if (body.action === "copilot-device-code") {
          sysLogger.info("Copilot device login started");
          const data = await startDeviceCodeFlow();
          sysLogger.debug("Copilot device code issued", { userCode: data.user_code, expiresIn: data.expires_in });
          return Response.json(data);
        }
        if (body.action === "copilot-check") {
          try {
            const data = await checkDeviceCode(body.deviceCode);
            if (data.access_token) {
              try {
                await upsertAuthProfile("github-copilot", {
                  type: "oauth",
                  provider: "github-copilot",
                  token: data.access_token,
                }, userId);
                sysLogger.info("Copilot device login successful — token saved", { provider: "github-copilot" });
              } catch (saveErr) {
                sysLogger.error("Copilot token save failed", { error: saveErr instanceof Error ? saveErr.message : String(saveErr) });
                return Response.json({ error: "token_save_failed" }, { status: 500 });
              }
            } else if (data.error && data.error !== "authorization_pending") {
              sysLogger.warn("Copilot device login failed", { error: data.error });
            }
            return Response.json(data);
          } catch (checkErr) {
            sysLogger.error("Copilot device code check failed", { error: checkErr instanceof Error ? checkErr.message : String(checkErr) });
            return Response.json({ error: "device_check_failed" }, { status: 502 });
          }
        }

        // Regular API key save
        const { provider, apiKey, baseUrl } = body;
        if (!provider || !apiKey) {
          return Response.json(
            { error: "provider and apiKey required" },
            { status: 400 }
          );
        }

        try {
          await upsertAuthProfile(provider, {
            type: "api_key",
            provider,
            token: apiKey,
            baseUrl,
          }, userId);
        } catch (saveErr) {
          sysLogger.error("API key save failed", { provider, error: saveErr instanceof Error ? saveErr.message : String(saveErr) });
          return Response.json({ error: "Failed to save key" }, { status: 500 });
        }

        sysLogger.info("API key saved", { provider, hasBaseUrl: !!baseUrl });
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
