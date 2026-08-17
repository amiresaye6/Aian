"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Database, ArrowRightCircle, ArrowLeftCircle } from "lucide-react";

interface SummaryProps {
  summary: {
    totalCalls: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
  };
  isLoading: boolean;
}

export default function UsageSummaryCards({ summary, isLoading }: SummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Tokens */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Total Tokens Processed</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-white/5" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {summary.totalTokens.toLocaleString()}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">Lifetime</span>
        </div>
      </Card>

      {/* Input Tokens */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <ArrowRightCircle className="w-4 h-4 text-green-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Prompt (Input) Tokens</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-white/5" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {summary.inputTokens.toLocaleString()}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">Total Prompt</span>
        </div>
      </Card>

      {/* Output Tokens */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gold/10 rounded-lg">
            <ArrowLeftCircle className="w-4 h-4 text-gold" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Completion (Output) Tokens</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-white/5" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {summary.outputTokens.toLocaleString()}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">Total Generated</span>
        </div>
      </Card>

      {/* API Calls */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Total API Invocations</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-white/5" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {summary.totalCalls.toLocaleString()}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">Invocations</span>
        </div>
      </Card>
    </div>
  );
}
