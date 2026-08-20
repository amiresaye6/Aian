"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { useAuthStore } from "@/store/auth/auth.store";
import { useSettings } from "@/hooks/use-settings";
import { SettingsForm } from "./settingsForm";
import { DangerZone } from "./DangerZone";
import { Settings as SettingsIcon, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}

function InfoCard({ icon, label, value, accent }: InfoCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-2xl border p-4 transition-all",
        accent
          ? "border-[#C9982B]/20 bg-[#C9982B]/[0.04]"
          : "border-white/5 bg-white/[0.015]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          accent
            ? "bg-gold-gradient text-[#17130A]"
            : "bg-white/[0.04] border border-white/10 text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display text-sm font-bold text-foreground leading-none truncate">
          {value || "—"}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1 truncate">
          {label}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const orgId = useAuthStore((state) => state.orgId);
  const { organization, isLoadingOrganization } = useSettings();

  const organizationName = organization?.name || (user as any)?.organization || "";
  const organizationLogo = organization?.logoUrl || (user as any)?.organizationLogo || null;

  const isReady = !!orgId && !isLoadingOrganization;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-[color:var(--gold-soft)]" />{" "}
              Organization Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your organization&apos;s identity, regional configuration, and
              account lifecycle.
            </p>
          </div>
        </div>

        

        <div className="glass-strong relative overflow-hidden rounded-3xl p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-sm font-semibold text-foreground/90 uppercase tracking-wider">
              General Information
            </h2>
          </div>

          {!isReady ? (
            <div className="space-y-4 py-6">
              <div className="h-11 w-full animate-pulse rounded-xl bg-white/[0.02]" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-white/[0.02]" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-white/[0.02]" />
            </div>
          ) : (
            <SettingsForm organization={organization} />
          )}
        </div>

        {isReady && <DangerZone organizationName={organizationName} />}
      </div>
    </AppLayout>
  );
}