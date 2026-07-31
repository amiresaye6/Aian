import { Card } from "@/components/ui/card";
import { Activity, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { AuditAnalytics } from "@/types/audit";

interface AuditAnalyticsCardsProps {
  analytics?: AuditAnalytics;
  isLoading: boolean;
}

export function AuditAnalyticsCards({ analytics, isLoading }: AuditAnalyticsCardsProps) {
  const successRate = analytics?.totalActions
    ? Math.round((analytics.successCount / analytics.totalActions) * 100)
    : 0;

  const topSkill = analytics?.bySkill?.[0]?.skill || "None";
  const topSkillCount = analytics?.bySkill?.[0]?.count || 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Actions */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Total Actions</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <div className="h-8 w-20 bg-white/5 rounded animate-pulse" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {analytics?.totalActions || 0}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">Lifetime</span>
        </div>
      </Card>

      {/* Success Rate */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Success Rate</span>
        </div>
        <div className="flex flex-col mt-auto gap-2">
          <div className="flex items-end justify-between">
            {isLoading ? (
              <div className="h-8 w-16 bg-white/5 rounded animate-pulse" />
            ) : (
              <span className="text-3xl font-semibold text-foreground tracking-tight">
                {successRate}%
              </span>
            )}
            <span className="text-xs text-muted-foreground mb-1">
              {analytics?.failureCount || 0} failed
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-green-400 rounded-full transition-all duration-1000"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Top Skill */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Most Active Skill</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <div className="h-8 w-32 bg-white/5 rounded animate-pulse" />
          ) : (
            <span className="text-xl font-semibold text-foreground truncate max-w-[150px]" title={topSkill}>
              {topSkill.split('.').pop()}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">{topSkillCount} uses</span>
        </div>
      </Card>

      {/* Actions Today */}
      <Card className="glass flex flex-col p-5 border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gold/10 rounded-lg">
            <Activity className="w-4 h-4 text-gold" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Actions Today</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {isLoading ? (
            <div className="h-8 w-16 bg-white/5 rounded animate-pulse" />
          ) : (
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {analytics?.todayActions || 0}
            </span>
          )}
          <span className="text-xs text-muted-foreground mb-1">
            vs {analytics?.yesterdayActions || 0} yesterday
          </span>
        </div>
      </Card>
    </div>
  );
}
