"use client";

import { useActiveSubscription } from "@/hooks/billing/useActiveSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Users, Database, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function SubscriptionTab() {
  const { data, isLoading, isError } = useActiveSubscription();

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl bg-white/5" />
        <Skeleton className="h-64 w-full rounded-xl bg-white/5" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <Card className="glass-strong border border-white/5 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[80px]" style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)", opacity: 0.2 }} />
        <CardHeader>
          <CardTitle className="text-xl">No Active Subscription</CardTitle>
          <CardDescription>You are currently on the free tier. Upgrade to unlock the full power of Aian.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add a placeholder button for future upgrade flow */}
        </CardContent>
      </Card>
    );
  }

  const sub = data.data;
  const plan = sub.plan;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="glass-strong border border-white/5 relative overflow-hidden">
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
        <CardContent className="space-y-6">
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
      </Card>

      <Card className="glass-strong border border-white/5">
        <CardHeader>
          <CardTitle className="text-lg">Plan Limits</CardTitle>
          <CardDescription>Your current utilization of plan resources.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Team Members</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">
                1 / {plan.maxMembers}
              </span>
            </div>
            <Progress value={(1 / plan.maxMembers) * 100} className="h-2 bg-white/5" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Storage Capacity</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">
                0 MB / {plan.storageLimitMb} MB
              </span>
            </div>
            <Progress value={0} className="h-2 bg-white/5" />
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
