import type { Response } from "express";

export function sendApiSuccess(res: Response, data: Record<string, unknown>, status = 200) {
  res.status(status).json({
    success: true,
    data,
  });
}

export function sendApiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
