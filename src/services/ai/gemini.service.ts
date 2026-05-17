import { GoogleGenAI, Type, Schema, GenerateContentParameters } from "@google/genai";
import { config } from "../../config/env";

export class GeminiService {
  private static instance: GeminiService;
  private client: GoogleGenAI;

  private constructor() {
    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("CRITICAL: GEMINI_API_KEY environment variable is missing.");
    }
    
    console.log(`[GeminiService] Initializing with key starting with: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);
    
    // Initialize the client strictly securely
    this.client = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'lexguard-production',
        }
      }
    });

    console.log("[GeminiService] ✅ Initialized securely.");
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Centralized wrapper for generating content
   * Includes structured logging and basic validation
   */
  public async generateContentStructured(prompt: string, schema: Schema, model: string = "gemini-2.5-flash", retries = 2) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        console.log(`[GeminiService] generateContentStructured - Model: ${model}, Attempt: ${attempt + 1}/${retries + 1}`);
        const response = await this.client.models.generateContent({
          model: model,
          contents: prompt,
          config: {
             // System instructions should be parameterized better in a real setup, but here it's fine for hackathon
            systemInstruction: "You are a legal AI capable of precise reasoning and JSON output. Adhere strictly to the requested schema.",
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: schema,
          }
        });

        if (!response.text) {
          throw new Error("AI returned empty output text.");
        }

        // Validate JSON
        const parsed = JSON.parse(response.text);
        console.log("[GeminiService] generateContentStructured - Success");
        return parsed;
        
      } catch (error: any) {
        console.error(`[GeminiService] ❌ Error on attempt ${attempt + 1}:`, error.message || error);
        attempt++;
        if (attempt > retries) {
          throw new Error(`[GeminiService] Failed after ${retries + 1} attempts: ${error.message || "Unknown error"}`);
        }
        // Small exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  /**
   * Helper to extract raw text (OCR) from a document or image using Gemini
   */
  public async extractTextFromImagePrompt(fileBuffer: Buffer, mimeType: string, retries = 1): Promise<string> {
    let attempt = 0;
    const base64Data = fileBuffer.toString("base64");
    
    while (attempt <= retries) {
      try {
        console.log(`[GeminiService] extractTextFromImagePrompt - Attempt: ${attempt + 1}/${retries + 1}`);
        const response = await this.client.models.generateContent({
          model: "gemini-2.5-flash", // flash is fast and cheap for OCR
          contents: [
            { text: "Extract and return all the text from this document accurately. Do not add markdown formatting or conversational text, just the raw extracted text." },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              }
            }
          ]
        });

        if (!response.text) {
          throw new Error("AI returned empty extracted text.");
        }

        console.log("[GeminiService] extractTextFromImagePrompt - Success");
        return response.text;
      } catch (error: any) {
        console.error(`[GeminiService] ❌ Error in extractTextFromImagePrompt (attempt ${attempt + 1}):`, error.message || error);
        attempt++;
        if (attempt > retries) {
          throw new Error(`[GeminiService] OCR Failed after ${retries + 1} attempts: ${error.message || "Unknown error"}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
    return "";
  }
}
