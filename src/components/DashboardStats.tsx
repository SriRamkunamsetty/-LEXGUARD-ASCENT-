import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardStatsProps {
  criticalCount: number;
  pendingCount: number;
  processedCount: number;
}

export function DashboardStats({ criticalCount, pendingCount, processedCount }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-zinc-900/40 border-zinc-800 shadow-none">
        <CardContent className="pt-6">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Critical Risks Found</p>
          <div className="text-4xl font-light text-red-500" aria-label={`${criticalCount} critical risks found`}>{criticalCount}</div>
        </CardContent>
      </Card>
      <Card className="bg-zinc-900/40 border-zinc-800 shadow-none">
        <CardContent className="pt-6">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Active Processing</p>
          <div className="text-4xl font-light text-amber-500" aria-label={`${pendingCount} documents processing`}>{pendingCount}</div>
        </CardContent>
      </Card>
      <Card className="bg-zinc-900/40 border-zinc-800 shadow-none">
        <CardContent className="pt-6">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Scanned</p>
          <div className="text-4xl font-light text-blue-500" aria-label={`${processedCount} total scanned`}>{processedCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}
