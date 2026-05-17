import { GoogleGenAI, Type, Schema, GenerateContentParameters } from "@google/genai";

export class GeminiService {
  private static instance: GeminiService;
  private client: GoogleGenAI;

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("CRITICAL: GEMINI_API_KEY environment variable is missing.");
    }
    
    // Initialize the client strictly securely
    this.client = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'lexguard-production',
        }
      }
    });

    console.log("[GeminiService] Initialized securely.");
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
  public async generateContentStructured(prompt: string, schema: Schema, model: string = "gemini-2.5-pro", retries = 2) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        console.log(`[GeminiService] generateContentStructured - Model: ${model}, Attempt: ${attempt + 1}/${retries + 1}`);
        const response = await this.client.models.generateContent({
          model: model,
          contents: prompt,
          config: {
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
        console.error(`[GeminiService] Error on attempt ${attempt + 1}:`, error.message || error);
        attempt++;
        if (attempt > retries) {
          throw new Error(`[GeminiService] Failed after ${retries + 1} attempts: ${error.message || "Unknown error"}`);
        }
        // Small exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
}
