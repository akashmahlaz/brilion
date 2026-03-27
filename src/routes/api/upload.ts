import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "#/server/middleware";
import { connectDB } from "#/server/db";
import { uploadToCloudinary } from "#/server/lib/cloudinary";

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

        const buffer = Buffer.from(await file.arrayBuffer());

        // Determine Cloudinary resource type from MIME
        const isImage = file.type.startsWith("image/");
        const resourceType = isImage ? "image" as const : "raw" as const;

        const result = await uploadToCloudinary(buffer, file.type, {
          folder: `brilion/uploads/${userId}`,
          resourceType,
          tags: ["user-upload", userId],
        });

        return Response.json({
          url: result.url,
          publicUrl: result.url,
          name: file.name,
          size: file.size,
          type: file.type,
          width: result.width,
          height: result.height,
        });
      },
    },
  },
});
