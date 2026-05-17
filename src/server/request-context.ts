import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export interface RequestContextRequest extends Request {
  requestId?: string;
}

export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

export function attachRequestContext(req: RequestContextRequest, res: Response, next: NextFunction) {
  const requestId = req.headers["x-request-id"]?.toString().trim() || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
