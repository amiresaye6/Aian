"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { entitiesApi } from "@/api/entities/entities.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth/auth.store";
import { ResolvedEntity } from "@/types/entities";
import {
  Search,
  Merge,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface MergeEntityDialogProps {
  open: boolean;
  onClose: () => void;
  /** The entity the user opened the detail sheet for — this will be the "primary" (survivor). */
  sourceEntity: ResolvedEntity;
  /** Called after a successful merge so the parent can close the sheet + refetch. */
  onMergeComplete: () => void;
}

export function MergeEntityDialog({
  open,
  onClose,
  sourceEntity,
  onMergeComplete,
}: MergeEntityDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<ResolvedEntity | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const organizationId = user?.organizationId;

  // Fetch all entities of the same type for the merge picker
  const { data: response, isLoading } = useQuery({
    queryKey: ["entities-for-merge", organizationId, sourceEntity.type],
    queryFn: () =>
      entitiesApi.getEntities(organizationId as string, sourceEntity.type, 1, 200),
    enabled: open && !!organizationId,
  });

  // Filter out the source entity and apply search
  const filteredEntities = useMemo(() => {
    if (!response?.data) return [];
    return response.data
      .filter((e) => e.id !== sourceEntity.id)
      .filter((e) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          e.canonicalName.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q))
        );
      });
  }, [response?.data, sourceEntity.id, search]);

  const handleMerge = async () => {
    if (!selectedEntity) return;
    setIsMerging(true);
    try {
      await entitiesApi.mergeEntities(sourceEntity.id, selectedEntity.id);
      toast.success("Entities merged successfully", {
        description: `"${selectedEntity.canonicalName}" has been merged into "${sourceEntity.canonicalName}".`,
      });
      // Invalidate all entity queries so the table and details refresh
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entities-for-merge"] });
      onMergeComplete();
      handleClose();
    } catch (error: any) {
      toast.error("Merge failed", {
        description: error?.response?.data?.message || error?.message || "An unexpected error occurred.",
      });
    } finally {
      setIsMerging(false);
    }
  };

  const handleClose = () => {
    setSearch("");
    setSelectedEntity(null);
    setStep("select");
    setIsMerging(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg border-white/10 bg-background/95 backdrop-blur-xl p-0 gap-0 overflow-hidden">
        {step === "select" ? (
          <>
            <DialogHeader className="p-6 pb-4 border-b border-white/5">
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Merge className="w-5 h-5 text-gold" />
                Merge Entity
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm mt-1">
                Select an entity to absorb into <span className="font-medium text-foreground">"{sourceEntity.canonicalName}"</span>.
                All mentions, aliases, and graph relationships will be transferred.
              </DialogDescription>
            </DialogHeader>

            {/* Search */}
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search entities by name or alias..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-sm"
                />
              </div>
            </div>

            {/* Entity List */}
            <ScrollArea className="max-h-[320px]">
              <div className="p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEntities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-6 h-6 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {search ? "No matching entities found." : `No other ${sourceEntity.type} entities to merge with.`}
                    </p>
                  </div>
                ) : (
                  filteredEntities.map((entity) => (
                    <button
                      key={entity.id}
                      onClick={() => setSelectedEntity(entity)}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition-all duration-150 flex items-center justify-between group ${
                        selectedEntity?.id === entity.id
                          ? "bg-gold/10 border border-gold/30"
                          : "hover:bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-medium truncate ${
                          selectedEntity?.id === entity.id ? "text-gold" : "text-foreground"
                        }`}>
                          {entity.canonicalName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">
                            {entity._count?.mentions || 0} mentions
                          </span>
                          {entity.aliases.length > 1 && (
                            <span className="text-[11px] text-muted-foreground">
                              • {entity.aliases.length - 1} aliases
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedEntity?.id === entity.id && (
                        <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-4 border-t border-white/5 bg-white/[0.01]">
              <Button variant="outline" onClick={handleClose} className="border-white/10 bg-white/5 hover:bg-white/10 text-foreground">
                Cancel
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={!selectedEntity}
                className="bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Confirmation Step */}
            <DialogHeader className="p-6 pb-4 border-b border-white/5">
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Confirm Merge
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm mt-1">
                This action cannot be undone. Please review the merge details below.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* Merge Preview */}
              <div className="flex items-center gap-4">
                {/* Secondary (will be absorbed) */}
                <div className="flex-1 p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-red-400 tracking-wider">
                    Will be removed
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {selectedEntity?.canonicalName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedEntity?._count?.mentions || selectedEntity?.mentions?.length || 0} mentions • {selectedEntity?.aliases?.length || 0} aliases
                  </p>
                </div>

                <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />

                {/* Primary (will survive) */}
                <div className="flex-1 p-4 rounded-xl bg-green-500/5 border border-green-500/20 space-y-1">
                  <p className="text-[10px] uppercase font-semibold text-green-400 tracking-wider">
                    Will survive
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {sourceEntity.canonicalName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {sourceEntity._count?.mentions || sourceEntity.mentions?.length || 0} mentions • {sourceEntity.aliases?.length || 0} aliases
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-muted-foreground space-y-2">
                <p>
                  <span className="text-foreground font-medium">"{selectedEntity?.canonicalName}"</span> will
                  be permanently deleted. All its mentions, aliases, and graph relationships will be
                  transferred to <span className="text-foreground font-medium">"{sourceEntity.canonicalName}"</span>.
                </p>
                <p>
                  Future extractions of "{selectedEntity?.canonicalName}" will automatically resolve
                  to "{sourceEntity.canonicalName}" via alias matching.
                </p>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-white/5 bg-white/[0.01]">
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                disabled={isMerging}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-foreground"
              >
                Back
              </Button>
              <Button
                onClick={handleMerge}
                disabled={isMerging}
                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Merge className="w-4 h-4 mr-2" />
                    Merge Entities
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
