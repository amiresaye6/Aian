"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth/auth.store";
import { SyncTrigger } from "./_components/SyncTrigger";
import { ProcessingSettingsForm } from "./_components/ProcessingSettings";
import { BatchesTable } from "./_components/BatchesTable";
import { BatchDetailsSheet } from "./_components/BatchDetailsSheet";
import { Database } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";

export default function PipelinePage() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SyncTrigger organizationId={organizationId} />
        </div>
        <div className="lg:col-span-1">
          <ProcessingSettingsForm organizationId={organizationId} />
        </div>
      </div>

      {/* Bottom Section: Batches Table */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Ingestion Batches</h3>
          <p className="text-sm text-muted-foreground">Historical record of all data pulls and event groupings.</p>
        </div>
        <BatchesTable 
          organizationId={organizationId} 
          selectedBatchId={selectedBatchId || undefined}
          onSelectBatch={setSelectedBatchId} 
        />
      </div>

      {/* Details Sheet Overlay */}
      <BatchDetailsSheet 
        batchId={selectedBatchId} 
        onClose={() => setSelectedBatchId(null)} 
      />
    </div>
    </AppLayout>
  );
}
