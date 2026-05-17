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
    
    // Clean up typical garbage from pdf-parse (like repeated newlines or zero-width spaces)
    const cleanedText = result.text ? result.text.replace(/[\s\u200B-\u200D\uFEFF]/g, "") : "";

    // 2. OCR Fallback handling
    if (cleanedText.length < 50) {
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
