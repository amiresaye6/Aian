"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { ChevronLeft, ChevronRight, Search, Activity, CheckCircle2, XCircle } from "lucide-react";
import { AuditLogEntry, PaginatedAuditResponse } from "@/types/audit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditTableProps {
  logs?: AuditLogEntry[];
  meta?: PaginatedAuditResponse["meta"];
  isLoading: boolean;
  onSelectLog: (id: string) => void;
  selectedLogId?: string;
  selectedSkill: string;
  setSelectedSkill: (type: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  page: number;
  setPage: (page: number | ((p: number) => number)) => void;
}

export function AuditTable({ 
  logs, 
  meta = { total: 0, page: 1, totalPages: 1, limit: 10 }, 
  isLoading, 
  onSelectLog, 
  selectedLogId,
  selectedSkill,
  setSelectedSkill,
  selectedStatus,
  setSelectedStatus,
  page,
  setPage
}: AuditTableProps) {
  
  const getStatusBadge = (success: boolean) => {
    if (success) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3 h-3" /> Success
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm flex items-center gap-1 w-fit">
        <XCircle className="w-3 h-3" /> Failed
      </Badge>
    );
  };

  return (
    <Card className="glass overflow-hidden flex flex-col h-full border-white/5 bg-white/[0.01]">
      {/* Premium Toolbar */}
      <div className="p-4 md:p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Activity className="w-5 h-5 text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Audit Trail</h3>
            <p className="text-xs text-muted-foreground">Showing {meta.total} actions</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Select 
            value={selectedSkill} 
            onValueChange={(val) => {
              setSelectedSkill(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="All Skills" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Skills</SelectItem>
              <SelectItem value="KnowledgeSkill">KnowledgeSkill</SelectItem>
              <SelectItem value="EmailSkill">EmailSkill</SelectItem>
              <SelectItem value="MessagingSkill">MessagingSkill</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={selectedStatus} 
            onValueChange={(val) => {
              setSelectedStatus(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="true">Success</SelectItem>
              <SelectItem value="false">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium">Timestamp</th>
              <th className="px-6 py-4 font-medium">Skill</th>
              <th className="px-6 py-4 font-medium">Method</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-sm" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))
            ) : logs?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm">No audit logs match your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              logs?.map((log) => (
                <tr 
                  key={log.id}
                  onClick={() => onSelectLog(log.id)}
                  className={`group cursor-pointer transition-all duration-200 hover:bg-white/[0.03] ${
                    selectedLogId === log.id ? "bg-white/[0.04] relative" : ""
                  }`}
                >
                  {/* Left accent bar for selected row */}
                  {selectedLogId === log.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[color:var(--gold)] shadow-[0_0_10px_var(--gold)]" />
                  )}
                  
                  {/* Timestamp */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {format(new Date(log.createdAt), "MMM d, yyyy")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(log.createdAt), "HH:mm:ss")} ({formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })})
                      </span>
                    </div>
                  </td>
                  
                  {/* Skill */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-foreground group-hover:text-blue-400 transition-colors">
                      {log.skill}
                    </span>
                  </td>

                  {/* Method */}
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-[13px] text-muted-foreground">
                    {log.method}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(log.success)}
                  </td>

                  {/* Actor */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded">
                      {log.actorUserId?.substring(0, 8)}...
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01] mt-auto">
        <span className="text-xs text-muted-foreground">
          Page {meta.page} of {Math.max(1, meta.totalPages)}
        </span>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1}
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p: number) => Math.min(meta.totalPages, p + 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
