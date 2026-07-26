"use client";

import useSWR from "swr";
import { pipelineApi } from "@/api/pipeline/pipeline.api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Database, Clock, Hash, Package } from "lucide-react";
import { format } from "date-fns";

interface BatchDetailsSheetProps {
  batchId: string | null;
  onClose: () => void;
}

export function BatchDetailsSheet({ batchId, onClose }: BatchDetailsSheetProps) {
  const { data: batchData, isLoading: isBatchLoading } = useSWR(
    batchId ? `/api/v1/batches/${batchId}` : null,
    () => pipelineApi.getBatchDetails(batchId!)
  );
  const batch = batchData?.data || batchData;

  const { data: itemsData, isLoading: isItemsLoading } = useSWR(
    batchId ? `/api/v1/batches/${batchId}/items` : null,
    () => pipelineApi.getBatchItems(batchId!)
  );

  const itemsRaw = itemsData?.data || itemsData;
  const items = Array.isArray(itemsRaw) ? itemsRaw : (itemsRaw?.data || []);

  return (
    <Sheet open={!!batchId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl glass-strong border-l border-white/10 p-0 flex flex-col h-full">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-[color:var(--gold)] mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Batch Inspector</span>
          </div>
          <SheetTitle className="text-xl font-display font-semibold tracking-tight">
            {batchId ? `Batch: ${batchId.slice(0, 12)}...` : "Loading..."}
          </SheetTitle>
          <SheetDescription>
            Inspect the raw payloads ingested from external providers before LLM processing.
          </SheetDescription>

          {isBatchLoading ? (
            <div className="flex gap-4 mt-4">
              <Skeleton className="h-16 w-32 animate-pulse-soft rounded-xl" />
              <Skeleton className="h-16 w-32 animate-pulse-soft rounded-xl" />
              <Skeleton className="h-16 w-32 animate-pulse-soft rounded-xl" />
            </div>
          ) : batch ? (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5 mb-1">
                  <Hash className="h-3 w-3" /> Items
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {(batch.itemCount || batch.itemsCount || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5 mb-1">
                  <Database className="h-3 w-3" /> Status
                </div>
                <Badge variant="outline" className="text-[10px] mt-0.5 border-white/20">
                  {batch.status}
                </Badge>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5 mb-1">
                  <Clock className="h-3 w-3" /> Created
                </div>
                <div className="text-sm font-medium text-foreground truncate mt-0.5">
                  {format(new Date(batch.createdAt), "MMM d, HH:mm:ss")}
                </div>
              </div>
            </div>
          ) : null}
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Raw Ingestion Payloads</h3>
            
            {isItemsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full animate-pulse-soft rounded-xl" />
                <Skeleton className="h-32 w-full animate-pulse-soft rounded-xl" />
                <Skeleton className="h-32 w-full animate-pulse-soft rounded-xl" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground bg-white/[0.02] rounded-xl border border-white/5">
                No items found in this batch.
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden transition-all hover:border-white/10">
                  <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-white/10 hover:bg-white/10 text-[10px]">
                        {item.sourceProvider}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {item.sourceType} • {item.sourceId}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {item.occurredAt || item.createdAt ? format(new Date(item.occurredAt || item.createdAt), "MMM d, HH:mm") : ""}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="mb-3 text-sm">
                      <span className="font-semibold text-foreground mr-2">{item.author?.externalId || item.authorName || "System"}</span>
                      <span className="text-muted-foreground line-clamp-3 leading-relaxed mt-1">{item.content}</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-2">Raw JSON Payload</p>
                      <pre className="text-[11px] font-mono text-foreground/70 bg-black/40 p-3 rounded-lg overflow-x-auto border border-black/50">
                        {JSON.stringify(item.rawPayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
