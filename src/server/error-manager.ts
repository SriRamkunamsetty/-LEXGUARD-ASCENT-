import { sendApiError } from "./api-response";
import type { Response } from "express";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ErrorManager {
  static fromUnknown(error: unknown, fallbackMessage = "An unexpected error occurred") {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message || fallbackMessage, "INTERNAL_ERROR", 500);
    }

    return new AppError(fallbackMessage, "INTERNAL_ERROR", 500, {
      raw: String(error),
    });
  }

  static respond(res: Response, error: unknown) {
    const normalized = this.fromUnknown(error);
    sendApiError(res, normalized.status, normalized.code, normalized.message, normalized.details);
  }
}
