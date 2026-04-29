/**
 * Multi-tenant Chat SDK webhook receiver.
 *
 * URL: `/api/webhooks/<userId>/<platform>`
 *
 * `<userId>` is the Brilion user id; `<platform>` matches the Chat SDK
 * adapter key (`telegram`, `slack`, `discord`, …). Each user has their own
 * `Chat` instance built lazily by `bot-registry`. We hand the incoming
 * request directly to `chat.webhooks[platform]`, which:
 *   - verifies the signature/secret per-platform,
 *   - dedupes retries,
 *   - acquires per-thread locks,
 *   - and fires `onNewMention` / `onSubscribedMessage` handlers we registered
 *     in `bot-registry.ts`.
 *
 * SECURITY NOTE: The userId is in the URL path. That's safe because the
 * adapter still validates the webhook secret before doing anything — an
 * attacker who guesses the userId still cannot forge messages.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getBotForUser } from "#/server/lib/bot-registry";

export const Route = createFileRoute("/api/webhooks/$userId/$platform")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { userId, platform } = params;
        if (!userId || !platform) {
          return Response.json({ error: "missing path params" }, { status: 400 });
        }

        let entry;
        try {
          entry = await getBotForUser(userId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === "no-adapters") {
            return Response.json({ error: "no adapters configured" }, { status: 404 });
          }
          return Response.json({ error: msg }, { status: 500 });
        }

        if (!entry || !entry.adapters.has(platform as any)) {
          return Response.json(
            { error: `platform ${platform} not configured for this user` },
            { status: 404 }
          );
        }

        const handler = (entry.chat.webhooks as any)[platform];
        if (typeof handler !== "function") {
          return Response.json(
            { error: `no webhook handler for ${platform}` },
            { status: 404 }
          );
        }

        return handler(request);
      },
      // Some platforms (Slack, GitHub) probe with GET during setup; mirror to POST.
      GET: async ({ request, params }) => {
        const { userId, platform } = params;
        const entry = await getBotForUser(userId).catch(() => null);
        if (!entry || !entry.adapters.has(platform as any)) {
          return Response.json({ ok: false, error: "not configured" }, { status: 404 });
        }
        return Response.json({ ok: true, platform, ready: true });
      },
    },
  },
});
