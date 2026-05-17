import { logEvent } from "./logger";

export class ObservabilityManager {
  static logInfo(event: string, data: Record<string, unknown> = {}) {
    logEvent("INFO", event, data);
  }

  static logWarn(event: string, data: Record<string, unknown> = {}) {
    logEvent("WARN", event, data);
  }

  static logError(event: string, data: Record<string, unknown> = {}) {
    logEvent("ERROR", event, data);
  }

  static startTimer(event: string, data: Record<string, unknown> = {}) {
    const start = Date.now();
    this.logInfo(`${event}.started`, data);

    return {
      done: (outcome: "success" | "failure", extra: Record<string, unknown> = {}) => {
        this.logInfo(`${event}.finished`, {
          ...data,
          ...extra,
          outcome,
          durationMs: Date.now() - start,
        });
      },
    };
  }
}
