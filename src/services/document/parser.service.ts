import { PDFParserService } from "./pdf-parser.service";

export interface ParseResult {
  text: string;
  pageCount?: number;
}

export class DocumentParserService {
  static async parsePDF(buffer: Buffer): Promise<ParseResult> {
    const rawData = await PDFParserService.parse(buffer);
    return {
      text: rawData.text,
      pageCount: rawData.numpages,
    };
  }

  static async extractText(fileBuffer: Buffer, mimeType: string): Promise<ParseResult> {
    if (mimeType === "application/pdf") {
      return this.parsePDF(fileBuffer);
    }
    
    // Fallback for raw text/markdown
    if (mimeType.startsWith("text/")) {
      return { text: fileBuffer.toString("utf-8") };
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
