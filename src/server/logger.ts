/**
 * Structured Logger — Cloud Logging Compatible
 *
 * Outputs JSON structured logs compatible with Google Cloud Logging.
 * Maps severity to Cloud Logging severity levels and includes
 * trace context when available from Cloud Run.
 *
 * @see https://cloud.google.com/logging/docs/structured-logging
 */
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

const CLOUD_SEVERITY_MAP: Record<LogLevel, string> = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARNING",
  ERROR: "ERROR",
};

export function logEvent(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  const traceHeader = data._traceHeader as string | undefined;

  const payload: Record<string, unknown> = {
    severity: CLOUD_SEVERITY_MAP[level],
    message: event,
    event,
    timestamp: new Date().toISOString(),
    "logging.googleapis.com/labels": {
      service: "lexguard",
      environment: process.env.NODE_ENV || "development",
    },
    ...data,
  };

  // Add Cloud Trace context if available (Cloud Run injects X-Cloud-Trace-Context)
  if (traceHeader && projectId) {
    const traceId = traceHeader.split("/")[0];
    if (traceId) {
      payload["logging.googleapis.com/trace"] = `projects/${projectId}/traces/${traceId}`;
    }
    delete payload._traceHeader;
  }

  const line = JSON.stringify(payload);

  switch (level) {
    case "ERROR":
      console.error(line);
      break;
    case "WARN":
      console.warn(line);
      break;
    case "DEBUG":
      if (process.env.NODE_ENV !== "production") {
        console.debug(line);
      }
      break;
    default:
      console.log(line);
  }
}
