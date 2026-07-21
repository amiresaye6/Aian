"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Clock, Bell, Trash2, ArrowRight, Zap, Calendar } from "lucide-react";
import { ProviderHero } from "./components/ProviderHero";
import { useIntegrationsStore } from "@/store/integrations/integrations.store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProcessingSettings } from "@/api/integrations/processing-settings";
import { updateSyncConfig, ProviderKey } from "@/api/integrations";
import { useAuthStore } from "@/store/auth/auth.store";

const RETENTION = [
  { key: "15", label: "15 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "1 year" },
  { key: "forever", label: "Forever" },
];

const HISTORY = [
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 3 months" },
  { key: "365", label: "Last year" },
  { key: "all", label: "Entire history" },
];

export function IntegrationSyncConfig({ providerKey }: { providerKey: string }) {
  const providers = useIntegrationsStore(state => state.providers);
  const fetchIntegrations = useIntegrationsStore(state => state.fetchIntegrations);
  const isLoading = useIntegrationsStore(state => state.isLoading);
  const provider = providers.find((p) => p.key.toLowerCase() === providerKey.toLowerCase());
  const router = useRouter();

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const [retention, setRetention] = useState("15");
  const [history, setHistory] = useState("30");
  const [saving, setSaving] = useState(false);
  const { orgId } = useAuthStore();

  if (!provider) {
    if (isLoading) {
      return (
        <div className="flex h-[40vh] w-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--gold)] border-t-transparent"></div>
        </div>
      );
    }
    return null;
  }

  const connectionId = provider?.connectionId;

  const handleSave = async () => {
    if (!connectionId || !orgId) return;
    setSaving(true);
    try {
      await updateSyncConfig(providerKey as ProviderKey, connectionId, { historyBackfillDays: parseInt(history), retentionDays: parseInt(retention) });
      await updateProcessingSettings(orgId, { 
        isAutoProcessingEnabled: true,
        // map other settings to whatever backend expects 
      });
      router.push(`/eyes/${providerKey}/resources`);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <ProviderHero provider={provider} step="Sync configuration" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Historical import */}
          <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <h3 className="mb-1 font-display text-[15px] font-semibold tracking-tight text-foreground">Historical backfill</h3>
            <p className="mb-4 text-[12.5px] text-muted-foreground">
              How much of the past should we import on first sync?
            </p>
            <PillGroup value={history} onChange={setHistory} options={HISTORY} />
          </div>

          {/* Retention */}
          <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <h3 className="mb-1 font-display text-[15px] font-semibold tracking-tight text-foreground">Retention window</h3>
            <p className="mb-4 text-[12.5px] text-muted-foreground">
              How long AIAN keeps ingested {provider.name} data before automatic deletion.
            </p>
            <PillGroup value={retention} onChange={setRetention} options={RETENTION} />
          </div>

        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="glass-strong rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Sync plan
            </div>
            <div className="font-display text-[20px] font-semibold text-foreground">
              Real-time
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              Backfilling {label(HISTORY, history).toLowerCase()}.
            </div>

            <div className="my-5 h-px bg-black/10 dark:bg-white/10" />
            <div className="space-y-3 text-[12.5px]">
              <Row label="Retention" value={label(RETENTION, retention)} />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-gold btn-gold-hover mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-semibold text-[#17130A] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Select resources"} <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/eyes"
              className="mt-2 block text-center text-[12px] text-muted-foreground hover:text-foreground"
            >
              Configure later
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function label<T extends { key: string; label: string }>(list: T[], k: string) {
  return list.find((f) => f.key === k)?.label ?? k;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function PillGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-all",
            value === o.key
              ? "border-[color:var(--gold-soft)]/50 bg-[color:var(--gold-soft)]/[0.08] text-foreground"
              : "border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-muted-foreground hover:border-black/20 dark:hover:border-white/20 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

