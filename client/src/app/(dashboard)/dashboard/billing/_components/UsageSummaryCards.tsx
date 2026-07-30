"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Activity, Database } from "lucide-react";

interface SummaryProps {
  summary: {
    totalCalls: number;
    totalTokens: number;
    totalCostUsd: number;
  };
  isLoading: boolean;
}

export default function UsageSummaryCards({ summary, isLoading }: SummaryProps) {
  const cards = [
    {
      title: "Total Estimated Cost",
      value: `$${summary.totalCostUsd.toFixed(4)}`,
      icon: DollarSign,
    },
    {
      title: "Total Tokens Processed",
      value: summary.totalTokens.toLocaleString(),
      icon: Database,
    },
    {
      title: "Total AI API Calls",
      value: summary.totalCalls.toLocaleString(),
      icon: Activity,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card, i) => (
        <Card
          key={i}
          className="transition-all hover:-translate-y-1 hover:shadow-md"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
