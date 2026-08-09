"use client";

import { pipelineApi } from "@/api/pipeline/pipeline.api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Activity, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useState } from "react";
import { PipelineStatusResponse } from "@/types/pipeline";

export function SyncTrigger({ 
  organizationId, 
  status: statusData,
  onSync 
}: { 
  organizationId: string;
  status: PipelineStatusResponse | undefined;
  onSync: () => void;
}) {
  const [isTriggering, setIsTriggering] = useState(false);

  const handleSync = async () => {
    try {
      setIsTriggering(true);
      await pipelineApi.triggerSyncNow(organizationId);
      toast.success("Manual sync triggered successfully.");
      onSync();
    } catch (error) {
      toast.error("Failed to trigger sync.");
    } finally {
      setIsTriggering(false);
    }
  };

  const status = statusData?.status || "idle";
  const overallProgress = statusData?.overallProgress || 0;
  const isRunning = isTriggering || status === "batching" || status === "processing";
  
  const canSync = status === "idle" || status === "completed" || status === "failed" || status === "partial";

  const renderStage = (label: string, stageData: any) => {
    if (!stageData) return null;
    
    let icon = <Clock className="h-3 w-3 text-muted-foreground" />;
    let badgeClass = "bg-white/5 text-muted-foreground border-white/10";
    let progressText = "";
    
    if (stageData.status === "active") {
      icon = <RefreshCw className="h-3 w-3 animate-spin text-[color:var(--gold-soft)]" />;
      badgeClass = "bg-[color:var(--gold)]/10 text-[color:var(--gold-soft)] border-[color:var(--gold)]/30";
    } else if (stageData.status === "completed") {
      icon = <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
      badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    } else if (stageData.status === "partial" || stageData.failed > 0) {
      icon = <AlertCircle className="h-3 w-3 text-amber-400" />;
      badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }

    if (stageData.total !== undefined && stageData.total > 0) {
      const completed = stageData.completed || 0;
      const failed = stageData.failed || 0;
      const pct = Math.round(((completed + failed) / stageData.total) * 100);
      progressText = ` (${completed + failed}/${stageData.total} - ${pct}%)`;
    } else if (stageData.totalArtifacts !== undefined && stageData.totalArtifacts > 0) {
      progressText = ` (${stageData.assembled || 0}/${stageData.totalArtifacts})`;
    } else if (stageData.totalItems !== undefined && stageData.totalItems > 0) {
      progressText = ` (${stageData.totalItems} items)`;
    }

    return (
      <Badge variant="outline" className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-medium tracking-wider ${badgeClass} transition-colors duration-300`}>
        {icon}
        <span>{label}{progressText}</span>
      </Badge>
    );
  };

  return (
    <Card className="glass-strong relative overflow-hidden border border-white/5 p-6 md:p-8 h-full flex flex-col justify-center">
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-[color:var(--gold)]" />
            Data Pipeline Sync
          </h2>
          <p className="mt-1 text-muted-foreground text-sm max-w-xl">
            Manually trigger the ingestion pipeline to pull the latest events from all connected integrations and assemble them into Knowledge Artifacts.
          </p>
          
          {isRunning && statusData?.stages && (
            <div className="mt-4 flex flex-wrap gap-2">
              {renderStage("Batching", statusData.stages.batching)}
              {renderStage("Assembly", statusData.stages.assembly)}
              {renderStage("Extraction", statusData.stages.extraction)}
              {renderStage("Resolution", statusData.stages.resolution)}
              {renderStage("Graph Sync", statusData.stages.graphSync)}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 min-w-[200px] md:min-w-[240px]">
          {isRunning ? (
            <div className="space-y-3 bg-white/[0.03] border border-white/5 p-4 rounded-xl">
              <div className="flex items-center justify-between text-xs font-medium text-[color:var(--gold-soft)]">
                <span className="flex items-center gap-1.5 capitalize">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {statusData?.currentStage ? statusData.currentStage.replace(/([A-Z])/g, ' $1').trim() : "Processing..."}
                </span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              {statusData?.failedCount ? (
                <div className="text-[10px] text-red-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  {statusData.failedCount} failed items
                </div>
              ) : null}
            </div>
          ) : (
            <Button 
              onClick={handleSync}
              disabled={!canSync}
              className="btn-gold btn-gold-hover ring-gold-glow w-full md:w-auto text-[15px] px-8 py-6 h-auto font-semibold"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {canSync ? "Sync Now" : "Please Wait"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
