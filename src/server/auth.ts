/**
 * Authentication utilities and middleware factory.
 *
 * The primary auth middleware is constructed via dependency injection in createApp().
 * This module preserves the reusable factory for use in standalone contexts
 * (e.g., integration tests, microservice extraction).
 */
import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { extractBearerToken } from "./auth.utils";
import type { VerifyIdTokenFn } from "./auth.types";
import { ObservabilityManager } from "./observability-manager";

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

export function createFirebaseAuthMiddleware(verifyIdToken: VerifyIdTokenFn) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({ error: "Missing Firebase ID token." });
        return;
      }

      req.user = await verifyIdToken(token);
      next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      ObservabilityManager.logWarn("auth.token_verification_failed", { message });
      res.status(401).json({ error: "Invalid or expired Firebase ID token." });
    }
  };
}
