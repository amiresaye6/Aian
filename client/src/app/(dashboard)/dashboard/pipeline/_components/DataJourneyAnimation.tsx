"use client";

import { Card } from "@/components/ui/card";
import { Database, FileText, Blocks, FileJson, BrainCircuit, Network, AlertCircle } from "lucide-react";
import { PipelineStatusResponse } from "@/types/pipeline";

export function DataJourneyAnimation({ status }: { status?: PipelineStatusResponse }) {
  const currentStage = status?.currentStage;

  const isBatching = currentStage === "batching";
  const isAssembly = currentStage === "assembly";
  const isExtraction = currentStage === "extraction";
  const isGraphSync = currentStage === "graphSync" || currentStage === "resolution";

  const getFailureCount = (stageKey: "batching" | "assembly" | "extraction" | "resolution" | "graphSync") => {
    if (!status?.stages) return 0;
    const stage = status.stages[stageKey] as any;
    return stage?.failed || 0;
  };

  const getStageProgress = (stageKey: "batching" | "assembly" | "extraction" | "resolution" | "graphSync") => {
    if (!status?.stages) return null;
    const stage = status.stages[stageKey] as any;
    if (!stage) return null;

    if (stageKey === "batching" && stage.totalItems) {
      return `${stage.totalItems} items`;
    }
    if (stageKey === "assembly" && stage.totalArtifacts) {
      return `${stage.assembled || 0}/${stage.totalArtifacts}`;
    }
    if (stage.total > 0) {
      const completed = stage.completed || 0;
      const failed = stage.failed || 0;
      return `${completed + failed}/${stage.total}`;
    }
    return null;
  };

  const getArtifactCount = () => {
    if (!status?.stages?.assembly?.totalArtifacts) return "Unified Document";
    return `${status.stages.assembly.totalArtifacts} Artifacts`;
  };

  const FailureBadge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
      <div className="absolute -top-2 -right-2 bg-red-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center shadow-lg border border-red-400 z-30">
        {count}
      </div>
    );
  };

  return (
    <Card className="glass relative overflow-hidden border border-white/5 p-6 md:p-8 flex flex-col justify-center min-h-[260px]">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[color:var(--gold)]/5 to-transparent opacity-50 pointer-events-none" />

      {/* Header */}
      <div className="absolute top-6 left-8 z-20">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">AI Pipeline Architecture</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Real-time event extraction and knowledge graph assembly</p>
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto mt-8">
        
        {/* TOP ROW */}
        <div className="flex items-center justify-between w-full relative">
          
          {/* Node 1: Raw Items */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className={`w-14 h-14 rounded-2xl bg-white/[0.03] border flex items-center justify-center shadow-lg relative group transition-all duration-500 ${isBatching ? 'border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-110' : 'border-white/10'}`}>
              <FailureBadge count={getFailureCount("batching")} />
              <Database className={`w-6 h-6 transition-colors ${isBatching ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'}`} />
            </div>
            <div className="text-center">
              <span className={`text-[11px] uppercase tracking-wider font-semibold block transition-colors ${isBatching ? 'text-white' : 'text-muted-foreground'}`}>Raw Items</span>
              <span className="text-[9px] text-muted-foreground/70">{getStageProgress("batching") || "Slack, Jira, Git"}</span>
            </div>
          </div>

          {/* Path 1 -> 2 (Fast, multiple items) */}
          <div className="flex-1 h-[2px] bg-gradient-to-r from-white/10 via-white/20 to-white/10 relative mx-2">
            <div className="absolute top-1/2 left-0 w-2 h-2 -mt-1 bg-white/60 rounded-full shadow-[0_0_8px_white] animate-[aian-dash_1s_linear_infinite]" style={{ animationName: isBatching ? "data-flow" : "none", animationDelay: "0s" }} />
            <div className="absolute top-1/2 left-0 w-1.5 h-1.5 -mt-[3px] bg-white/40 rounded-full shadow-[0_0_6px_white] animate-[aian-dash_1s_linear_infinite]" style={{ animationName: isBatching ? "data-flow" : "none", animationDelay: "0.3s" }} />
            <div className="absolute top-1/2 left-0 w-1.5 h-1.5 -mt-[3px] bg-white/40 rounded-full shadow-[0_0_6px_white] animate-[aian-dash_1s_linear_infinite]" style={{ animationName: isBatching ? "data-flow" : "none", animationDelay: "0.6s" }} />
          </div>

          {/* Node 2: Assembler */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/10 to-gold-deep/10 border flex items-center justify-center shadow-lg relative group transition-all duration-500 ${isAssembly ? 'border-gold shadow-[0_0_20px_var(--gold)] scale-110' : 'border-gold/20'}`}>
              <FailureBadge count={getFailureCount("assembly")} />
              <Blocks className={`w-6 h-6 transition-colors ${isAssembly ? 'text-gold drop-shadow-[0_0_12px_var(--gold)]' : 'text-gold-soft drop-shadow-[0_0_8px_rgba(201,152,43,0.5)]'}`} />
            </div>
            <div className="text-center">
              <span className={`text-[11px] uppercase tracking-wider font-semibold block transition-colors ${isAssembly ? 'text-gold' : 'text-gold-soft'}`}>Assembler</span>
              <span className="text-[9px] text-muted-foreground/70">{getStageProgress("assembly") || "Group & Context"}</span>
            </div>
          </div>

          {/* Path 2 -> 3 (Slower, single item) */}
          <div className="flex-1 h-[2px] bg-gradient-to-r from-gold/20 via-gold/40 to-gold/20 relative mx-2">
            <div className="absolute top-1/2 left-0 w-2.5 h-2.5 -mt-[5px] bg-gold rounded-full shadow-[0_0_12px_var(--gold)]" style={{ animationName: isAssembly ? "data-flow" : "none", animationDuration: "2s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "0s" }} />
          </div>

          {/* Node 3: Artifact */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className={`w-14 h-14 rounded-2xl bg-white/[0.03] border flex items-center justify-center shadow-lg relative group transition-all duration-500 ${isAssembly || isExtraction ? 'border-white/30' : 'border-white/10'}`}>
              <FileJson className={`w-6 h-6 transition-colors ${isAssembly || isExtraction ? 'text-white' : 'text-foreground'}`} />
            </div>
            <div className="text-center">
              <span className={`text-[11px] uppercase tracking-wider font-semibold block transition-colors ${isAssembly || isExtraction ? 'text-white' : 'text-foreground'}`}>Artifact</span>
              <span className="text-[9px] text-muted-foreground/70">{getArtifactCount()}</span>
            </div>
          </div>

        </div>

        {/* VERTICAL DROP (Slower, single item, matches Path 2 rate) */}
        <div className="flex justify-end w-full pr-11 py-2">
           <div className="w-[2px] h-12 bg-gradient-to-b from-white/20 via-white/10 to-white/20 relative">
             <div className="absolute left-1/2 top-0 w-2.5 h-2.5 -ml-[5px] bg-white/80 rounded-full shadow-[0_0_12px_white]" style={{ animationName: isExtraction ? "data-drop" : "none", animationDuration: "2s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "0.5s" }} />
           </div>
        </div>

        {/* BOTTOM ROW (Flows Right to Left) */}
        <div className="flex items-center justify-end w-full relative">
          
          {/* Node 5: Graph DB */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-900/20 border flex items-center justify-center relative group transition-all duration-500 ${isGraphSync ? 'border-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.5)] scale-110' : 'border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.2)]'}`}>
              <FailureBadge count={getFailureCount("resolution") + getFailureCount("graphSync")} />
              <Network className={`w-6 h-6 transition-colors ${isGraphSync ? 'text-teal-300 drop-shadow-[0_0_12px_rgba(20,184,166,1)]' : 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.8)]'}`} />
            </div>
            <div className="text-center">
              <span className={`text-[11px] uppercase tracking-wider font-semibold block transition-colors ${isGraphSync ? 'text-teal-300' : 'text-teal-400'}`}>Graph DB</span>
              <span className="text-[9px] text-muted-foreground/70">{getStageProgress("graphSync") || "Nodes & Edges"}</span>
            </div>
          </div>

          {/* Path 4 -> 5 (Moving Right to Left! Fast, multiple extracted entities) */}
          <div className="flex-1 h-[2px] bg-gradient-to-l from-teal-500/30 via-teal-500/50 to-teal-500/30 relative mx-2">
            <div className="absolute top-1/2 right-0 w-1.5 h-1.5 -mt-[3px] bg-teal-400 rounded-full shadow-[0_0_8px_#2dd4bf]" style={{ animationName: isGraphSync || isExtraction ? "data-flow-reverse" : "none", animationDuration: "2s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "0s" }} />
            <div className="absolute top-1/2 right-0 w-1.5 h-1.5 -mt-[3px] bg-teal-300 rounded-full shadow-[0_0_8px_#2dd4bf]" style={{ animationName: isGraphSync || isExtraction ? "data-flow-reverse" : "none", animationDuration: "2s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "0.6s" }} />
            <div className="absolute top-1/2 right-0 w-1.5 h-1.5 -mt-[3px] bg-teal-500 rounded-full shadow-[0_0_8px_#2dd4bf]" style={{ animationName: isGraphSync || isExtraction ? "data-flow-reverse" : "none", animationDuration: "2s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "1.2s" }} />
          </div>

          {/* Node 4: Extractor */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border flex items-center justify-center shadow-lg relative group transition-all duration-500 ${isExtraction ? 'border-blue-400 shadow-[0_0_25px_rgba(96,165,250,0.4)] scale-110' : 'border-blue-500/20'}`}>
              <FailureBadge count={getFailureCount("extraction")} />
              <BrainCircuit className={`w-6 h-6 transition-colors ${isExtraction ? 'text-blue-300 drop-shadow-[0_0_12px_rgba(96,165,250,0.8)]' : 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]'}`} />
            </div>
            <div className="text-center">
              <span className={`text-[11px] uppercase tracking-wider font-semibold block transition-colors ${isExtraction ? 'text-blue-300' : 'text-blue-400'}`}>Extractor</span>
              <span className="text-[9px] text-muted-foreground/70">{getStageProgress("extraction") || "LLM Analysis"}</span>
            </div>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes data-flow {
          0% { left: 0%; opacity: 0; transform: scale(0.5); }
          10% { opacity: 1; transform: scale(1); }
          90% { opacity: 1; transform: scale(1); }
          100% { left: 100%; opacity: 0; transform: scale(0.5); }
        }
        @keyframes data-flow-reverse {
          0% { right: 0%; opacity: 0; transform: scale(0.5); }
          10% { opacity: 1; transform: scale(1); }
          90% { opacity: 1; transform: scale(1); }
          100% { right: 100%; opacity: 0; transform: scale(0.5); }
        }
        @keyframes data-drop {
          0% { top: 0%; opacity: 0; transform: scale(0.5); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { top: 100%; opacity: 0; transform: scale(0.5); }
        }
      `}} />
    </Card>
  );
}
