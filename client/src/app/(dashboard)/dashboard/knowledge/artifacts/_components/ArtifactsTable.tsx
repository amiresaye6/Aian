"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { artifactsApi } from "@/api/knowledge/artifacts.api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Database, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { ArtifactDetailsSheet } from "./ArtifactDetailsSheet";

export function ArtifactsTable({ organizationId }: { organizationId: string }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const { data: paginatedData, isLoading, mutate } = useSWR(
    organizationId ? `/api/knowledge/artifacts?org=${organizationId}&page=${page}&status=${statusFilter || 'all'}` : null,
    () => artifactsApi.getArtifacts(organizationId, page, 20, statusFilter)
  );

  const artifacts = paginatedData?.data || [];
  const meta = paginatedData?.meta || { total: 0, page: 1, totalPages: 1, limit: 20 };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(artifacts.map((a: any) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleBulkRetry = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsRetrying(true);
      await artifactsApi.bulkRetryArtifacts({
        organizationId,
        artifactIds: Array.from(selectedIds)
      });
      toast.success(`Dispatched retry for ${selectedIds.size} artifact(s).`);
      setSelectedIds(new Set());
      mutate();
    } catch (error) {
      toast.error("Failed to retry artifacts.");
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="bg-success/20 text-success border-success/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-gold/20 text-gold-soft border-gold/30"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      default:
        return <Badge variant="outline" className="bg-white/10 text-muted-foreground border-white/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
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
            <h3 className="font-semibold text-foreground">Extracted Artifacts</h3>
            <p className="text-xs text-muted-foreground">Showing {meta.total} total artifacts</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select 
            value={statusFilter || "all"} 
            onValueChange={(val) => {
              setStatusFilter(val === "all" ? undefined : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          {selectedIds.size > 0 && (
            <Button 
              size="sm" 
              onClick={handleBulkRetry}
              disabled={isRetrying}
              className="bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              Retry ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 w-12">
                <Checkbox 
                  checked={artifacts.length > 0 && selectedIds.size === artifacts.length}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="px-6 py-4 font-medium">Provider</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Extracted At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-6 py-4">
                    <div className="h-6 w-full animate-pulse-soft bg-white/5 rounded" />
                  </td>
                </tr>
              ))
            ) : artifacts.length > 0 ? (
              artifacts.map((artifact: any) => (
                <tr 
                  key={artifact.id} 
                  className="hover:bg-white/[0.02] hover:-translate-y-[1px] transition-all cursor-pointer group"
                  onClick={() => setSelectedArtifactId(artifact.id)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.has(artifact.id)}
                      onCheckedChange={(c) => handleSelectOne(artifact.id, !!c)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-foreground capitalize tracking-wide">{artifact.provider.toLowerCase()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-muted-foreground capitalize">{artifact.type.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(artifact.extractionStatus)}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground font-mono text-xs">
                    {artifact.extractedAt ? format(new Date(artifact.extractedAt), "MMM d, HH:mm") : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  No artifacts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
        <span className="text-xs text-muted-foreground">
          Page {meta.page} of {Math.max(1, meta.totalPages)}
        </span>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page >= meta.totalPages}
            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ArtifactDetailsSheet 
        artifactId={selectedArtifactId} 
        onClose={() => {
          setSelectedArtifactId(null);
          mutate(); // Refresh the table just in case they hit retry in the sheet
        }} 
      />
    </Card>
  );
}
