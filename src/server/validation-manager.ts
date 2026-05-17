import path from "node:path";
import { z } from "zod";
import { isSupportedUploadType, MAX_UPLOAD_BYTES } from "./upload-policy";

const uploadRequestSchema = z.object({
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

const supportedExtensions = new Set([".pdf", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp"]);

export class ValidationManager {
  static validateUpload(input: { originalName: string; mimeType: string; size: number }) {
    const parsed = uploadRequestSchema.parse(input);
    const extension = path.extname(parsed.originalName).toLowerCase();

    if (!supportedExtensions.has(extension)) {
      throw new Error(`Unsupported file extension: ${extension || "unknown"}`);
    }

    if (!isSupportedUploadType(parsed.mimeType)) {
      throw new Error(`Unsupported file type: ${parsed.mimeType}`);
    }

    return parsed;
  }
}
