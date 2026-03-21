import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import {
  listPendingPairings,
  approvePairing,
  rejectPairing,
} from "#/server/lib/pairing";

export const Route = createFileRoute("/api/pairing")({
  server: {
    handlers: {
      // GET /api/pairing — list pending pairing requests
      GET: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const pending = await listPendingPairings(userId);
        return Response.json({ pending });
      },

      // POST /api/pairing — approve or reject a pairing request
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const body = await request.json();
        const { action, code } = body as { action: string; code: string };

        if (!code || typeof code !== "string") {
          return Response.json(
            { ok: false, error: "Missing code" },
            { status: 400 }
          );
        }

        if (action === "approve") {
          const result = await approvePairing({ userId, code });
          return Response.json(result, { status: result.ok ? 200 : 400 });
        }

        if (action === "reject") {
          const result = await rejectPairing({ userId, code });
          return Response.json(result, { status: result.ok ? 200 : 400 });
        }

        return Response.json(
          { ok: false, error: "Invalid action. Use 'approve' or 'reject'." },
          { status: 400 }
        );
      },
    },
  },
});
