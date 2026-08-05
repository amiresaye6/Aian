"use client";

import { useActiveSubscription } from "@/hooks/billing/useActiveSubscription";
import { useQuotaDashboard } from "@/hooks/billing/useQuotaDashboard";
import { useUpgradeSubscription } from "@/hooks/billing/useUpgradeSubscription";
import { useSubscriptionPlans } from "@/hooks/billing/useSubscriptionPlans";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Database, CheckCircle2, AlertCircle, Cpu } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { QuotaResult } from "@/types/billing/billing";

function QuotaProgress({ title, icon: Icon, quota, formatter = (v) => v.toString() }: { title: string, icon: any, quota?: QuotaResult, formatter?: (val: number) => string }) {
  if (!quota) return <Skeleton className="h-10 w-full" />;
  
  const isDanger = quota.percentage >= 100;
  const isWarning = quota.percentage >= 80 && !isDanger;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {formatter(quota.used)} / {quota.limit > 0 ? formatter(quota.limit) : '∞'}
        </span>
      </div>
      <div className="relative">
        <Progress 
          value={Math.min(quota.percentage, 100)} 
          className={cn("h-2 bg-white/5", 
            isDanger && "[&>div]:bg-destructive", 
            isWarning && "[&>div]:bg-warning"
          )} 
        />
        {isDanger && (
          <div className="absolute -top-6 right-0 text-xs text-destructive font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Over limit
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionTab() {
  const { data: subData, isLoading: subLoading, isError: subError } = useActiveSubscription();
  const { data: quotaData, isLoading: quotaLoading } = useQuotaDashboard();
  const { data: plansData } = useSubscriptionPlans();
  const upgradeMutation = useUpgradeSubscription();
  
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  if (subLoading || quotaLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl bg-white/5" />
        <Skeleton className="h-64 w-full rounded-xl bg-white/5" />
      </div>
    );
  }

  if (subError || !subData?.data) {
    return (
      <Card className="glass-strong border border-white/5 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[80px]" style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)", opacity: 0.2 }} />
        <CardHeader>
          <CardTitle className="text-xl">No Active Subscription</CardTitle>
          <CardDescription>You are currently on the free tier. Upgrade to unlock the full power of Aian.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsUpgradeModalOpen(true)} className="bg-gold hover:bg-gold/90 text-gold-foreground">
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sub = subData.data;
  const plan = sub.plan;
  const quota = quotaData?.data;
  const availablePlans = plansData?.data || [];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-strong border border-white/5 relative overflow-hidden flex flex-col">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[80px]" style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)", opacity: 0.15 }} />
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {plan.name} Plan <Sparkles className="w-5 h-5 text-gold-soft" />
                </CardTitle>
                <CardDescription className="mt-1">{plan.tagline}</CardDescription>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 uppercase tracking-widest text-[10px]">
                {sub.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Billing Cycle</p>
                <p className="font-medium capitalize">{sub.billingCycle}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Renewal Date</p>
                <p className="font-medium">
                  {sub.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd), "MMMM d, yyyy") : "N/A"}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Included Features</h4>
              <ul className="space-y-2">
                {plan.features.slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-gold-soft shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="pt-4 border-t border-white/5">
            <Button onClick={() => setIsUpgradeModalOpen(true)} className="w-full bg-white/5 hover:bg-white/10 text-foreground border border-white/10">
              Change Plan
            </Button>
          </CardFooter>
        </Card>

        <Card className="glass-strong border border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Plan Limits
            </CardTitle>
            <CardDescription>Your current utilization of plan resources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <QuotaProgress 
              title="AI Tokens" 
              icon={Cpu} 
              quota={quota?.tokens} 
              formatter={(v) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(v)}
            />
            <QuotaProgress 
              title="Storage Capacity" 
              icon={Database} 
              quota={quota?.storage} 
              formatter={(v) => `${v.toFixed(2)} MB`}
            />
            <QuotaProgress 
              title="Team Members" 
              icon={Users} 
              quota={quota?.members} 
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-[700px] bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Select a new plan. Any changes will be prorated on your next invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2 lg:grid-cols-2">
            {availablePlans.map((p) => {
              const isCurrent = p.id === plan.id;
              return (
                <div 
                  key={p.id} 
                  className={cn(
                    "flex flex-col p-4 rounded-xl border transition-all cursor-pointer",
                    isCurrent ? "border-gold bg-gold/5" : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                  onClick={() => {
                    if (!isCurrent) {
                      upgradeMutation.mutate(p.slug, {
                        onSuccess: () => setIsUpgradeModalOpen(false)
                      });
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{p.name}</h3>
                    {isCurrent && <Badge className="bg-gold text-gold-foreground">Current</Badge>}
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    ${(p.monthlyPriceCents / 100).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 flex-1">{p.tagline}</p>
                  
                  <div className="space-y-2 mt-auto">
                    <div className="text-xs flex justify-between">
                      <span className="text-muted-foreground">Tokens</span>
                      <span className="font-medium">{p.limits.includes("Unlimited") ? "Unlimited" : p.limits}</span>
                    </div>
                    <div className="text-xs flex justify-between">
                      <span className="text-muted-foreground">Storage</span>
                      <span className="font-medium">{p.storageLimitMb > 0 ? `${p.storageLimitMb} MB` : 'Unlimited'}</span>
                    </div>
                  </div>
                  
                  {!isCurrent && (
                    <Button 
                      className="w-full mt-4 bg-white/10 hover:bg-white/20 text-foreground" 
                      disabled={upgradeMutation.isPending}
                    >
                      {upgradeMutation.isPending ? "Updating..." : "Select Plan"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
