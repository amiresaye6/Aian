"use client";

import { useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { useAuthStore } from "@/store/auth/auth.store";
import { useQuery } from "@tanstack/react-query";
import { entitiesApi } from "@/api/entities/entities.api";
import { EntitiesTable } from "./_components/EntitiesTable";
import { EntityDetailsSheet } from "./_components/EntityDetailsSheet";

export default function EntitiesPage() {
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const user = useAuthStore((s) => s.user);
  const organizationId = user?.organizationId;

  const { data: response, isLoading } = useQuery({
    queryKey: ["entities", organizationId, selectedType, page],
    queryFn: () => entitiesApi.getEntities(organizationId as string, selectedType, page, 10),
    enabled: !!organizationId,
  });

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
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
              Resolved Entities
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Monitor your AI extraction pipeline, track ingestion volume over the last 30 days, and inspect the raw knowledge graph output.
            </p>
          </div>
        </div>

        {/* Main Table */}
        <div className="flex-1 min-h-[500px]">
          <EntitiesTable
            entities={response?.data}
            meta={response?.meta}
            isLoading={isLoading}
            onSelectEntity={setSelectedEntityId}
            selectedEntityId={selectedEntityId || undefined}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            page={page}
            setPage={setPage}
          />
        </div>

        {/* Details Sheet */}
        <EntityDetailsSheet 
          entityId={selectedEntityId}
          onClose={() => setSelectedEntityId(null)}
        />
        
      </div>
    </AppLayout>
  );
}
