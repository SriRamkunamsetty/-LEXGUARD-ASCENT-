import React from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import type { ContractAnalysis, ClauseResult, ScenarioSimulation } from "@/shared/contracts";

interface AnalysisResultViewProps {
  analysis: ContractAnalysis | null | undefined;
}

const CATEGORY_STYLES: Record<string, { border: string; hoverBorder: string; badge: string }> = {
  HARMFUL: {
    border: "border-red-900/40",
    hoverBorder: "hover:border-red-500/40",
    badge: "bg-red-500/5 border-red-500/20 text-red-400",
  },
  AMBIGUOUS: {
    border: "border-amber-900/40",
    hoverBorder: "hover:border-amber-500/40",
    badge: "bg-amber-500/5 border-amber-500/20 text-amber-400",
  },
  EXPLOITATIVE: {
    border: "border-purple-900/40",
    hoverBorder: "hover:border-purple-500/40",
    badge: "bg-purple-500/5 border-purple-500/20 text-purple-400",
  },
  INFO: {
    border: "border-zinc-800",
    hoverBorder: "hover:border-zinc-600",
    badge: "bg-zinc-800 border-zinc-700 text-zinc-400",
  },
  COMPLIANCE: {
    border: "border-zinc-800",
    hoverBorder: "hover:border-zinc-600",
    badge: "bg-zinc-800 border-zinc-700 text-zinc-400",
  },
};

const PROBABILITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-500/10 text-red-400",
  MEDIUM: "bg-amber-500/10 text-amber-400",
  LOW: "bg-emerald-500/10 text-emerald-400",
};

export function AnalysisResultView({ analysis }: AnalysisResultViewProps) {
  if (!analysis) return null;

  const riskLevel = analysis.overallRiskScore > 70 ? "High Risk" : analysis.overallRiskScore > 40 ? "Moderate Risk" : "Low Risk";

  return (
    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-6 h-full pb-8">
      {/* Left Column - Meta & Scenarios */}
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <Card className="bg-zinc-900/60 border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 to-red-500" aria-hidden="true"></div>
          <CardContent className="p-6">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Overall Assessment</p>
            <div className="flex gap-4 items-center">
              <div
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center
                  ${analysis.overallRiskScore > 70 ? "border-red-500/20 text-red-500" : "border-emerald-500/20 text-emerald-500"}
                `}
                role="meter"
                aria-valuenow={analysis.overallRiskScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Overall risk score: ${analysis.overallRiskScore} out of 100 — ${riskLevel}`}
              >
                <span className="text-3xl font-bold">{analysis.overallRiskScore}</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-zinc-400 mb-1">{riskLevel}</p>
                <p className="text-sm leading-relaxed text-zinc-300">{analysis.summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2 ml-1">Simulated Scenarios</h3>
        <div className="space-y-3" role="list" aria-label="Risk scenarios">
          {analysis.scenarios?.map((scen: ScenarioSimulation, i: number) => (
            <div key={i} role="listitem" className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-white">{scen.title}</h4>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${PROBABILITY_STYLES[scen.probability] || ""}`}
                >
                  {scen.probability} PROB
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">{scen.description}</p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                <AlertTriangle className="w-3 h-3 text-red-400/70" aria-hidden="true" />
                <span>Impact: {scen.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - Extracted Clauses */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-1">
          Flagged Clauses & Recommendations ({analysis.clauses?.length || 0})
        </h3>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar" role="list" aria-label="Flagged clauses">
          {analysis.clauses?.length === 0 && (
            <div className="text-center p-12 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" aria-hidden="true" />
              <p className="text-zinc-400 text-sm">No critical risk clauses detected.</p>
            </div>
          )}

          {analysis.clauses?.map((c: ClauseResult, i: number) => {
            const styles = CATEGORY_STYLES[c.category] || CATEGORY_STYLES["INFO"];
            if (!styles) return null;
            return (
              <div
                key={i}
                role="listitem"
                className={`p-5 border rounded-xl bg-zinc-900/20 backdrop-blur-sm ${styles.border} ${styles.hoverBorder} transition-all group`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-sm font-semibold text-zinc-100">{c.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${styles.badge}`}>
                    {c.category}
                  </span>
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
                      <ShieldCheck className="w-3 h-3 text-blue-400" aria-hidden="true" /> Remediation Strategy
                    </p>
                    <p className="text-xs text-blue-200/80 bg-blue-950/30 p-2.5 rounded border border-blue-900/30 leading-relaxed">
                      {c.recommendation}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Clause Risk:</span>
                    <span className={`text-[10px] font-bold ${c.riskScore > 60 ? "text-red-400" : c.riskScore > 30 ? "text-amber-400" : "text-emerald-400"}`}>
                      {c.riskScore}/100
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
