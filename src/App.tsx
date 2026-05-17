import React, { useState, useRef } from "react";
import { ShieldCheck, FileText, Settings, Upload, FileUp, Loader2, LogOut, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useContracts, ContractData } from "@/hooks/useContracts";
import { useContractAnalysis } from "@/hooks/useRealtimeAnalysis";

import { ErrorBoundary } from "@/components/ErrorBoundary";

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
  const criticalCount = contracts.filter(c => c.analysis?.overallRiskScore > 75).length;
  const displayedAnalysis = selectedContract?.analysis || latestAnalysis;

  return (
    <div className="flex flex-col h-screen w-full bg-[#09090b] text-zinc-100 font-sans overflow-hidden border border-zinc-800">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Skip to main content
      </a>
      {/* Global Enterprise Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 flex flex-row items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg text-white">L</div>
            <span className="text-xl font-semibold tracking-tight text-white">LEX<span className="text-blue-500 font-normal">GUARD</span></span>
          </div>
          <nav aria-label="Primary navigation" className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
            <button 
              onClick={() => { setActiveTab("dashboard"); setSelectedContract(null); reset(); }} 
              aria-pressed={activeTab === "dashboard"}
              className={`h-16 flex items-center transition-colors ${activeTab === "dashboard" ? "text-white border-b-2 border-blue-500" : "hover:text-zinc-200"}`}
            >Intelligence Dashboard</button>
            <button 
              onClick={() => setActiveTab("analysis")} 
              aria-pressed={activeTab === "analysis"}
              className={`h-16 flex items-center transition-colors ${activeTab === "analysis" ? "text-white border-b-2 border-blue-500" : "hover:text-zinc-200"}`}
            >Active Analysis</button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            GCP CLOUD RUN: ACTIVE
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden sm:inline-block">{user?.email}</span>
            <button className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-white" aria-label="Sign out" title="Sign out" onClick={logout}>
              {user?.email?.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex flex-1 overflow-hidden">
        {/* Side Navigation / Secondary Context */}
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
            {contractsLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
          </p>
          <div className="space-y-2 overflow-hidden flex-1">
            {contracts.length === 0 && !contractsLoading && (
              <p className="text-xs text-zinc-600 text-center py-4">No documents analyzed yet.</p>
            )}
            {contracts.map(c => (
              <button
                key={c.id} 
                onClick={() => handleContractClick(c)}
                className={`w-full text-left p-3 rounded-lg cursor-pointer border transition-all ${selectedContract?.id === c.id ? "bg-zinc-800 border-zinc-700" : "bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-zinc-800"}`}
              >
                <p className="text-sm font-medium truncate text-zinc-200">{c.originalName}</p>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    {c.status === "processing" ? <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" /> : <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />}
                    {c.status.toUpperCase()}
                  </span>
                  {c.analysis && <span className={`text-[10px] font-bold ${c.analysis.overallRiskScore > 60 ? 'text-red-400' : 'text-emerald-400'}`}>RISK {c.analysis.overallRiskScore}</span>}
                </div>
              </button>
            ))}
          </div>
    
          <div className="mt-8 p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg shrink-0">
            <p className="text-[10px] font-bold text-blue-400 uppercase mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Google Cloud</p>
            <p className="text-[11px] leading-relaxed text-blue-200/70">Powered by Gemini 2.5 Pro and fully deployed on Cloud Run Serverless.</p>
          </div>
        </aside>

        {/* Main Intelligence Workspace */}
        <div className="flex-1 flex flex-col bg-zinc-900/20 overflow-hidden relative">
          <div className="h-12 flex flex-row items-center justify-between px-6 bg-zinc-950/20 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">Workspace / </span>
              <span className="text-sm font-medium text-zinc-200">
                {activeTab === "dashboard" ? "Intelligence Hub" : selectedContract ? selectedContract.originalName : "New Analysis"}
              </span>
            </div>
            {selectedContract && <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-zinc-800 bg-zinc-900 text-zinc-400">ID: {selectedContract.id.slice(0, 8)}</span>}
          </div>

          <div className="flex-1 overflow-auto p-6 md:p-8">
            <ErrorBoundary>
            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && status === "IDLE" && (
                <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-5xl mx-auto space-y-8">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Contract Intelligence</h2>
                      <p className="text-sm text-zinc-400">Upload a legal document (PDF, TXT) to initiate semantic multi-agent risk assessment.</p>
                    </div>
                    <div>
                      <input aria-label="Upload legal document" type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp" />
                      <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10">
                        <Upload className="h-4 w-4 mr-2" />
                        Analyze Document
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-zinc-900/40 border-zinc-800 shadow-none">
                      <CardContent className="pt-6">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Critical Risks Found</p>
                        <div className="text-4xl font-light text-red-500">{criticalCount}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/40 border-zinc-800 shadow-none">
                      <CardContent className="pt-6">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Active Processing</p>
                        <div className="text-4xl font-light text-amber-500">{pendingCount}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/40 border-zinc-800 shadow-none">
                      <CardContent className="pt-6">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Scanned</p>
                        <div className="text-4xl font-light text-blue-500">{processedCount}</div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* Active Processing State */}
              {status !== "IDLE" && status !== "COMPLETED" && (
                <motion.div key="processing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-6">
                   <div className="relative">
                     <div className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50"><ShieldCheck className="w-6 h-6 text-blue-500" /></div>
                   </div>
                   <div>
                     <h3 className="text-lg font-medium text-white mb-2">Orchestrating AI Agents</h3>
                     <p className="text-sm text-zinc-400">Streaming evaluation metrics from Gemini backend...</p>
                   </div>
                   <div aria-live="polite" aria-atomic="false" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left space-y-2 mt-4 max-h-48 overflow-y-auto text-xs font-mono">
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
                        <Button variant="outline" className="mt-2 w-full border-red-900 hover:bg-red-900/20" onClick={reset}>Try Again</Button>
                      </div>
                   )}
                </motion.div>
              )}

              {/* Results View (Either newly finished or selected from sidebar) */}
              {(status === "COMPLETED" || selectedContract) && (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-6 h-full pb-8">
                  {/* Left Column - Meta & Scenarios */}
                  <div className="w-full md:w-1/3 flex flex-col gap-6">
                    <Card className="bg-zinc-900/60 border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                      <div className="h-1 w-full bg-gradient-to-r from-blue-600 to-red-500"></div>
                      <CardContent className="p-6">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Overall Assessment</p>
                        <div className="flex gap-4 items-center">
                          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center
                            ${(displayedAnalysis?.overallRiskScore || 0) > 70 ? 'border-red-500/20 text-red-500' : 'border-emerald-500/20 text-emerald-500'}
                          `}>
                            <span className="text-3xl font-bold">{displayedAnalysis?.overallRiskScore || 0}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed text-zinc-300">
                              {displayedAnalysis?.summary || "No summary available."}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2 ml-1">Simulated Scenarios</h3>
                    <div className="space-y-3">
                      {displayedAnalysis?.scenarios?.map((scen: any, i: number) => (
                        <div key={i} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                             <h4 className="text-sm font-medium text-white">{scen.title}</h4>
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                                ${scen.probability === 'HIGH' ? 'bg-red-500/10 text-red-400' : 
                                  scen.probability === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}
                             `}>
                               {scen.probability} PROB
                             </span>
                           </div>
                           <p className="text-xs text-zinc-400 leading-relaxed mb-3">{scen.description}</p>
                           <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                             <AlertTriangle className="w-3 h-3 text-red-400/70" /> Impact: {scen.impact}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column - Extracted Clauses */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-1">Flagged Clauses & Recommendations</h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                      {displayedAnalysis?.clauses?.length === 0 && (
                        <div className="text-center p-12 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
                          <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
                          <p className="text-zinc-400 text-sm">No critical risk clauses detected.</p>
                        </div>
                      )}
                      
                      {displayedAnalysis?.clauses?.map((c: any, i: number) => (
                        <div key={i} className={`p-5 border rounded-xl bg-zinc-900/20 backdrop-blur-sm
                          ${c.category === 'HARMFUL' ? 'border-red-900/40 hover:border-red-500/40' :
                            c.category === 'AMBIGUOUS' ? 'border-amber-900/40 hover:border-amber-500/40' :
                            c.category === 'EXPLOITATIVE' ? 'border-purple-900/40 hover:border-purple-500/40' :
                            'border-zinc-800 hover:border-zinc-600'} transition-all group`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-sm font-semibold text-zinc-100">{c.title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider
                              ${c.category === 'HARMFUL' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                                c.category === 'AMBIGUOUS' ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' :
                                'bg-zinc-800 border-zinc-700 text-zinc-400'}
                            `}>{c.category}</span>
                          </div>
                          
                          <div className="mb-4 p-3 bg-[#000000] rounded-lg border border-zinc-800">
                            <p className="text-xs font-serif text-zinc-400 leading-relaxed italic">"...{c.excerpt}..."</p>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">AI Reasoning</p>
                              <p className="text-xs text-zinc-300 leading-relaxed">{c.explanation}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1.5">
                                <ShieldCheck className="w-3 h-3 text-blue-400" /> Remediation Strategy
                              </p>
                              <p className="text-xs text-blue-200/80 bg-blue-950/30 p-2.5 rounded border border-blue-900/30 leading-relaxed">
                                {c.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Infrastructure Status Bar */}
      <footer className="h-8 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 shrink-0 text-[10px] text-zinc-500 font-mono">
        <div className="flex gap-6 hidden sm:flex">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>SSE STREAMING: ACTIVE</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>FIRESTORE: CONNECTED</span>
        </div>
        <div>
          LEXGUARD v2.0.0-PROD • LATENCY: 24ms
        </div>
      </footer>
      
      {/* Global CSS for scrollbar to fit the dark theme nicely */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
