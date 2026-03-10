import { createFileRoute } from "@tanstack/react-router";
import { connectDB, mongoose } from "#/server/db";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        let dbStatus = "disconnected";
        try {
          await connectDB();
          dbStatus =
            mongoose.connection.readyState === 1
              ? "connected"
              : "disconnected";
        } catch {
          dbStatus = "error";
        }

        return Response.json({
          status: "ok",
          timestamp: new Date().toISOString(),
          database: dbStatus,
        });
      },
    },
  },
});
