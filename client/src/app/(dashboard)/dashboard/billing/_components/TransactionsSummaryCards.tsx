"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle2, XCircle, Clock } from "lucide-react";

interface SummaryProps {
  summary: {
    totalPayments: number;
    totalSuccessfulAmount: number;
    totalSuccessfulCount: number;
    totalFailedCount: number;
    totalPendingCount: number;
  };
  isLoading: boolean;
}

export default function TransactionsSummaryCards({ summary, isLoading }: SummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Spend */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Successful Payments</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-white/5" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              ${(summary.totalSuccessfulAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">
            {summary.totalSuccessfulCount} count
          </span>
        </div>
      </Card>

      {/* Failed Payments */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Failed Payments</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-white/5" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {summary.totalFailedCount.toLocaleString()}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">Failures</span>
        </div>
      </Card>

      {/* Pending Payments */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Pending Payments</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-white/5" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {summary.totalPendingCount.toLocaleString()}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">In Progress</span>
        </div>
      </Card>

      {/* Total Transactions */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Total Transactions</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-white/5" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {summary.totalPayments.toLocaleString()}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">All Statuses</span>
        </div>
      </Card>
    </div>
  );
}
