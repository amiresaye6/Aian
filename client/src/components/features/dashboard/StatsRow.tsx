import { Users, Shield, Link2, ActivitySquare, Database } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsRowProps {
  memberCount: number;
  roleCount: number;
  totalKnowledge: number;
  connectedIntegrations: number;
  recentSyncs: number;
}

export function StatsRow({
  memberCount,
  roleCount,
  totalKnowledge,
  connectedIntegrations,
  recentSyncs,
}: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Members
            </div>
            <div className="mt-2 font-display text-[26px] font-semibold tracking-tight">
              {memberCount}
            </div>
            <div className="mt-1 text-[11.5px] text-muted-foreground">{roleCount} roles</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
            <Users className="h-4 w-4" />
          </div>
        </div>
      </Card>
      
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Knowledge Graph
            </div>
            <div className="mt-2 font-display text-[26px] font-semibold tracking-tight">
              {totalKnowledge.toLocaleString()}
            </div>
            <div className="mt-1 text-[11.5px] text-muted-foreground">Total Nodes</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
            <Database className="h-4 w-4" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Integrations
            </div>
            <div className="mt-2 font-display text-[26px] font-semibold tracking-tight">
              {connectedIntegrations}
            </div>
            <div className="mt-1 text-[11.5px] text-muted-foreground">Active Sources</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
            <Link2 className="h-4 w-4" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Sync Activity
            </div>
            <div className="mt-2 font-display text-[26px] font-semibold tracking-tight">
              {recentSyncs}
            </div>
            <div className="mt-1 text-[11.5px] text-muted-foreground">Recent Jobs</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
            <ActivitySquare className="h-4 w-4" />
          </div>
        </div>
      </Card>
    </div>
  );
}