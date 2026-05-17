import express from "express";
import multer from "multer";
import type { Request, Response } from "express";
import { applyCorsHeaders, applySecurityHeaders, attachRequestContext, type RequestContextRequest } from "./request-context";
import crypto from "node:crypto";
import { createRateLimitMiddleware } from "./rate-limit";
import { createUploadPolicy } from "./upload-policy";
import { sendApiSuccess } from "./api-response";
import { SseManager } from "./sse-manager";
import { ObservabilityManager } from "./observability-manager";
import { extractBearerToken } from "./auth.utils";
import type { VerifyIdTokenFn } from "./auth.types";
import type { DecodedIdToken } from "firebase-admin/auth";
import { HealthService, type ReadinessReport } from "../services/system/health.service";
import type { RateLimitStore } from "../services/firebase/firestore-rate-limit.service";
import { AppError, ErrorManager } from "./error-manager";

export interface AuthenticatedRequest extends Request, RequestContextRequest {
  user?: DecodedIdToken;
}

type WorkflowResult = {
  contractId: string;
  parsedData: unknown;
  injectionSignals: string[];
  extractedTextLength: number;
};

type ProgressEvent = {
  step: "INGESTION" | "AGENT_ORCHESTRATION" | "AGENT_REASONING" | "FINALIZING";
  message: string;
};

export type AppDependencies = {
  verifyIdToken: VerifyIdTokenFn;
  evaluateReadiness: () => ReadinessReport;
  rateLimitStore?: RateLimitStore;
  runAnalysisWorkflow: (
    input: {
      requestId?: string;
      userId: string;
      file: {
        buffer: Buffer;
        mimetype: string;
        originalname: string;
        size: number;
      };
    },
    onProgress?: (event: ProgressEvent) => void,
  ) => Promise<WorkflowResult>;
};

function requireFirebaseAuth(verifyIdToken: VerifyIdTokenFn) {
  return async (req: AuthenticatedRequest, res: Response, next: express.NextFunction) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({ error: "Missing Firebase ID token." });
        return;
      }

      req.user = await verifyIdToken(token);
      next();
    } catch (error: any) {
      ObservabilityManager.logWarn("auth.token_verification_failed", {
        message: error?.message || String(error),
      });
      res.status(401).json({ error: "Invalid or expired Firebase ID token." });
    }
  };
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    ...createUploadPolicy(),
  });

  app.disable("x-powered-by");
  app.use(applyCorsHeaders);
  app.use(applySecurityHeaders);
  app.use(attachRequestContext);
  app.use(express.json({ limit: "1mb" }));
  app.use(
    "/api/analyze",
    createRateLimitMiddleware({
      limit: 6,
      windowMs: 60_000,
      keyPrefix: "analyze",
      store: dependencies.rateLimitStore,
    }),
  );

  app.get("/api/health", (req: RequestContextRequest, res) => {
    const readiness = dependencies.evaluateReadiness();
    sendApiSuccess(res, {
      status: readiness.status,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      checks: readiness.checks,
    });
  });

  app.post(
    "/api/analyze",
    requireFirebaseAuth(dependencies.verifyIdToken),
    upload.single("document"),
    async (req: AuthenticatedRequest, res: Response) => {
      SseManager.initialize(res);

      let clientClosed = false;
      req.on("close", () => {
        clientClosed = true;
        ObservabilityManager.logWarn("analysis.client_disconnected", {
          requestId: req.requestId,
          userId: req.user?.uid,
        });
      });

      try {
        const file = req.file;
        if (!file) {
          SseManager.send(res, "error", { message: "No document provided", requestId: req.requestId });
          res.end();
          return;
        }

        ObservabilityManager.logInfo("analysis.request_received", {
          requestId: req.requestId,
          userId: req.user?.uid,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
        });

        if (clientClosed) {
          return;
        }

        const { parsedData, injectionSignals, extractedTextLength, contractId } =
          await dependencies.runAnalysisWorkflow(
            {
              requestId: req.requestId,
              userId: req.user!.uid,
              file: {
                buffer: file.buffer,
                mimetype: file.mimetype,
                originalname: file.originalname,
                size: file.size,
              },
            },
            (event) => {
              SseManager.send(res, "status", {
                ...event,
                requestId: req.requestId,
              });
            },
          );

        SseManager.send(res, "complete", {
          data: parsedData,
          contractId,
          userId: req.user?.uid,
          requestId: req.requestId,
        });
        ObservabilityManager.logInfo("analysis.completed", {
          requestId: req.requestId,
          userId: req.user?.uid,
          contractId,
          clauseCount: (parsedData as any)?.clauses?.length,
          riskScore: (parsedData as any)?.overallRiskScore,
          confidenceScore: (parsedData as any)?.confidenceScore,
          injectionSignalCount: injectionSignals.length,
          extractedTextLength,
        });
        res.end();
      } catch (error: any) {
        ObservabilityManager.logError("analysis.failed", {
          requestId: req.requestId,
          userId: req.user?.uid,
          message: error?.message || "Failed to process document",
        });
        SseManager.send(res, "error", {
          message: error?.message || "Failed to process document",
          requestId: req.requestId,
        });
        res.end();
      }
    },
  );

  app.use((error: unknown, req: RequestContextRequest, res: Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    let normalizedError = ErrorManager.fromUnknown(error, "Request processing failed.");

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      normalizedError = new AppError("Uploaded file exceeds the 10 MB limit.", "UPLOAD_TOO_LARGE", 413);
    } else if (error instanceof Error && error.message.includes("Unsupported file type")) {
      normalizedError = new AppError(error.message, "UNSUPPORTED_FILE_TYPE", 415);
    }

    ObservabilityManager.logError("http.request_failed", {
      requestId: req.requestId,
      status: normalizedError.status,
      code: normalizedError.code,
      message: normalizedError.message,
    });
    ErrorManager.respond(res, normalizedError);
  });

  return app;
}
