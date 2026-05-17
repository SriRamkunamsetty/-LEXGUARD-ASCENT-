import { useState } from "react";
import { auth } from "../lib/firebase";
import { AnalysisClientService } from "../src/services/client/analysis-client.service";

export type AnalysisStatus = "IDLE" | "UPLOADING" | "PROCESSING" | "COMPLETED" | "ERROR";

export interface ProcessingStep {
  step: string;
  message: string;
}

export function useContractAnalysis() {
  const [status, setStatus] = useState<AnalysisStatus>("IDLE");
  const [progressLog, setProgressLog] = useState<ProcessingStep[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<any | null>(null);
  const [latestContractId, setLatestContractId] = useState<string | null>(null);

  const analyzeContract = async (file: File) => {
    if (!auth.currentUser) {
      setErrorMsg("You must be authenticated to analyze contracts.");
      return;
    }

    try {
      setStatus("UPLOADING");
      setProgressLog([{ step: "INIT", message: "Preparing secure upload channel..." }]);
      setErrorMsg(null);
      setLatestAnalysis(null);
      setLatestContractId(null);
      setStatus("PROCESSING");

      const idToken = await auth.currentUser.getIdToken();
      await AnalysisClientService.analyzeContract(
        {
          file,
          idToken,
        },
        {
          onStatus: (event) => {
            setProgressLog((prev) => [...prev, event]);
          },
          onComplete: (event) => {
            setLatestAnalysis(event.data);
            setLatestContractId(event.contractId || null);
            setStatus("COMPLETED");
            setProgressLog((prev) => [...prev, { step: "DONE", message: "Analysis saved securely to cloud." }]);
          },
        },
      );
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
    setLatestAnalysis(null);
    setLatestContractId(null);
  };

  return { analyzeContract, status, progressLog, errorMsg, latestAnalysis, latestContractId, reset };
}
