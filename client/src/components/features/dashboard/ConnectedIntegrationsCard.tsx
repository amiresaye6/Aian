import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Video, CheckCircle2, Github } from "lucide-react";
import { DashboardEye, DashboardIntegration } from "@/types/dashboard";

const EYE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: MessageSquare,
  meeting: Video,
  task: CheckCircle2,
  coding: Github,
};

export function ConnectedIntegrationsCard({
  eyes,
  integrations,
}: {
  eyes: DashboardEye[];
  integrations: DashboardIntegration[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Connected Integrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {eyes.map((eye) => {
          const Icon = EYE_ICONS[eye.eyeType] ?? CheckCircle2;
          const integration = integrations.find((i) => i.organizationEyeId === eye.id) ?? null;
          const isConnected = eye.status === "connected";

          return (
            <div
              key={eye.id}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[color:var(--gold-soft)]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{eye.providerName ?? eye.eyeTypeName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {integration?.lastSyncAt
                    ? `Synced ${new Date(integration.lastSyncAt).toLocaleString()}`
                    : "Not connected"}
                </div>
              </div>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "bg-[color:var(--success)]" : "bg-white/15"
                }`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}