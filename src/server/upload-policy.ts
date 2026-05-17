import type { Options } from "multer";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export function isSupportedUploadType(mimeType: string) {
  return SUPPORTED_UPLOAD_TYPES.has(mimeType);
}

export function createUploadPolicy(): Pick<Options, "limits" | "fileFilter"> {
  return {
    limits: { fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!isSupportedUploadType(file.mimetype)) {
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
        return;
      }

      cb(null, true);
    },
  };
}
