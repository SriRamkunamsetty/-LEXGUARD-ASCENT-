import React from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ProcessingStep } from "@/hooks/useRealtimeAnalysis";

interface ProcessingViewProps {
  progressLog: ProcessingStep[];
  errorMsg: string | null;
  reset: () => void;
}

export function ProcessingView({ progressLog, errorMsg, reset }: ProcessingViewProps) {
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-6"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin" role="status">
          <span className="sr-only">Processing document</span>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50">
          <ShieldCheck className="w-6 h-6 text-blue-500" aria-hidden="true" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-medium text-white mb-2">Orchestrating AI Agents</h3>
        <p className="text-sm text-zinc-400">Streaming evaluation metrics from Gemini backend...</p>
      </div>
      <div
        aria-live="polite"
        aria-atomic="false"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left space-y-2 mt-4 max-h-48 overflow-y-auto text-xs font-mono"
      >
        {progressLog.map((log, idx) => (
          <div key={idx} className="flex gap-3 text-zinc-300">
            <span className="text-emerald-500">[{log.step}]</span>
            <span className="opacity-80">{log.message}</span>
          </div>
        ))}
      </div>
      {errorMsg && (
        <div role="alert" className="w-full p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-sm">
          {errorMsg}
          <Button variant="outline" className="mt-2 w-full border-red-900 hover:bg-red-900/20" onClick={reset}>
            Try Again
          </Button>
        </div>
      )}
    </motion.div>
  );
}
