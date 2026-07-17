"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Clock, Bell, Trash2, ArrowRight, Zap, Calendar } from "lucide-react";
import { ProviderHero } from "./components/ProviderHero";
import { getProvider } from "./providers";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

const FREQ = [
  { key: "realtime", label: "Real-time", desc: "Stream events as they happen.", icon: Zap, badge: "Recommended" },
  { key: "15m", label: "Every 15 min", desc: "Balanced freshness and quota.", icon: Clock },
  { key: "hourly", label: "Hourly", desc: "For lower-volume sources.", icon: Clock },
  { key: "daily", label: "Daily digest", desc: "Nightly incremental sync.", icon: Calendar },
];

const RETENTION = [
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
  const provider = getProvider(providerKey);
  const router = useRouter();
  const [freq, setFreq] = useState("realtime");
  const [retention, setRetention] = useState("365");
  const [history, setHistory] = useState("90");
  const [notify, setNotify] = useState(true);
  const [pii, setPii] = useState(true);
  const [ephemeral, setEphemeral] = useState(false);

  return (
    <div className="w-full">
      <ProviderHero provider={provider} step="Sync configuration" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Frequency */}
          <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <h3 className="mb-1 font-display text-[15px] font-semibold tracking-tight text-foreground">Sync frequency</h3>
            <p className="mb-4 text-[12.5px] text-muted-foreground">
              How often should this Eye pull new signal from {provider.name}?
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FREQ.map((f) => {
                const on = freq === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFreq(f.key)}
                    className={cn(
                      "relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      on
                        ? "border-[color:var(--gold-soft)]/50 bg-[color:var(--gold-soft)]/[0.06]"
                        : "border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:border-black/20 dark:hover:border-white/20",
                    )}
                  >
                    {f.badge && on && (
                      <span className="absolute right-3 top-3 rounded-full bg-gold-gradient px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#17130A]">
                        {f.badge}
                      </span>
                    )}
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                        on
                          ? "border-[color:var(--gold-soft)]/40 bg-gold-gradient text-[#17130A]"
                          : "border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-muted-foreground",
                      )}
                    >
                      <f.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-medium text-foreground">{f.label}</div>
                      <div className="text-[11.5px] text-muted-foreground">{f.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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

          {/* Advanced */}
          <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <h3 className="mb-4 font-display text-[15px] font-semibold tracking-tight text-foreground">Privacy & advanced</h3>
            <div className="space-y-3">
              <Toggle
                icon={Bell}
                title="Sync notifications"
                desc="Notify me if this Eye stalls, errors or catches up after a delay."
                on={notify}
                onChange={setNotify}
              />
              <Toggle
                icon={Trash2}
                title="Auto-redact PII"
                desc="Detect and mask emails, phone numbers and secrets before indexing."
                on={pii}
                onChange={setPii}
              />
              <Toggle
                icon={Zap}
                title="Ephemeral mode"
                desc="Do not persist raw messages — index in-memory only."
                on={ephemeral}
                onChange={setEphemeral}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="glass-strong rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Sync plan
            </div>
            <div className="font-display text-[20px] font-semibold text-foreground">
              {label(FREQ, freq)}
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              Backfilling {label(HISTORY, history).toLowerCase()}.
            </div>

            <div className="my-5 h-px bg-black/10 dark:bg-white/10" />
            <div className="space-y-3 text-[12.5px]">
              <Row label="Retention" value={label(RETENTION, retention)} />
              <Row label="PII redaction" value={pii ? "On" : "Off"} />
              <Row label="Ephemeral" value={ephemeral ? "On" : "Off"} />
              <Row label="Alerts" value={notify ? "Enabled" : "Disabled"} />
            </div>

            <button
              onClick={() => router.push(`/eyes/${providerKey}/syncing`)}
              className="btn-gold btn-gold-hover mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-semibold text-[#17130A]"
            >
              Start initial sync <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href={`/eyes/${providerKey}/resources`}
              className="mt-2 block text-center text-[12px] text-muted-foreground hover:text-foreground"
            >
              Back to resources
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

function Toggle({
  icon: Icon,
  title,
  desc,
  on,
  onChange,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex w-full items-start gap-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-3 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground">{title}</div>
        <div className="text-[11.5px] text-muted-foreground">{desc}</div>
      </div>
      <div
        className={cn(
          "relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors",
          on ? "bg-gold-gradient" : "bg-black/10 dark:bg-white/10",
        )}
      >
        <motion.span
          layout
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
          style={{ left: on ? 18 : 2 }}
        />
      </div>
    </button>
  );
}
