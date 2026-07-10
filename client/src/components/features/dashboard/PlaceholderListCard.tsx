import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function PlaceholderListCard({
  title,
  icon: Icon,
  emptyMessage,
}: {
  title: string;
  icon: LucideIcon;
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground/40">
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-6 text-center text-sm text-muted-foreground/60">{emptyMessage}</div>
      </CardContent>
    </Card>
  );
}