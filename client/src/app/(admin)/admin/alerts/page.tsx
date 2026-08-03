"use client";

import { useAdminAlerts } from "@/hooks/admin/useAdmin";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

export default function AlertsPage() {
  const { data: alertsData, isLoading } = useAdminAlerts();
  
  if (isLoading) {
    return <Skeleton className="h-100 w-full" />;
  }

  const alerts = alertsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Quota Alerts</h1>
          <p className="text-muted-foreground mt-1">Organizations currently exceeding their quotas.</p>
        </div>
      </div>

      <Card className="glass-strong border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Active Overages</h3>
              <p className="text-xs text-muted-foreground">{alerts.length} organizations</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/2 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Organization</th>
                <th className="px-6 py-4 font-medium">Period</th>
                <th className="px-6 py-4 font-medium text-right">Overage Tokens</th>
                <th className="px-6 py-4 font-medium text-right">Overage Storage</th>
                <th className="px-6 py-4 font-medium text-right">Total Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No active overages found.
                  </td>
                </tr>
              ) : (
                alerts.map((alert: any) => (
                  <tr key={alert.id} className="hover:bg-white/2 hover:-translate-y-px transition-all">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{alert.organization?.name}</div>
                      <div className="text-xs text-muted-foreground">{alert.organization?.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {format(new Date(alert.periodStart), "MMM d")} - {format(new Date(alert.periodEnd), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {alert.overageTokens > 0 ? (
                        <span className="text-destructive font-semibold">{alert.overageTokens.toString()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {alert.overageStorageMb > 0 ? (
                        <span className="text-destructive font-semibold">{alert.overageStorageMb} MB</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-destructive font-bold text-lg">
                        ${(alert.overageTotalCents / 100).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
