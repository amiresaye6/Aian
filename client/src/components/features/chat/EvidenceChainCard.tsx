"use client";

import { useState } from "react";
import { EvidenceNode } from "@/api/chat";
import { ChevronDown, ChevronRight, FileText, CheckCircle2, Clock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function EvidenceChainCard({ evidence }: { evidence: EvidenceNode }) {
  const [expanded, setExpanded] = useState(false);

  // Pick an icon based on provider/type
  const getProviderIcon = () => {
    switch (evidence.provider?.toLowerCase()) {
      case "slack":
        return <Globe className="h-4 w-4 text-blue-500" />;
      case "jira":
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case "github":
        return <Globe className="h-4 w-4 text-gray-800 dark:text-gray-200" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02]">
      <div
        className="flex cursor-pointer items-center justify-between p-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.05] dark:bg-white/[0.05]">
            {getProviderIcon()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-foreground">
              {evidence.title || "Untitled Conversation"}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="capitalize">{evidence.provider}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(evidence.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-2">
          <Badge variant="outline" className="text-[10px] bg-black/[0.03] dark:bg-white/[0.03]">
            Score: {Math.round(evidence.relevanceScore * 100)}%
          </Badge>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-black/[0.2] p-4 text-[13px] text-muted-foreground">
          <div className="mb-3 flex flex-wrap gap-2">
            {evidence.graphReasons?.map((reason, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px]">
                {reason}
              </Badge>
            ))}
          </div>
          <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
            {evidence.content || "No raw content available."}
          </div>
        </div>
      )}
    </div>
  );
}
