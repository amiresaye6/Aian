"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { artifactsApi } from "@/api/knowledge/artifacts.api";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, CheckCircle2, Clock, Terminal, Fingerprint } from "lucide-react";

interface Props {
  artifactId: string | null;
  onClose: () => void;
}

export function ArtifactDetailsSheet({ artifactId, onClose }: Props) {
  const [isRetrying, setIsRetrying] = useState(false);

  const { data: artifact, isLoading: isArtifactLoading, mutate } = useSWR(
    artifactId ? `/api/knowledge/artifacts/${artifactId}` : null,
    () => artifactsApi.getArtifact(artifactId!)
  );

  const { data: logs, isLoading: isLogsLoading } = useSWR(
    (artifactId && artifact?.extractionStatus === 'failed') ? `/api/knowledge/artifacts/${artifactId}/logs` : null,
    () => artifactsApi.getArtifactLogs(artifactId!)
  );

  const handleRetry = async () => {
    if (!artifactId) return;
    try {
      setIsRetrying(true);
      await artifactsApi.retryArtifact(artifactId);
      toast.success("Extraction retry dispatched successfully.");
      mutate();
    } catch (error) {
      toast.error("Failed to retry artifact.");
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
    <Sheet open={!!artifactId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full md:max-w-2xl lg:max-w-3xl glass-strong border-l border-white/10 p-0 flex flex-col h-full bg-background/60 backdrop-blur-3xl">
        {isArtifactLoading ? (
          <div className="p-6 md:p-8 space-y-4">
            <div className="h-8 w-1/3 animate-pulse-soft bg-white/5 rounded" />
            <div className="h-4 w-1/4 animate-pulse-soft bg-white/5 rounded" />
            <div className="h-32 w-full animate-pulse-soft bg-white/5 rounded mt-8" />
          </div>
        ) : artifact ? (
          <>
            <SheetHeader className="p-6 md:p-8 border-b border-white/5 bg-white/[0.01]">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(artifact.extractionStatus)}
                    <Badge variant="outline" className="bg-white/5 text-muted-foreground border-white/10 capitalize">
                      {artifact.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <SheetTitle className="text-2xl font-display text-foreground leading-tight">
                    {artifact.title || `Artifact ${artifact.id.slice(0, 8)}`}
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground flex items-center gap-2">
                    <Fingerprint className="w-3 h-3" />
                    ID: <span className="font-mono text-xs">{artifact.id}</span>
                  </SheetDescription>
                </div>
                {artifact.extractionStatus === 'failed' && (
                  <Button 
                    onClick={handleRetry} 
                    disabled={isRetrying}
                    className="bg-gold hover:bg-gold-hover text-gold-foreground font-semibold"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                    Retry Extraction
                  </Button>
                )}
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="p-6 md:p-8 space-y-8">
                
                {/* Error State */}
                {artifact.extractionStatus === 'failed' && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 md:p-5">
                    <div className="flex items-center gap-2 text-destructive font-semibold mb-3">
                      <Terminal className="w-5 h-5" />
                      Extraction Crash Log
                    </div>
                    {isLogsLoading ? (
                      <div className="h-20 w-full animate-pulse-soft bg-black/20 rounded" />
                    ) : (
                      <pre className="text-xs font-mono text-destructive/80 bg-black/20 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {typeof logs?.error === 'object' ? JSON.stringify(logs.error, null, 2) : (logs?.error || "Unknown error occurred during LLM extraction.")}
                      </pre>
                    )}
                  </div>
                )}

                {/* Extracted Data (if successful) */}
                {(artifact.extractionStatus === 'completed' || artifact.extractionStatus === 'processing') && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground">Original Content</h4>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {artifact.content || "No original content available."}
                      </div>
                    </div>

                    {artifact.extractedData && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider text-muted-foreground">AI Extracted Summary</h4>
                        <div className="bg-gold/5 border border-gold/10 rounded-xl p-5 shadow-inner">
                           <pre className="text-sm font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
                             {JSON.stringify(artifact.extractedData, null, 2)}
                           </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="p-6 md:p-8 text-center text-muted-foreground">
            Failed to load artifact details.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
