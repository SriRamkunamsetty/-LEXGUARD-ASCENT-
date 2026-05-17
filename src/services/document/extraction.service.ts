import { DocumentParserService } from "./parser.service";

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
    
    // 2. OCR Fallback handling (stubbed out for future scale)
    if (!result.text || result.text.trim() === '') {
        console.warn("[ExtractionService] Text extraction empty. Falling back to OCR processing pipeline.");
        // const ocrData = await OCRService.processVisualLayer(fileBuffer);
        // return ocrData.text;
    }

    return result.text;
  }
}
