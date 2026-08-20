"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { useAuthStore } from "@/store/auth/auth.store";
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
  // The auth store only carries organization (name), organizationId, and
  // organizationLogo — there's no GET /settings/organization endpoint yet,
  // so slug/description/industry/country/timezone aren't available to
  // prefill. OrganizationForm starts those fields blank and only sends
  // whatever the user actually fills in (patchOrganization supports partial
  // updates).
  const user = useAuthStore((state) => state.user);
  const orgId = useAuthStore((state) => state.orgId);

  const organizationName = (user as any)?.organization || "";
  const organizationLogo = (user as any)?.organizationLogo || null;

  const isReady = !!orgId;

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

        {isReady && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <InfoCard
              icon={<Building2 className="h-5 w-5" />}
              label="Organization Name"
              value={organizationName}
              accent
            />
            <InfoCard
              icon={
                organizationLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={organizationLogo}
                    alt=""
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <Building2 className="h-5 w-5" />
                )
              }
              label="Logo"
              value={organizationLogo ? "Uploaded" : "Not set"}
            />
          </div>
        )}

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
            <SettingsForm initialName={organizationName} />
          )}
        </div>

        {isReady && <DangerZone organizationName={organizationName} />}
      </div>
    </AppLayout>
  );
}