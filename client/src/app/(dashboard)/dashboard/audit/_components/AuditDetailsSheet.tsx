"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { AuditLogEntry } from "@/types/audit";
import { Activity, Code, ServerCrash, Clock, ShieldCheck, Key } from "lucide-react";

interface AuditDetailsSheetProps {
  log: AuditLogEntry | undefined;
  onClose: () => void;
}

export function AuditDetailsSheet({ log, onClose }: AuditDetailsSheetProps) {
  if (!log) return null;

  return (
    <Sheet open={!!log} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl border-l border-white/10 bg-background/95 backdrop-blur-xl p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${log.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <SheetTitle className="text-xl font-display">{log.skill}</SheetTitle>
              <p className="text-sm text-muted-foreground font-mono mt-1">{log.method}</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            
            {/* Metadata section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" /> Timestamp
                </div>
                <div className="text-sm font-medium text-foreground bg-white/5 px-3 py-2 rounded-md">
                  {format(new Date(log.createdAt), "PP pp")}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> Actor ID
                </div>
                <div className="text-sm font-medium text-foreground bg-white/5 px-3 py-2 rounded-md truncate" title={log.actorUserId}>
                  {log.actorUserId}
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Key className="w-3.5 h-3.5" /> Idempotency Key
                </div>
                <div className="text-sm font-mono text-muted-foreground bg-white/5 px-3 py-2 rounded-md break-all">
                  {log.idempotencyKey}
                </div>
              </div>
            </div>

            {/* Error section (if failed) */}
            {!log.success && log.error && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
                  <ServerCrash className="w-4 h-4" /> Error Details
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(log.error, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Input Payload */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Code className="w-4 h-4 text-muted-foreground" /> Input Payload
              </div>
              <div className="bg-[#0D0D0D] border border-white/10 rounded-lg p-4 overflow-x-auto relative group">
                <pre className="text-xs text-green-400/90 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(log.input, null, 2)}
                </pre>
              </div>
            </div>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
