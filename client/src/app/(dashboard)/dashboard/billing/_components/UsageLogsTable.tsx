"use client";

import { useState } from "react";
import { useAiUsageLogs } from "@/hooks/billing/useAiUsage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { format } from "date-fns";
import { AiUsageLog } from "@/types/billing/billing";

const AVAILABLE_MODELS = [
  "gemini",
  "student-bedrock"
];

export default function UsageLogsTable({ fromDate, toDate }: { fromDate?: string; toDate?: string }) {
  const [page, setPage] = useState(1);
  const [featureFilter, setFeatureFilter] = useState<string | undefined>(undefined);
  const [modelFilter, setModelFilter] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const limit = 10;

  const { data, isLoading, isError } = useAiUsageLogs(
    { feature: featureFilter, modelUsed: modelFilter, fromDate: fromDate || undefined, toDate: toDate || undefined },
    { page, limit },
    { sortBy, sortOrder: "desc" }
  );

  const logs = data?.data.data || [];
  const meta = data?.data.meta || { total: 0, page: 1, totalPages: 1, limit: 10 };

  return (
    <Card className="glass-strong border border-white/5 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="p-4 md:p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/10 rounded-lg">
            <Activity className="w-5 h-5 text-gold-soft" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">API Invocations</h3>
            <p className="text-xs text-muted-foreground">Showing {meta.total} total logs</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select 
            value={featureFilter || "all"} 
            onValueChange={(val) => {
              setFeatureFilter(val === "all" ? undefined : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="All Features" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Features</SelectItem>
              <SelectItem value="knowledge_extraction">Knowledge Extraction</SelectItem>
              <SelectItem value="dm_chat">Chat</SelectItem>
              <SelectItem value="retrieval">Retrieval</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={modelFilter || "all"} 
            onValueChange={(val) => {
              setModelFilter(val === "all" ? undefined : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All Models</SelectItem>
              {AVAILABLE_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={sortBy} 
            onValueChange={(val) => {
              setSortBy(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date (Newest)</SelectItem>
              <SelectItem value="totalTokens">Total Tokens</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium">Date & Time</th>
              <th className="px-6 py-4 font-medium">Feature</th>
              <th className="px-6 py-4 font-medium">Model Used</th>
              <th className="px-6 py-4 font-medium text-right">Tokens (In/Out/Total)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-6 py-4">
                    <div className="h-6 w-full animate-pulse-soft bg-white/5 rounded" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-red-500/80">
                  Failed to load usage logs.
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log: AiUsageLog) => (
                <tr 
                  key={log.id} 
                  className="hover:bg-white/[0.02] hover:-translate-y-[1px] transition-all"
                >
                  <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                    {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-foreground tracking-wide">{log.feature}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-muted-foreground text-xs">{log.modelUsed}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs">
                    {log.inputTokens} / {log.outputTokens} = <span className="font-semibold text-foreground">{log.totalTokens}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  No AI usage logs found matching your filters.
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
            disabled={page === 1 || isLoading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page >= meta.totalPages || isLoading}
            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
