import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { DashboardOrganization } from "@/types/dashboard";

export function OrganizationDetailsCard({ organization }: { organization: DashboardOrganization }) {
  const details = [
    { label: "Industry", value: organization.industry ?? "Not set" },
    { label: "Country", value: organization.country ?? "Not set" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[color:var(--gold-soft)]">
          <Building2 className="h-4 w-4" />
        </div>
        <CardTitle className="text-sm font-medium">Organization Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {details.map((d) => (
          <div key={d.label}>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{d.label}</div>
            <div className="mt-0.5 text-sm text-foreground">{d.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}