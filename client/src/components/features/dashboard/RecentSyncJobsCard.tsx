import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, RefreshCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DashboardSyncJob } from "@/types/dashboard";
import { cn } from "@/lib/utils";

export function RecentSyncJobsCard({ jobs }: { jobs: DashboardSyncJob[] }) {
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime())
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
          <Activity className="h-4 w-4" />
        </div>
        <CardTitle className="text-sm font-medium">Recent Sync Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {recentJobs.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No recent sync jobs found.
          </div>
        ) : (
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    Job #{job.id.slice(0, 8)}
                    {job.status === "completed" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    {job.status === "failed" && <AlertCircle className="h-3 w-3 text-red-500" />}
                    {(job.status === "running" || job.status === "pending") && <RefreshCcw className="h-3 w-3 text-blue-500 animate-spin" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {job.startedAt ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true }) : 'Pending'}
                  </div>
                </div>
                <div className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium capitalize",
                  job.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                  job.status === "failed" ? "bg-red-500/10 text-red-500" :
                  "bg-blue-500/10 text-blue-500"
                )}>
                  {job.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
