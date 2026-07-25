"use client";

import useSWR from "swr";
import { pipelineApi } from "@/api/pipeline/pipeline.api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Activity, RefreshCw } from "lucide-react";

import { useState } from "react";
export function SyncTrigger({ organizationId }: { organizationId: string }) {
  const [isTriggering, setIsTriggering] = useState(false);
  const { data: status, mutate } = useSWR(
    organizationId ? `/api/v1/sync/${organizationId}/status` : null,
    () => pipelineApi.getSyncStatus(organizationId),
    {
      refreshInterval: (data: any) => {
        const d = data?.data || data;
        const isRun = d?.isRunning === true || d?.isRunning === 'true' || d?.status === 'running';
        return isRun ? 3000 : 0;
      },
    }
  );

  const handleSync = async () => {
    try {
      setIsTriggering(true);
      await pipelineApi.triggerSyncNow(organizationId);
      toast.success("Manual sync triggered successfully.");
      mutate();
    } catch (error) {
      toast.error("Failed to trigger sync.");
    } finally {
      setIsTriggering(false);
    }
  };

  const syncData = status?.data || status;
  const isRunning = isTriggering || syncData?.isRunning === true || syncData?.isRunning === 'true' || syncData?.status === 'running';
  const progressValue = syncData?.progress || 0;
  const currentStep = isTriggering ? "Starting sync pipeline..." : (syncData?.currentStep || "Initializing...");

  return (
    <Card className="glass-strong relative overflow-hidden border border-white/5 p-6 md:p-8 h-full flex flex-col justify-center">
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-[color:var(--gold)]" />
            Data Pipeline Sync
          </h2>
          <p className="mt-1 text-muted-foreground text-sm max-w-xl">
            Manually trigger the ingestion pipeline to pull the latest events from all connected integrations and assemble them into Knowledge Artifacts.
          </p>
        </div>

        <div className="flex-shrink-0 min-w-[200px]">
          {isRunning ? (
            <div className="space-y-3 bg-white/[0.03] border border-white/5 p-4 rounded-xl">
              <div className="flex items-center justify-between text-xs font-medium text-[color:var(--gold-soft)]">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {currentStep}
                </span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          ) : (
            <Button 
              onClick={handleSync}
              className="btn-gold btn-gold-hover ring-gold-glow w-full md:w-auto text-[15px] px-8 py-6 h-auto font-semibold"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
