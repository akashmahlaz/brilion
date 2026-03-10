import { createFileRoute } from "@tanstack/react-router";
import { connectDB } from "#/server/db";
import { requireAuth } from "#/server/middleware";
import {
  ensureWorkspace,
  readWorkspaceFile,
  writeWorkspaceFile,
  listWorkspaceFiles,
} from "#/server/lib/workspace";

export const Route = createFileRoute("/api/workspace")({
  server: {
    handlers: {
      // GET /api/workspace — list files or read a file
      GET: async ({ request }) => {
        await requireAuth(request);
        await connectDB();

        const url = new URL(request.url);
        const filename = url.searchParams.get("filename");

        if (filename) {
          const content = await readWorkspaceFile(filename);
          if (content === null) {
            return Response.json(
              { error: "File not found" },
              { status: 404 }
            );
          }
          return Response.json({ filename, content });
        }

        await ensureWorkspace();
        const files = await listWorkspaceFiles();
        return Response.json(files);
      },

      // PUT /api/workspace — write a file
      PUT: async ({ request }) => {
        await requireAuth(request);
        await connectDB();

        const body = await request.json();
        const { filename, content } = body;
        if (!filename || content === undefined) {
          return Response.json(
            { error: "filename and content required" },
            { status: 400 }
          );
        }

        await writeWorkspaceFile(filename, content);
        return Response.json({ ok: true, filename });
      },
    },
  },
});
