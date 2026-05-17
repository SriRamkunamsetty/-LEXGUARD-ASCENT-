import { DocumentParserService } from "./parser.service";
import { GeminiService } from "../ai/gemini.service";

/**
 * ExtractionService
 * 
 * Central orchestration for analyzing and extracting structured semantics
 * from documents, combining parser services, OCR pipelines, and ML extractors.
 */
export class ExtractionService {
  /**
   * Pipeline to extract context and prep it for downstream multi-agent evaluation.
   */
  static async extractContext(fileBuffer: Buffer, mimeType: string): Promise<string> {
    // 1. Core parsing (PDF/Text)
    const result = await DocumentParserService.extractText(fileBuffer, mimeType);
    
    // 2. OCR Fallback handling
    if (!result.text || result.text.trim() === '') {
        console.warn("[ExtractionService] Text extraction empty. Falling back to OCR processing pipeline via Gemini.");
        try {
          const ocrText = await GeminiService.getInstance().extractTextFromImagePrompt(fileBuffer, mimeType);
          return ocrText;
        } catch (e: any) {
          console.error("[ExtractionService] OCR Fallback failed:", e.message);
          throw new Error("OCR Fallback failed: " + e.message);
        }
    }

    return result.text;
  }
}
