import { z } from "zod";

// Define the schema for our backend environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GOOGLE_CLOUD_PROJECT: z.string().trim().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().trim().default("global"),
  GOOGLE_GENAI_USE_VERTEXAI: z.enum(["true", "false"]).optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_DATABASE_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let env: EnvConfig;

try {
  env = envSchema.parse(process.env);
  console.log("[Config] Environment variables validated successfully.");
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("[Config] ❌ Environment configuration validation failed:");
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
  } else {
    console.error("[Config] ❌ Unknown error during environment validation:", error);
  }
  
  // Provide a safe fallback or crash gracefully depending on requirements
  // We'll proceed with partial process.env to allow the server to boot
  // but it will likely fail on specific service initialization.
  console.warn("[Config] Proceeding with unvalidated environment. Some services may crash.");
  env = process.env as any;
}

export const config = {
  ...env,
  get useVertexAI() {
    return env.GOOGLE_GENAI_USE_VERTEXAI === "true" || !!env.GOOGLE_CLOUD_PROJECT;
  },
  // Helper to safely parse private keys
  get parsedFirebasePrivateKey() {
    if (!env.FIREBASE_PRIVATE_KEY) return undefined;
    
    // Handle various ways the private key might be formatted in env vars
    let key = env.FIREBASE_PRIVATE_KEY;
    
    // If it's wrapped in quotes, remove them
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.slice(1, -1);
    } else if (key.startsWith("'") && key.endsWith("'")) {
      key = key.slice(1, -1);
    }
    
    // Replace literal '\n' strings with actual newlines
    return key.replace(/\\n/g, '\n');
  }
};
