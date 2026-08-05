"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auditApi } from "@/api/audit/audit.api";
import { AuditLogEntry } from "@/types/audit";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentAuditsCard() {
  const [audits, setAudits] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditApi.getAuditLogs({ limit: 5 })
      .then(res => setAudits(res.data || []))
      .catch(() => setAudits([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
          <History className="h-4 w-4" />
        </div>
        <CardTitle className="text-sm font-medium">Recent Audit Logs</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
             {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
             ))}
          </div>
        ) : audits.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No recent activity found.
          </div>
        ) : (
          <div className="space-y-4">
            {audits.map((log) => (
              <div key={log.id} className="flex items-start gap-3 border-b border-black/5 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-[10px] font-bold text-muted-foreground uppercase">
                  U
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  <div className="text-sm font-medium leading-snug">
                    <span className="text-foreground">{log.skill || 'System'}</span>{" "}
                    <span className="text-muted-foreground font-normal">{log.method}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wider">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
