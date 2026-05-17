import { PDFParserService } from "./pdf-parser.service";

export interface ParseResult {
  text: string;
  pageCount?: number;
}

export class DocumentParserService {
  static isOcrEligibleMimeType(mimeType: string): boolean {
    return ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mimeType);
  }

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

    if (this.isOcrEligibleMimeType(mimeType)) {
      return { text: "" };
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
