import { config } from "../src/config/env";
import { StartupVerificationService } from "../src/services/system/startup-verification.service";

const report = StartupVerificationService.verify({
  useVertexAI: config.useVertexAI,
  hasGeminiApiKey: !!config.GEMINI_API_KEY,
  firebaseProjectId: config.FIREBASE_PROJECT_ID,
  googleCloudProject: config.GOOGLE_CLOUD_PROJECT,
  port: config.PORT,
});

if (!report.ok) {
  console.error("Startup verification failed.");
  report.errors.forEach((error) => console.error(`ERROR: ${error}`));
  report.warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
  process.exit(1);
}

console.log("Startup verification passed.");
report.warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
