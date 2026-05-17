import type { ProcessingStep } from "../../../hooks/useRealtimeAnalysis";

export type AnalysisStreamEvent =
  | { type: "status"; data: ProcessingStep & { requestId?: string } }
  | { type: "error"; data: { message: string; requestId?: string } }
  | { type: "complete"; data: { data: unknown; contractId?: string; requestId?: string } };

export function parseServerSentEvents(buffer: string) {
  const chunks = buffer.split("\n\n");
  const remainder = chunks.pop() || "";
  const events: AnalysisStreamEvent[] = [];

  for (const rawEvent of chunks) {
    if (!rawEvent.startsWith("event: ")) {
      continue;
    }

    const parts = rawEvent.split("\n");
    const eventType = parts[0]?.replace("event: ", "").trim();
    const eventDataString = parts[1]?.replace("data: ", "").trim() || "{}";
    const parsed = JSON.parse(eventDataString);

    if (eventType === "status") {
      events.push({ type: "status", data: parsed });
    } else if (eventType === "error") {
      events.push({ type: "error", data: parsed });
    } else if (eventType === "complete") {
      events.push({ type: "complete", data: parsed });
    }
  }

  return {
    events,
    remainder,
  };
}

export class AnalysisClientService {
  static async analyzeContract(
    input: {
      file: File;
      idToken: string;
      signal?: AbortSignal;
    },
    handlers: {
      onStatus: (event: ProcessingStep & { requestId?: string }) => void;
      onComplete: (event: { data: unknown; contractId?: string; requestId?: string }) => void;
    },
  ) {
    const formData = new FormData();
    formData.append("document", input.file);

    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
      signal: input.signal,
      headers: {
        Authorization: `Bearer ${input.idToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported by browser.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let remainder = "";
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (!value) {
        continue;
      }

      const chunk = remainder + decoder.decode(value, { stream: true });
      const parsed = parseServerSentEvents(chunk);
      remainder = parsed.remainder;

      for (const event of parsed.events) {
        if (event.type === "status") {
          handlers.onStatus(event.data);
        } else if (event.type === "error") {
          throw new Error(event.data.message);
        } else if (event.type === "complete") {
          handlers.onComplete(event.data);
        }
      }
    }
  }
}
