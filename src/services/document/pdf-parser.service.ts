import { createRequire } from "module";

const requireNode = createRequire(import.meta.url);

export interface PDFParseResult {
  text: string;
  numpages: number;
}

/**
 * PDFParserService
 * 
 * Specialized implementation purely for parsing PDFs, keeping the nasty
 * CommonJS / ESM bridge securely sandboxed away from the core app runtime.
 */
export class PDFParserService {
  static async parse(buffer: Buffer): Promise<PDFParseResult> {
    try {
      // Isolate Native CommonJS module loading safely.
      const pdfParse = requireNode("pdf-parse");
      
      const parseFunc = typeof pdfParse === "function" ? pdfParse : pdfParse.default || pdfParse;
      
      if (typeof parseFunc !== "function") {
        throw new Error(`Resolved pdf-parse is not a function: ${typeof parseFunc}`);
      }

      const data = await parseFunc(buffer);

      return {
        text: data.text || "",
        numpages: data.numpages || 0,
      };
    } catch (error: any) {
      console.error("[PDFParserService] Native Parsing Exception:", error);
      throw new Error(`Failed to decode PDF context stream [DEBUG]: ${error.message}`);
    }
  }
}
