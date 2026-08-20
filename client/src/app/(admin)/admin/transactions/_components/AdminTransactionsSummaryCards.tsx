"use client";

import { useAdminTransactionsSummary } from "@/hooks/admin/useAdminTransactions";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTransactionsSummaryCards({
  fromDate,
  toDate,
}: {
  fromDate?: string;
  toDate?: string;
}) {
  const { data: summary, isLoading, isError } = useAdminTransactionsSummary({
    fromDate,
    toDate,
  });

  if (isError) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
        Failed to load transaction summary. Please try again.
      </div>
    );
  }

  const cards = [
    {
      title: "Total Volume",
      value: summary?.data
        ? `$${(summary.data.totalVolumeCents / 100).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : "$0.00",
      subtitle: "Across all successful payments",
      icon: CreditCard,
      color: "text-gold",
      bg: "bg-gold/10",
      border: "border-gold/20",
    },
    {
      title: "Successful",
      value: summary?.data?.successfulPayments || 0,
      subtitle: "Paid transactions",
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
    },
    {
      title: "Pending",
      value: summary?.data?.pendingPayments || 0,
      subtitle: "Awaiting confirmation",
      icon: Clock,
      color: "text-blue",
      bg: "bg-blue/10",
      border: "border-blue/20",
    },
    {
      title: "Failed",
      value: summary?.data?.failedPayments || 0,
      subtitle: "Declined or error",
      icon: XCircle,
      color: "text-danger",
      bg: "bg-danger/10",
      border: "border-danger/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <Card
          key={i}
          className={`relative overflow-hidden glass-strong border ${card.border} transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
        >
          {/* Subtle gradient background */}
          <div
            className={`absolute inset-0 opacity-10 bg-gradient-to-br from-transparent to-${card.color.split("-")[1]}-500/20`}
            aria-hidden="true"
          />

          <div className="p-5 flex items-start gap-4">
            <div className={`p-3 rounded-xl ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1 mb-1 bg-white/10" />
              ) : (
                <h3 className="text-2xl font-bold text-foreground mt-1 tracking-tight">
                  {card.value}
                </h3>
              )}
              <p className="text-xs text-muted-foreground mt-1 opacity-80">
                {card.subtitle}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
