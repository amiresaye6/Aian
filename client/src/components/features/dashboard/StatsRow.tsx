import { Users, Video, FileText, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PlaceholderStatCard } from "./PlaceholderStatCard";

export function StatsRow({ memberCount, roleCount }: { memberCount: number; roleCount: number }) {
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[color:var(--gold-soft)]">
            <Users className="h-4 w-4" />
          </div>
        </div>
      </Card>
      <PlaceholderStatCard label="Meetings" icon={Video} />
      <PlaceholderStatCard label="Documents" icon={FileText} />
      <PlaceholderStatCard label="Insights" icon={Sparkles} />
    </div>
  );
}