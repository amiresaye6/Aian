"use client";

import { Card } from "@/components/ui/card";
import { Database, FileText, Blocks, FileJson, BrainCircuit, Network, ArrowRight, ArrowDown } from "lucide-react";

export function DataJourneyAnimation() {
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
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-lg relative group">
              <Database className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block">Raw Items</span>
              <span className="text-[9px] text-muted-foreground/70">Slack, Jira, Git</span>
            </div>
          </div>

          {/* Path 1 -> 2 (Fast, multiple items) */}
          <div className="flex-1 h-[2px] bg-gradient-to-r from-white/10 via-white/20 to-white/10 relative mx-2">
            <div className="absolute top-1/2 left-0 w-2 h-2 -mt-1 bg-white/60 rounded-full shadow-[0_0_8px_white] animate-[aian-dash_1s_linear_infinite]" style={{ animationName: "data-flow", animationDelay: "0s" }} />
            <div className="absolute top-1/2 left-0 w-1.5 h-1.5 -mt-[3px] bg-white/40 rounded-full shadow-[0_0_6px_white] animate-[aian-dash_1s_linear_infinite]" style={{ animationName: "data-flow", animationDelay: "0.3s" }} />
            <div className="absolute top-1/2 left-0 w-1.5 h-1.5 -mt-[3px] bg-white/40 rounded-full shadow-[0_0_6px_white] animate-[aian-dash_1s_linear_infinite]" style={{ animationName: "data-flow", animationDelay: "0.6s" }} />
          </div>

          {/* Node 2: Assembler */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/10 to-gold-deep/10 border border-gold/20 flex items-center justify-center shadow-lg relative group">
              <Blocks className="w-6 h-6 text-gold-soft drop-shadow-[0_0_8px_rgba(201,152,43,0.5)]" />
            </div>
            <div className="text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-gold-soft block">Assembler</span>
              <span className="text-[9px] text-muted-foreground/70">Group & Context</span>
            </div>
          </div>

          {/* Path 2 -> 3 (Slower, single item) */}
          <div className="flex-1 h-[2px] bg-gradient-to-r from-gold/20 via-gold/40 to-gold/20 relative mx-2">
            <div className="absolute top-1/2 left-0 w-2.5 h-2.5 -mt-[5px] bg-gold rounded-full shadow-[0_0_12px_var(--gold)] animate-[aian-dash_3s_linear_infinite]" style={{ animationDelay: "0s", animationName: "data-flow" }} />
          </div>

          {/* Node 3: Artifact */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-lg relative group">
              <FileJson className="w-6 h-6 text-foreground" />
            </div>
            <div className="text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-foreground block">Artifact</span>
              <span className="text-[9px] text-muted-foreground/70">Unified Document</span>
            </div>
          </div>

        </div>

        {/* VERTICAL DROP (Slower, single item, matches Path 2 rate) */}
        <div className="flex justify-end w-full pr-11 py-2">
           <div className="w-[2px] h-12 bg-gradient-to-b from-white/20 via-white/10 to-white/20 relative">
             <div className="absolute left-1/2 top-0 w-2.5 h-2.5 -ml-[5px] bg-white/80 rounded-full shadow-[0_0_12px_white]" style={{ animationName: "data-drop", animationDuration: "1.5s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "0.5s" }} />
           </div>
        </div>

        {/* BOTTOM ROW (Flows Right to Left) */}
        <div className="flex items-center justify-end w-full relative">
          
          {/* Node 5: Graph DB */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-900/20 border border-teal-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.2)] relative group">
              <Network className="w-6 h-6 text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
            </div>
            <div className="text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-teal-400 block">Graph DB</span>
              <span className="text-[9px] text-muted-foreground/70">Nodes & Edges</span>
            </div>
          </div>

          {/* Path 4 -> 5 (Moving Right to Left! Fast, multiple extracted entities) */}
          <div className="flex-1 h-[2px] bg-gradient-to-l from-teal-500/30 via-teal-500/50 to-teal-500/30 relative mx-2">
            <div className="absolute top-1/2 right-0 w-1.5 h-1.5 -mt-[3px] bg-teal-400 rounded-full shadow-[0_0_8px_#2dd4bf]" style={{ animationName: "data-flow-reverse", animationDuration: "1.2s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "0s" }} />
            <div className="absolute top-1/2 right-0 w-1.5 h-1.5 -mt-[3px] bg-teal-300 rounded-full shadow-[0_0_8px_#2dd4bf]" style={{ animationName: "data-flow-reverse", animationDuration: "1.2s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "0.4s" }} />
            <div className="absolute top-1/2 right-0 w-1.5 h-1.5 -mt-[3px] bg-teal-500 rounded-full shadow-[0_0_8px_#2dd4bf]" style={{ animationName: "data-flow-reverse", animationDuration: "1.2s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "0.8s" }} />
          </div>

          {/* Node 4: Extractor */}
          <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center shadow-lg relative group">
              <BrainCircuit className="w-6 h-6 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
            </div>
            <div className="text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-400 block">Extractor</span>
              <span className="text-[9px] text-muted-foreground/70">LLM Analysis</span>
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
