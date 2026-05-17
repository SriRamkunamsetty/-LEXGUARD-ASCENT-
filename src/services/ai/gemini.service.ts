import { GoogleGenAI, Schema } from "@google/genai";
import { config } from "../../config/env";
import { resolveGeminiBackend } from "./gemini.config";
import { RetryManager } from "../../server/retry-manager";
import { ObservabilityManager } from "../../server/observability-manager";
import { AppError } from "../../server/error-manager";

export class GeminiService {
  private static instance: GeminiService;
  private client: GoogleGenAI;
  private backendMode: "apiKey" | "vertex";

  private constructor() {
    const backend = resolveGeminiBackend({
      GEMINI_API_KEY: config.GEMINI_API_KEY,
      GOOGLE_CLOUD_LOCATION: config.GOOGLE_CLOUD_LOCATION,
      GOOGLE_CLOUD_PROJECT: config.GOOGLE_CLOUD_PROJECT,
      GOOGLE_GENAI_USE_VERTEXAI: config.GOOGLE_GENAI_USE_VERTEXAI,
    });
    this.backendMode = backend.mode;

    this.client =
      backend.mode === "vertex"
        ? new GoogleGenAI({
            vertexai: true,
            project: backend.project,
            location: backend.location,
          })
        : new GoogleGenAI({
            apiKey: backend.apiKey,
          });

    console.log(
      `[GeminiService] Initialized using ${
        this.backendMode === "vertex" ? "Vertex AI" : "Gemini Developer API"
      } mode.`,
    );
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  public async generateContentStructured(
    prompt: string,
    schema: Schema,
    model: string = "gemini-2.5-flash",
    retries = 2,
  ) {
    const timer = ObservabilityManager.startTimer("gemini.generate_structured", {
      model,
      backendMode: this.backendMode,
    });

    try {
      const result = await RetryManager.execute(
        async () => {
          const response = await this.client.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction:
                "You are a legal AI capable of precise reasoning and JSON output. Adhere strictly to the requested schema.",
              temperature: 0.1,
              responseMimeType: "application/json",
              responseSchema: schema,
            },
          });

          if (!response.text) {
            throw new AppError("AI returned empty output text.", "AI_EMPTY_OUTPUT", 502);
          }

          return JSON.parse(response.text);
        },
        {
          retries,
          baseDelayMs: 1000,
          factor: 2,
          shouldRetry: (error) => {
            const normalized = this.normalizeError(error);
            return !normalized.message.includes("revoked as leaked");
          },
        },
      );
      timer.done("success");
      return result;
    } catch (error) {
      const normalizedError = this.normalizeError(error);
      timer.done("failure", { message: normalizedError.message });
      throw new AppError(
        `[GeminiService] Failed after ${retries + 1} attempts: ${normalizedError.message}`,
        "AI_GENERATION_FAILED",
        502,
      );
    }
  }

  public async extractTextFromImagePrompt(fileBuffer: Buffer, mimeType: string, retries = 1): Promise<string> {
    const base64Data = fileBuffer.toString("base64");
    const timer = ObservabilityManager.startTimer("gemini.extract_text", {
      mimeType,
      backendMode: this.backendMode,
    });

    try {
      const result = await RetryManager.execute(
        async () => {
          const response = await this.client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                text: "Extract and return all the text from this document accurately. Do not add markdown formatting or conversational text, just the raw extracted text.",
              },
              {
                inlineData: {
                  data: base64Data,
                  mimeType,
                },
              },
            ],
          });

          if (!response.text) {
            throw new AppError("AI returned empty extracted text.", "AI_EMPTY_OCR_OUTPUT", 502);
          }

          return response.text;
        },
        {
          retries,
          baseDelayMs: 1000,
          factor: 2,
          shouldRetry: (error) => !this.normalizeError(error).message.includes("revoked as leaked"),
        },
      );
      timer.done("success");
      return result;
    } catch (error) {
      const normalizedError = this.normalizeError(error);
      timer.done("failure", { message: normalizedError.message });
      throw new AppError(
        `[GeminiService] OCR failed after ${retries + 1} attempts: ${normalizedError.message}`,
        "AI_OCR_FAILED",
        502,
      );
    }
  }

  private normalizeError(error: unknown): Error {
    const message = error instanceof Error ? error.message : (error as any)?.message || "Unknown Gemini error";

    if (message.includes("reported as leaked")) {
      return new Error(
        "Gemini API key has been revoked as leaked. Rotate the key immediately or use Vertex AI on Cloud Run with ADC and Secret Manager.",
      );
    }

    if (message.includes("PERMISSION_DENIED")) {
      return new Error("Gemini authorization failed. Verify the runtime credential mode and IAM bindings.");
    }

    return error instanceof Error ? error : new Error(message);
  }
}
