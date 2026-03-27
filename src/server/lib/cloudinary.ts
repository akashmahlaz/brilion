import { v2 as cloudinary } from "cloudinary";

// Configure once — API key + secret enables signed uploads (unlimited size)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

interface UploadOptions {
  folder?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
  format?: string;
  publicId?: string;
  tags?: string[];
}

/**
 * Signed upload to Cloudinary — uses API key + secret for authentication.
 * No file size limits. Returns the secure CDN URL.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  mimeType: string,
  opts: UploadOptions = {}
): Promise<{ url: string; publicId: string; bytes: number; width?: number; height?: number; format?: string }> {
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: opts.folder || "brilion/media",
    resource_type: opts.resourceType || "auto",
    format: opts.format,
    public_id: opts.publicId,
    tags: opts.tags,
    // Signed upload: Cloudinary SDK auto-signs with api_key + api_secret from config
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

/**
 * Upload a video from an external URL to Cloudinary (e.g. Sora result URL).
 * Cloudinary fetches the video directly — no need to download first.
 * Signed upload — no size limits.
 */
export async function uploadVideoUrlToCloudinary(
  videoUrl: string,
  opts: UploadOptions = {}
): Promise<{ url: string; publicId: string; bytes: number; duration?: number }> {
  const result = await cloudinary.uploader.upload(videoUrl, {
    folder: opts.folder || "brilion/media",
    resource_type: "video",
    tags: opts.tags,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    duration: result.duration,
  };
}

export { cloudinary };
