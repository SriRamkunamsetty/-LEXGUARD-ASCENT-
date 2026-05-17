type LogLevel = "INFO" | "WARN" | "ERROR";

export function logEvent(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const payload = {
    severity: level,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };

  const line = JSON.stringify(payload);
  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
}
