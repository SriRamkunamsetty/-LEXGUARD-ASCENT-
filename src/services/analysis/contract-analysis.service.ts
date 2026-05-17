import { ExtractionService } from "../document/extraction.service";
import { GeminiService } from "../ai/gemini.service";
import { contractAnalysisSchema as contractAnalysisResponseSchema } from "./analysis.schema";
import { buildContractAnalysisPrompt, detectPromptInjectionSignals } from "./prompt-guard.service";
import { ValidationManager } from "../../server/validation-manager";
import { contractAnalysisSchema } from "../../shared/contracts";

export type AnalysisProgressEvent = {
  step: "INGESTION" | "AGENT_ORCHESTRATION" | "AGENT_REASONING" | "FINALIZING";
  message: string;
};

export type AnalyzeContractInput = {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
};

export class ContractAnalysisService {
  static async analyze(
    input: AnalyzeContractInput,
    onProgress?: (event: AnalysisProgressEvent) => void,
  ) {
    ValidationManager.validateUpload({
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.buffer.byteLength,
    });

    onProgress?.({
      step: "INGESTION",
      message: `Received ${input.originalName}. Processing OCR/Text extraction...`,
    });

    const extractedText = await ExtractionService.extractContext(input.buffer, input.mimeType);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Could not extract any text from the document. The document appears to be empty or unreadable.");
    }

    onProgress?.({
      step: "AGENT_ORCHESTRATION",
      message: "Initiating multi-agent semantic analysis...",
    });

    onProgress?.({
      step: "AGENT_REASONING",
      message: "Legal Reasoning Engine evaluating clauses and mapping scenarios...",
    });

    const prompt = buildContractAnalysisPrompt(extractedText);
    const injectionSignals = detectPromptInjectionSignals(extractedText);
    const parsedData = await GeminiService.getInstance().generateContentStructured(
      prompt,
      contractAnalysisResponseSchema,
      "gemini-2.5-flash",
    );

    onProgress?.({
      step: "FINALIZING",
      message: "Parsing analysis array...",
    });

    return {
      parsedData: contractAnalysisSchema.parse(parsedData),
      injectionSignals,
      extractedTextLength: extractedText.length,
    };
  }
}
