"use client";

import useSWR from "swr";
import { pipelineApi } from "@/api/pipeline/pipeline.api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

import { Database } from "lucide-react";

interface BatchesTableProps {
  organizationId: string;
  onSelectBatch: (batchId: string) => void;
  selectedBatchId?: string;
}

export function BatchesTable({ organizationId, onSelectBatch, selectedBatchId }: BatchesTableProps) {
  const { data, isLoading } = useSWR(
    organizationId ? `/api/v1/batches?organizationId=${organizationId}` : null,
    () => pipelineApi.getBatches(organizationId)
  );

  const batches = Array.isArray(data) ? data : (data?.data || []);

  if (isLoading) {
    return (
      <Card className="glass-strong border border-white/5 overflow-hidden flex flex-col p-1">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-1/3 animate-pulse-soft bg-white/5" />
          <Skeleton className="h-12 w-full animate-pulse-soft bg-white/5" />
          <Skeleton className="h-12 w-full animate-pulse-soft bg-white/5" />
        </div>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "handed_off": return "bg-success/20 text-success border-success/30";
      case "failed": return "bg-destructive/20 text-destructive border-destructive/30";
      case "pending": return "bg-white/10 text-muted-foreground border-white/20";
      case "locked": return "bg-gold/20 text-gold-soft border-gold/30";
      default: return "bg-white/10 text-muted-foreground border-white/20";
    }
  };

  return (
    <Card className="glass-strong border border-white/5 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="p-4 md:p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/10 rounded-lg">
            <Database className="w-5 h-5 text-gold-soft" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ingestion Batches</h3>
            <p className="text-xs text-muted-foreground">Historical record of all data pulls and event groupings.</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium">Batch ID</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Items Count</th>
              <th className="px-6 py-4 font-medium text-right">Trigger</th>
              <th className="px-6 py-4 font-medium text-right">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
          {batches.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                No ingestion batches found. Trigger a sync to start collecting data.
              </td>
            </tr>
          ) : (
            batches.map((batch: any) => (
              <tr 
                key={batch.id} 
                className={`hover:bg-white/[0.02] hover:-translate-y-[1px] transition-all cursor-pointer group ${selectedBatchId === batch.id ? 'bg-white/[0.04]' : ''}`}
                onClick={() => onSelectBatch(batch.id)}
              >
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                  {batch.id.slice(0, 8)}...
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className={`rounded-md text-[10px] font-semibold uppercase ${getStatusColor(batch.status)}`}>
                    {batch.status.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  {(batch.itemCount || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-muted-foreground text-sm">
                  {batch.triggerType ? <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-muted-foreground bg-white/[0.02] border-white/10">{batch.triggerType}</Badge> : "-"}
                </td>
                <td className="px-6 py-4 text-right text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })}
                </td>
              </tr>
            ))
          )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
