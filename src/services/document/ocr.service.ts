/**
 * OCRService
 * 
 * Future-proof service wrapper to integrate with Google Cloud Vision API 
 * or internal Tesseract clusters for scanning flattened/image-only PDFs.
 */
export class OCRService {
  static async processVisualLayer(fileBuffer: Buffer): Promise<{ text: string }> {
    // Enterprise placeholder for production OCR
    throw new Error("OCR Service is currently disabled in this environment.");
  }
}
