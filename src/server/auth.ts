import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FirebaseAdminService } from "../services/firebase/firebase.admin.service";
import { extractBearerToken } from "./auth.utils";
import type { VerifyIdTokenFn } from "./auth.types";

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
    } catch (error: any) {
      console.error("[Auth] Token verification failed:", error?.message || error);
      res.status(401).json({ error: "Invalid or expired Firebase ID token." });
    }
  };
}

export const requireFirebaseAuth = createFirebaseAuthMiddleware((token) =>
  FirebaseAdminService.getInstance().verifyIdToken(token),
);
