import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Zap, Brain } from "lucide-react";

const ROWS = [
  { label: "Storage", icon: Database },
  { label: "AI Credits", icon: Zap },
  { label: "Knowledge health", icon: Brain },
];

export function UsagePlaceholderCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ROWS.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground/60">
                <r.icon className="h-3.5 w-3.5" /> {r.label}
              </span>
              <span className="text-muted-foreground/50">Coming soon</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-0 rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}