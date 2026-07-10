import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function PlaceholderStatCard({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-display text-[26px] font-semibold tracking-tight text-muted-foreground/40">
            —
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground/50">Coming soon</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground/40">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}