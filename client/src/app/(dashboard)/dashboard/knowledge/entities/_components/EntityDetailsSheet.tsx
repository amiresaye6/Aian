"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { entitiesApi } from "@/api/entities/entities.api";
import { ResolvedEntity } from "@/types/entities";
import { BrainCircuit, Database, Network, Hash, Link as LinkIcon, AlertCircle, FileText, Bot, Merge } from "lucide-react";
import { MergeEntityDialog } from "./MergeEntityDialog";

interface EntityDetailsSheetProps {
  entityId: string | null;
  onClose: () => void;
}

export function EntityDetailsSheet({ entityId, onClose }: EntityDetailsSheetProps) {
  const [entity, setEntity] = useState<ResolvedEntity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  useEffect(() => {
    if (!entityId) {
      setEntity(null);
      return;
    }

    const fetchEntity = async () => {
      setIsLoading(true);
      try {
        const data = await entitiesApi.getEntityDetails(entityId);
        setEntity(data);
      } catch (error) {
        console.error("Failed to fetch entity details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntity();
  }, [entityId]);

  return (
    <>
      <Sheet open={!!entityId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-xl glass-strong border-l border-white/5 p-0 flex flex-col gap-0 shadow-2xl">
          <SheetHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/10 to-gold-deep/10 border border-gold/20 flex items-center justify-center shadow-lg shrink-0">
                <Network className="w-6 h-6 text-gold drop-shadow-[0_0_8px_rgba(201,152,43,0.5)]" />
              </div>
              <div className="flex flex-col flex-1 gap-1 min-w-0 w-full overflow-hidden">
                <div className="flex items-start justify-between gap-4 w-full">
                  <SheetTitle className="text-xl font-display tracking-tight text-foreground break-words whitespace-normal flex-1">
                    {isLoading ? <Skeleton className="h-6 w-48" /> : entity?.canonicalName}
                  </SheetTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm bg-white/5 border-white/10">
                      {entity?.type}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground break-words whitespace-normal">
                    Entity ID: {entityId?.split("-")[0]}...
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 w-full overflow-hidden">
            <div className="p-6 space-y-8 w-full max-w-full">
              {isLoading ? (
                <div className="space-y-6 w-full">
                  <Skeleton className="h-32 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
              ) : entity ? (
                <div className="w-full space-y-8">
                  {/* Meta Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 overflow-hidden">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-teal-500 to-green-400 rounded-full"
                            style={{ width: `${Math.round(entity.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground shrink-0">{Math.round(entity.confidence * 100)}%</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 overflow-hidden">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Total Mentions</p>
                      <p className="text-xl font-medium text-foreground break-words whitespace-normal">{entity.mentions?.length || 0}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 col-span-1 sm:col-span-2 overflow-hidden">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Known Aliases</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {entity.aliases.map((alias, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-white/5 hover:bg-white/10 text-muted-foreground font-normal break-all whitespace-normal text-left">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Merge Action */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground break-words whitespace-normal line-clamp-1">Merge with another entity</p>
                        <p className="text-xs text-muted-foreground break-words whitespace-normal">
                          Combine a duplicate entity into this one, transferring all its data.
                        </p>
                      </div>
                      <Button
                        onClick={() => setIsMergeOpen(true)}
                        variant="outline"
                        size="sm"
                        className="border-gold/20 bg-gold/5 text-gold hover:bg-gold/10 shrink-0"
                      >
                        <Merge className="w-4 h-4 mr-2" />
                        Merge
                      </Button>
                    </div>
                  </div>

                  {/* Evidence Chain */}
                  <div className="space-y-4 w-full overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <LinkIcon className="w-4 h-4 text-[color:var(--gold)] shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider break-words whitespace-normal">Evidence Chain</h3>
                    </div>
                    <p className="text-xs text-muted-foreground break-words whitespace-normal">
                      This entity was extracted and resolved from the following artifacts across your organization.
                    </p>

                    <div className="space-y-3 w-full">
                      {entity.mentions?.map((mention) => (
                        <div key={mention.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group w-full overflow-hidden">
                          <div className="flex justify-between items-start mb-2 gap-4 w-full">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <Bot className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                              <span className="text-sm font-medium text-foreground break-words whitespace-normal">Extracted as "{mention.extractedName}"</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono bg-green-500/10 text-green-400 border-green-500/20 shrink-0">
                              {Math.round(mention.confidence * 100)}% Match
                            </Badge>
                          </div>
                          
                          <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/5 flex gap-3 w-full overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col justify-center min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground break-words whitespace-normal line-clamp-2">
                                {mention.artifact?.title || "Untitled Artifact"}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                                <span className="capitalize break-words whitespace-normal">{mention.artifact?.provider}</span>
                                <span className="shrink-0">•</span>
                                <span className="shrink-0">{formatDistanceToNow(new Date(mention.createdAt), { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Failed to load entity details.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Merge Dialog */}
      {entity && (
        <MergeEntityDialog
          open={isMergeOpen}
          onClose={() => setIsMergeOpen(false)}
          sourceEntity={entity}
          onMergeComplete={() => {
            onClose();
          }}
        />
      )}
    </>
  );
}
