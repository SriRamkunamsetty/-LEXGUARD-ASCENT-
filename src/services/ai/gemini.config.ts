export type GeminiBackendConfig =
  | {
      mode: "vertex";
      project: string;
      location: string;
    }
  | {
      mode: "apiKey";
      apiKey: string;
    };

type GeminiEnvLike = Partial<Record<string, string | undefined>> & {
  GEMINI_API_KEY?: string;
  GOOGLE_CLOUD_LOCATION?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_GENAI_USE_VERTEXAI?: string | boolean;
};

export function resolveGeminiBackend(env: GeminiEnvLike): GeminiBackendConfig {
  const useVertexAI =
    env.GOOGLE_GENAI_USE_VERTEXAI === true ||
    env.GOOGLE_GENAI_USE_VERTEXAI === "true" ||
    !!env.GOOGLE_CLOUD_PROJECT?.trim();

  if (useVertexAI) {
    const project = env.GOOGLE_CLOUD_PROJECT?.trim();
    if (!project) {
      throw new Error("GOOGLE_CLOUD_PROJECT is required when Vertex AI mode is enabled.");
    }

    return {
      mode: "vertex",
      project,
      location: env.GOOGLE_CLOUD_LOCATION?.trim() || "global",
    };
  }

  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Gemini credentials are missing. Provide GEMINI_API_KEY for local development or enable Vertex AI on Cloud Run.",
    );
  }

  return {
    mode: "apiKey",
    apiKey,
  };
}
