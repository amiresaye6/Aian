"use client";

import useSWR from "swr";
import { pipelineApi } from "@/api/pipeline/pipeline.api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

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
      <Card className="glass overflow-hidden p-1">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-1/3 animate-pulse-soft" />
          <Skeleton className="h-12 w-full animate-pulse-soft" />
          <Skeleton className="h-12 w-full animate-pulse-soft" />
          <Skeleton className="h-12 w-full animate-pulse-soft" />
        </div>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "handed_off": return "bg-success/20 text-success border-success/30";
      case "failed": return "bg-destructive/20 text-destructive border-destructive/30";
      case "pending": return "bg-blue/20 text-blue border-blue/30";
      case "locked": return "bg-gold/20 text-gold border-gold/30";
      default: return "bg-white/10 text-white/70";
    }
  };

  return (
    <Card className="glass overflow-hidden border border-white/5">
      <Table>
        <TableHeader className="bg-white/[0.02]">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider">Batch ID</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Items Count</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Trigger</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.length === 0 ? (
            <TableRow className="border-white/5">
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No ingestion batches found. Trigger a sync to start collecting data.
              </TableCell>
            </TableRow>
          ) : (
            batches.map((batch) => (
              <TableRow 
                key={batch.id} 
                className={`border-white/5 cursor-pointer transition-all hover:bg-white/[0.04] hover:-translate-y-[1px] ${selectedBatchId === batch.id ? 'bg-white/[0.06]' : ''}`}
                onClick={() => onSelectBatch(batch.id)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {batch.id.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`rounded-md text-[10px] font-semibold uppercase ${getStatusColor(batch.status)}`}>
                    {batch.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {(batch.itemCount || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {batch.triggerType ? <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-muted-foreground bg-white/[0.02] border-white/10">{batch.triggerType}</Badge> : "-"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
