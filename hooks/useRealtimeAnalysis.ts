import { useState } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export type AnalysisStatus = "IDLE" | "UPLOADING" | "PROCESSING" | "COMPLETED" | "ERROR";

export interface ProcessingStep {
  step: string;
  message: string;
}

export function useContractAnalysis() {
  const [status, setStatus] = useState<AnalysisStatus>("IDLE");
  const [progressLog, setProgressLog] = useState<ProcessingStep[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const analyzeContract = async (file: File) => {
    if (!auth.currentUser) {
      setErrorMsg("You must be authenticated to analyze contracts.");
      return;
    }

    try {
      setStatus("UPLOADING");
      setProgressLog([{ step: "INIT", message: "Preparing secure upload channel..." }]);

      // 1. Create a placeholder document in Firestore
      const docRef = await addDoc(collection(db, "contracts"), {
        userId: auth.currentUser.uid,
        originalName: file.name,
        uploadDate: serverTimestamp(),
        status: "processing",
        fileSize: file.size,
      });

      setStatus("PROCESSING");

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append("document", file);

      // 3. Initiate SSE connection via fetch (using manual reader)
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        // Optional headers can be set here if needed
      });

      if (!response.body) {
        throw new Error("ReadableStream not supported by browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const events = chunk.split("\n\n").filter(Boolean);

          for (const ev of events) {
            if (ev.startsWith("event: ")) {
              const parts = ev.split("\n");
              const eventType = parts[0].replace("event: ", "").trim();
              const eventDataString = parts[1] ? parts[1].replace("data: ", "").trim() : "{}";
              
              if (!eventDataString) continue;
              const eventData = JSON.parse(eventDataString);

              if (eventType === "status") {
                setProgressLog((prev) => [...prev, eventData]);
              } else if (eventType === "error") {
                throw new Error(eventData.message);
              } else if (eventType === "complete") {
                // Final result received! Update Firestore to mark as done.
                await updateDoc(docRef, {
                  status: "completed",
                  analysis: eventData.data,
                  completedAt: serverTimestamp(),
                });
                setStatus("COMPLETED");
                setProgressLog((prev) => [...prev, { step: "DONE", message: "Analysis saved to securely to cloud." }]);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      setErrorMsg(err.message || "An unknown error occurred during analysis.");
    }
  };

  const reset = () => {
    setStatus("IDLE");
    setProgressLog([]);
    setErrorMsg(null);
  };

  return { analyzeContract, status, progressLog, errorMsg, reset };
}
