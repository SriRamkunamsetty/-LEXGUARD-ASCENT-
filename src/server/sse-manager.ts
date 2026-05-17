import type { Response } from "express";

export type SseEventType = "status" | "complete" | "error";

export function formatSseEvent(type: SseEventType, data: unknown) {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export class SseManager {
  static initialize(res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }
  }

  static send(res: Response, type: SseEventType, data: unknown) {
    res.write(formatSseEvent(type, data));
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }
  }
}
