import type { NextFunction, Request, Response } from "express";
import { ErrorManager } from "./error-manager";
import { FirestoreRateLimitService, type RateLimitStore } from "../services/firebase/firestore-rate-limit.service";
import { sendApiError } from "./api-response";
import { ObservabilityManager } from "./observability-manager";

export function createRateLimitMiddleware(options?: {
  limit?: number;
  windowMs?: number;
  keyPrefix?: string;
  store?: RateLimitStore;
}) {
  const limit = options?.limit ?? 10;
  const windowMs = options?.windowMs ?? 60_000;
  const keyPrefix = options?.keyPrefix ?? "global";
  const store = options?.store ?? FirestoreRateLimitService.getInstance();

  return async (req: Request, res: Response, next: NextFunction) => {
    const identity = req.headers.authorization?.toString() || req.ip || "anonymous";
    const key = `${keyPrefix}:${identity}`;

    try {
      const result = await store.consume({
        key,
        limit,
        windowMs,
      });

      if (!result.allowed) {
        sendApiError(res, 429, "RATE_LIMITED", "Too many requests. Please wait and try again.", {
          remaining: result.remaining,
        });
        return;
      }

      next();
    } catch (error) {
      const normalized = ErrorManager.fromUnknown(error, "Rate limiter failed.");
      ObservabilityManager.logError("rate_limit.failed", {
        keyPrefix,
        message: normalized.message,
      });
      next();
    }
  };
}
