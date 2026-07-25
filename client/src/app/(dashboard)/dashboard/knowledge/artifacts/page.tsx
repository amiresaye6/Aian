"use client";

import { useAuthStore } from "@/store/auth/auth.store";
import { AppLayout } from "@/layouts/AppLayout";
import { KnowledgeActivityChart } from "./_components/KnowledgeActivityChart";
import { ArtifactsTable } from "./_components/ArtifactsTable";

export default function KnowledgeArtifactsPage() {
  const organizationId = useAuthStore((s) => s.user?.organizationId);

  if (!organizationId) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading organization context...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
              Knowledge Artifacts
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Monitor your AI extraction pipeline, track ingestion volume over the last 30 days, and inspect the raw knowledge graph output.
            </p>
          </div>
        </div>

        {/* 30-Day Activity Chart */}
        <KnowledgeActivityChart organizationId={organizationId} />

        {/* Master Artifacts Table */}
        <ArtifactsTable organizationId={organizationId} />
      </div>
    </AppLayout>
  );
}
