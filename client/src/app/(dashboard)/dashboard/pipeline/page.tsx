"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAuthStore } from "@/store/auth/auth.store";
import { pipelineApi } from "@/api/pipeline/pipeline.api";
import { SyncTrigger } from "./_components/SyncTrigger";
import { ProcessingSettingsForm } from "./_components/ProcessingSettings";
import { BatchesTable } from "./_components/BatchesTable";
import { BatchDetailsSheet } from "./_components/BatchDetailsSheet";
import { DataJourneyAnimation } from "./_components/DataJourneyAnimation";
import { Database } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { PipelineStatusResponse } from "@/types/pipeline";

export default function PipelinePage() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const { data: statusResponse, mutate } = useSWR<PipelineStatusResponse>(
    organizationId ? `/api/v1/sync/${organizationId}/pipeline-status` : null,
    () => pipelineApi.getPipelineStatus(organizationId!),
    {
      refreshInterval: (data: any) => {
        const status = data?.status || data?.data?.status;
        return (status === 'batching' || status === 'processing') ? 3000 : 0;
      },
    }
  );

  const status = statusResponse?.data || statusResponse;

  if (!organizationId) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading organization context...
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Database className="h-7 w-7 text-[color:var(--gold)]" />
          Data Pipeline
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage integrations, configure auto-sync policies, and monitor data ingestion batches.
        </p>
      </div>

      {/* Top Section: Trigger & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SyncTrigger 
            organizationId={organizationId} 
            status={status} 
            onSync={mutate} 
          />
          <DataJourneyAnimation status={status} />
        </div>
        <div className="lg:col-span-1">
          <ProcessingSettingsForm organizationId={organizationId} />
        </div>
      </div>

      {/* Bottom Section: Batches Table */}
      <BatchesTable 
        organizationId={organizationId} 
        selectedBatchId={selectedBatchId || undefined}
        onSelectBatch={setSelectedBatchId} 
      />

      {/* Details Sheet Overlay */}
      <BatchDetailsSheet 
        batchId={selectedBatchId} 
        onClose={() => setSelectedBatchId(null)} 
      />
    </div>
    </AppLayout>
  );
}
