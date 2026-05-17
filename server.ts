import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { config } from "./src/config/env";
import { createApp } from "./src/server/app";
import { ObservabilityManager } from "./src/server/observability-manager";
import { FirebaseAdminService } from "./src/services/firebase/firebase.admin.service";
import { AnalysisWorkflowService } from "./src/services/analysis/analysis-workflow.service";
import { HealthService } from "./src/services/system/health.service";
import { StartupVerificationService } from "./src/services/system/startup-verification.service";

const PORT = config.PORT;

try {
  FirebaseAdminService.getInstance();
} catch (error) {
  ObservabilityManager.logError("service.firebase.init_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
}

const startupVerification = StartupVerificationService.verify({
  useVertexAI: config.useVertexAI,
  hasGeminiApiKey: !!config.GEMINI_API_KEY,
  firebaseProjectId: config.FIREBASE_PROJECT_ID,
  googleCloudProject: config.GOOGLE_CLOUD_PROJECT,
  port: PORT,
});

if (!startupVerification.ok) {
  ObservabilityManager.logError("startup.verification_failed", {
    errors: startupVerification.errors,
    warnings: startupVerification.warnings,
  });
}

const app = createApp({
  verifyIdToken: (token) => FirebaseAdminService.getInstance().verifyIdToken(token),
  evaluateReadiness: () =>
    HealthService.evaluateReadiness({
      firebaseReady: startupVerification.ok,
      vertexConfigured: config.useVertexAI || !!config.GEMINI_API_KEY,
      firestoreWritable: startupVerification.ok,
    }),
  runAnalysisWorkflow: (input, onProgress) => AnalysisWorkflowService.execute(input, onProgress),
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    ObservabilityManager.logInfo("server.started", {
      port: PORT,
      nodeEnv: process.env.NODE_ENV || "development",
      useVertexAI: config.useVertexAI,
      startupWarnings: startupVerification.warnings,
    });
  });
}
startServer();
