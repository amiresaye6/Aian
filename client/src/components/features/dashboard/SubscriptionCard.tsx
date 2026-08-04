"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Cpu, Database, Users, AlertCircle } from "lucide-react";
import { DashboardSubscription } from "@/types/dashboard";
import { useAiUsageSummary } from "@/hooks/billing/useAiUsage";
import { useActiveSubscription } from "@/hooks/billing/useActiveSubscription";
import { useQuotaDashboard } from "@/hooks/billing/useQuotaDashboard";
import { QuotaResult } from "@/types/billing/billing";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  past_due: "destructive",
  canceled: "secondary",
};

function MiniQuotaProgress({ title, icon: Icon, quota, formatter = (v) => v.toString() }: { title: string, icon: any, quota?: QuotaResult, formatter?: (val: number) => string }) {
  if (!quota) return <Skeleton className="h-8 w-full" />;
  
  const isDanger = quota.percentage >= 100;
  const isWarning = quota.percentage >= 80 && !isDanger;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        </div>
        <span className="text-[11px] font-mono font-medium flex items-center gap-1">
          {isDanger && <AlertCircle className="w-3 h-3 text-destructive" />}
          {formatter(quota.used)} <span className="text-muted-foreground/50">/</span> {quota.limit > 0 ? formatter(quota.limit) : '∞'}
        </span>
      </div>
      <Progress 
        value={Math.min(quota.percentage, 100)} 
        className={cn("h-1.5 bg-black/5 dark:bg-white/5", 
          isDanger && "[&>div]:bg-destructive", 
          isWarning && "[&>div]:bg-warning",
          !isDanger && !isWarning && "[&>div]:bg-gold"
        )} 
      />
    </div>
  );
}

export function SubscriptionCard({ subscription }: { subscription: DashboardSubscription | null }) {
  const { data: usageData, isLoading: usageLoading } = useAiUsageSummary();
  const { data: subData, isLoading: subLoading } = useActiveSubscription();
  const { data: quotaData, isLoading: quotaLoading } = useQuotaDashboard();

  if (!subscription) return null;

  const planName = subData?.data?.plan?.name || "Loading Plan...";
  const quota = quotaData?.data;
  
  const totalCost = usageData?.data?.grandTotal?.totalCostUsd ?? 0;
  const totalCalls = usageData?.data?.grandTotal?.totalCalls ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
           <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
            <CreditCard className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-medium">Subscription & Usage</CardTitle>
        </div>
        <Badge variant={STATUS_VARIANT[subscription.status] ?? "secondary"}>
          {subscription.status}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-6 flex-1 flex flex-col">
        {/* Cost & Plan Info */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Current Plan</div>
            {subLoading ? <Skeleton className="h-5 w-24 mb-1" /> : (
              <div className="text-sm font-bold text-foreground">
                {planName}
              </div>
            )}
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {subscription.billingCycle} • Renews {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          
          <div className="text-right">
             <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">AI Usage Cost</div>
             {usageLoading ? (
               <Skeleton className="h-7 w-16 ml-auto" />
             ) : (
               <>
                 <div className="text-lg font-display font-bold tracking-tight text-foreground flex items-center justify-end gap-1">
                   ${totalCost.toFixed(4)}
                 </div>
                 <div className="text-[10px] text-muted-foreground mt-0.5">
                   {totalCalls.toLocaleString()} API Calls
                 </div>
               </>
             )}
          </div>
        </div>

        {/* Quota Progress */}
        <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
          <MiniQuotaProgress 
            title="AI Tokens" 
            icon={Cpu} 
            quota={quota?.tokens} 
            formatter={(v) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(v)}
          />
          <MiniQuotaProgress 
            title="Storage" 
            icon={Database} 
            quota={quota?.storage} 
            formatter={(v) => `${v.toFixed(1)} MB`}
          />
          <MiniQuotaProgress 
            title="Members" 
            icon={Users} 
            quota={quota?.members} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
