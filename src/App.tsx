import React, { useState, useRef } from "react";
import { ShieldCheck, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useContracts, ContractData } from "@/hooks/useContracts";
import { useContractAnalysis } from "@/hooks/useRealtimeAnalysis";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardStats } from "@/components/DashboardStats";
import { ProcessingView } from "@/components/ProcessingView";
import { AnalysisResultView } from "@/components/AnalysisResultView";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);

  const { user, logout } = useAuth();
  const { contracts, loading: contractsLoading } = useContracts();
  const { analyzeContract, status, progressLog, errorMsg, latestAnalysis, reset } = useContractAnalysis();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setActiveTab("dashboard");
      setSelectedContract(null);
      analyzeContract(file);
    }
  };

  const handleContractClick = (c: ContractData) => {
    setSelectedContract(c);
    setActiveTab("analysis");
  };

  const pendingCount = contracts.filter(c => c.status === "processing").length;
  const processedCount = contracts.filter(c => c.status === "completed").length;
  const criticalCount = contracts.filter(c => c.analysis?.overallRiskScore && c.analysis.overallRiskScore > 75).length;
  const displayedAnalysis = selectedContract?.analysis || latestAnalysis;

  return (
    <div className="flex flex-col h-screen w-full bg-[#09090b] text-zinc-100 font-sans overflow-hidden border border-zinc-800">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black focus:outline-2 focus:outline-blue-500">
        Skip to main content
      </a>

      {/* Enterprise Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 flex flex-row items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg text-white" aria-hidden="true">L</div>
            <span className="text-xl font-semibold tracking-tight text-white">LEX<span className="text-blue-500 font-normal">GUARD</span></span>
          </div>
          <nav aria-label="Primary navigation" className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
            <button
              onClick={() => { setActiveTab("dashboard"); setSelectedContract(null); reset(); }}
              aria-current={activeTab === "dashboard" ? "page" : undefined}
              className={`h-16 flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${activeTab === "dashboard" ? "text-white border-b-2 border-blue-500" : "hover:text-zinc-200"}`}
            >Intelligence Dashboard</button>
            <button
              onClick={() => setActiveTab("analysis")}
              aria-current={activeTab === "analysis" ? "page" : undefined}
              className={`h-16 flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${activeTab === "analysis" ? "text-white border-b-2 border-blue-500" : "hover:text-zinc-200"}`}
            >Active Analysis</button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
            <span aria-label="Google Cloud Platform Cloud Run status: active">GCP CLOUD RUN: ACTIVE</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden sm:inline-block">{user?.email}</span>
            <button
              className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-white focus-visible:outline-2 focus-visible:outline-blue-500"
              aria-label={`Sign out ${user?.email || ""}`}
              title="Sign out"
              onClick={logout}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside aria-label="Analysis history" className="w-72 border-r border-zinc-800 bg-zinc-950/30 hidden md:flex flex-col p-4 shrink-0 overflow-y-auto custom-scrollbar">
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-4">System Overview</p>
            <div className="space-y-4">
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
                <span className="text-xs text-zinc-400">Total Analyzed</span>
                <span className="text-lg font-semibold text-white">{processedCount}</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-4 flex items-center justify-between">
            <span>Recent Analysis</span>
            {contractsLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" aria-label="Loading contracts" />}
          </p>
          <div className="space-y-2 overflow-hidden flex-1" role="list" aria-label="Analyzed contracts">
            {contracts.length === 0 && !contractsLoading && (
              <p className="text-xs text-zinc-600 text-center py-4">No documents analyzed yet.</p>
            )}
            {contracts.map(c => (
              <button
                key={c.id}
                role="listitem"
                onClick={() => handleContractClick(c)}
                aria-current={selectedContract?.id === c.id ? "true" : undefined}
                className={`w-full text-left p-3 rounded-lg cursor-pointer border transition-all focus-visible:outline-2 focus-visible:outline-blue-500 ${selectedContract?.id === c.id ? "bg-zinc-800 border-zinc-700" : "bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-zinc-800"}`}
              >
                <p className="text-sm font-medium truncate text-zinc-200">{c.originalName}</p>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    {c.status === "processing" ? <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" aria-hidden="true" /> : <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" aria-hidden="true" />}
                    {c.status.toUpperCase()}
                  </span>
                  {c.analysis && (
                    <span className={`text-[10px] font-bold ${c.analysis.overallRiskScore > 60 ? "text-red-400" : "text-emerald-400"}`}>
                      RISK {c.analysis.overallRiskScore}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg shrink-0">
            <p className="text-[10px] font-bold text-blue-400 uppercase mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" aria-hidden="true" /> Google Cloud
            </p>
            <p className="text-[11px] leading-relaxed text-blue-200/70">Powered by Gemini 2.5 Flash and fully deployed on Cloud Run Serverless.</p>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col bg-zinc-900/20 overflow-hidden relative">
          <div className="h-12 flex flex-row items-center justify-between px-6 bg-zinc-950/20 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">Workspace / </span>
              <span className="text-sm font-medium text-zinc-200">
                {activeTab === "dashboard" ? "Intelligence Hub" : selectedContract ? selectedContract.originalName : "New Analysis"}
              </span>
            </div>
            {selectedContract && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-zinc-800 bg-zinc-900 text-zinc-400">
                ID: {selectedContract.id.slice(0, 8)}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6 md:p-8">
            <ErrorBoundary>
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && status === "IDLE" && (
                  <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-5xl mx-auto space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Contract Intelligence</h1>
                        <p className="text-sm text-zinc-400">Upload a legal document (PDF, TXT) to initiate semantic multi-agent risk assessment.</p>
                      </div>
                      <div>
                        <input aria-label="Upload legal document for analysis" type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp" />
                        <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10 focus-visible:outline-2 focus-visible:outline-blue-500">
                          <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                          Analyze Document
                        </Button>
                      </div>
                    </div>

                    <DashboardStats criticalCount={criticalCount} pendingCount={pendingCount} processedCount={processedCount} />
                  </motion.div>
                )}

                {status !== "IDLE" && status !== "COMPLETED" && (
                  <ProcessingView progressLog={progressLog} errorMsg={errorMsg} reset={reset} />
                )}

                {(status === "COMPLETED" || selectedContract) && (
                  <AnalysisResultView analysis={displayedAnalysis} />
                )}
              </AnimatePresence>
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="h-8 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 shrink-0 text-[10px] text-zinc-500 font-mono">
        <div className="hidden sm:flex gap-6">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>SSE STREAMING: ACTIVE</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>FIRESTORE: CONNECTED</span>
        </div>
        <div>LEXGUARD v2.0.0-PROD</div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 20px; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
