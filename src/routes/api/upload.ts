import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "#/server/middleware";
import { connectDB } from "#/server/db";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const UPLOAD_DIR = path.resolve("uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await requireAuth(request);
        await connectDB();
        const userId = (session.user as any).id;

        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof File)) {
          return Response.json(
            { error: "No file provided" },
            { status: 400 }
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          return Response.json(
            { error: "File too large (max 10 MB)" },
            { status: 413 }
          );
        }

        if (!ALLOWED_TYPES.has(file.type)) {
          return Response.json(
            { error: `File type not allowed: ${file.type}` },
            { status: 415 }
          );
        }

        // Create user upload directory
        const userDir = path.join(UPLOAD_DIR, userId);
        await fs.mkdir(userDir, { recursive: true });

        // Generate unique filename
        const ext = path.extname(file.name) || "";
        const safeBase = file.name
          .replace(ext, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 60);
        const id = crypto.randomBytes(8).toString("hex");
        const filename = `${safeBase}-${id}${ext}`;
        const filePath = path.join(userDir, filename);

        // Write file
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        const url = `/api/upload?file=${encodeURIComponent(userId + "/" + filename)}`;

        return Response.json({
          url,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      },

      // GET /api/upload?file=userId/filename — serve uploaded file
      GET: async ({ request }) => {
        await requireAuth(request);

        const url = new URL(request.url);
        const filePath = url.searchParams.get("file");

        if (!filePath) {
          return Response.json({ error: "Missing file param" }, { status: 400 });
        }

        // Prevent path traversal
        const resolved = path.resolve(UPLOAD_DIR, filePath);
        if (!resolved.startsWith(UPLOAD_DIR)) {
          return Response.json({ error: "Invalid path" }, { status: 403 });
        }

        try {
          const data = await fs.readFile(resolved);
          const ext = path.extname(resolved).toLowerCase();
          const mimeMap: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".pdf": "application/pdf",
            ".txt": "text/plain",
            ".csv": "text/csv",
            ".md": "text/markdown",
            ".json": "application/json",
            ".doc": "application/msword",
            ".docx":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls": "application/vnd.ms-excel",
            ".xlsx":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          };
          return new Response(data, {
            headers: {
              "Content-Type": mimeMap[ext] || "application/octet-stream",
              "Content-Disposition": `inline; filename="${path.basename(resolved)}"`,
              "Cache-Control": "private, max-age=3600",
            },
          });
        } catch {
          return Response.json({ error: "File not found" }, { status: 404 });
        }
      },
    },
  },
});
