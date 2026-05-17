export type StartupVerificationReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type StartupVerificationInput = {
  useVertexAI: boolean;
  hasGeminiApiKey: boolean;
  firebaseProjectId?: string;
  googleCloudProject?: string;
  port: number;
};

export class StartupVerificationService {
  static verify(input: StartupVerificationInput): StartupVerificationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (input.port <= 0) {
      errors.push("PORT must be a positive integer.");
    }

    if (input.useVertexAI && !input.googleCloudProject?.trim()) {
      errors.push("GOOGLE_CLOUD_PROJECT is required when Vertex AI mode is enabled.");
    }

    if (!input.useVertexAI && !input.hasGeminiApiKey) {
      errors.push("GEMINI_API_KEY is required when Vertex AI mode is disabled.");
    }

    if (!input.firebaseProjectId?.trim() && !input.googleCloudProject?.trim()) {
      warnings.push("Firebase project configuration is not set. Backend auth and Firestore access may fail.");
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings,
    };
  }
}
