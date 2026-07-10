import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { DashboardSubscription } from "@/types/dashboard";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  past_due: "destructive",
  canceled: "secondary",
};

export function SubscriptionCard({ subscription }: { subscription: DashboardSubscription | null }) {
  if (!subscription) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[color:var(--gold-soft)]">
            <CreditCard className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
        </div>
        <Badge variant={STATUS_VARIANT[subscription.status] ?? "secondary"}>
          {subscription.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground capitalize">
          {subscription.billingCycle} plan
        </div>
        {subscription.currentPeriodEnd && (
          <div className="mt-1 text-xs text-muted-foreground">
            Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}