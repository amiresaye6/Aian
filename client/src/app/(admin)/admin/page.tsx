"use client";

import { useAdminRevenueMetrics, useAdminOrganizations, useAdminAlerts } from "@/hooks/admin/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, AlertTriangle, TrendingUp, Building2 } from "lucide-react";

export default function AdminDashboard() {
  const { data: revenueData, isLoading: revenueLoading } = useAdminRevenueMetrics();
  const { data: orgsData, isLoading: orgsLoading } = useAdminOrganizations();
  const { data: alertsData, isLoading: alertsLoading } = useAdminAlerts();

  if (revenueLoading || orgsLoading || alertsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const metrics = revenueData?.data;
  const orgs = orgsData?.data || [];
  const alerts = alertsData?.data || [];

  const totalUsers = orgs.reduce((acc: number, org: any) => acc + (org._count?.users || 0), 0);

  return (
    <div className="space-y-6 flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">High-level metrics across all organizations.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-strong border border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.mrrUsd?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">MRR based on active subs</p>
          </CardContent>
        </Card>
        
        <Card className="glass-strong border border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.arrUsd?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">ARR projected</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgs.length}</div>
            <p className="text-xs text-muted-foreground">Total registered workspaces</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Across all organizations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass-strong border border-white/5">
          <CardHeader>
            <CardTitle>Recent Organizations</CardTitle>
            <CardDescription>Latest workspaces created on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orgs.slice(0, 5).map((org: any) => (
                <div key={org.id} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{org.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {org.users?.[0]?.email || 'No users'}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    {org.subscription?.plan?.name || 'Free Tier'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 glass-strong border border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Needs Attention
            </CardTitle>
            <CardDescription>Organizations with usage overages</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No current alerts. All good!</p>
            ) : (
              <div className="space-y-4">
                {alerts.slice(0, 5).map((alert: any) => (
                  <div key={alert.id} className="flex flex-col border border-white/10 p-3 rounded-lg bg-white/2">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-sm">{alert.organization?.name}</span>
                      <span className="text-xs text-destructive font-bold">${(alert.overageTotalCents / 100).toFixed(2)} Overage</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>Tokens: {alert.overageTokens > 0 ? 'Exceeded' : 'OK'}</span>
                      <span>Storage: {alert.overageStorageMb > 0 ? 'Exceeded' : 'OK'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
