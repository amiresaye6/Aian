import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export function RecentActivityCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[color:var(--gold-soft)]">
          <Activity className="h-4 w-4" />
        </div>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-6 text-center text-sm text-muted-foreground">
          No recent activity yet.
        </div>
      </CardContent>
    </Card>
  );
}