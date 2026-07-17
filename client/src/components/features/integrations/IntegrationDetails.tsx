"use client";

import { motion } from "motion/react";
import { useState } from "react";
import {
  Activity,
  Settings2,
  Database,
  ListTree,
  RefreshCw,
  PowerOff,
  ExternalLink,
  Hash,
  Lock,
  Users,
} from "lucide-react";
import { ProviderHero } from "./components/ProviderHero";
import { EyeHealthRing } from "./components/EyeHealthRing";
import { getProvider, formatAgo, formatIn } from "./providers";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "resources", label: "Resources", icon: ListTree },
  { key: "data", label: "Data", icon: Database },
  { key: "settings", label: "Settings", icon: Settings2 },
];

export function IntegrationDetails({ providerKey }: { providerKey: string }) {
  const provider = getProvider(providerKey);
  const [tab, setTab] = useState("overview");

  return (
    <div className="w-full">
      <ProviderHero
        provider={provider}
        step="Overview"
        actions={
          <>
            <Link
              href={`/eyes/${providerKey}/health`}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-foreground"
            >
              <Activity className="h-3.5 w-3.5" /> Health
            </Link>
            <button className="btn-gold btn-gold-hover inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold text-[#17130A]">
              <RefreshCw className="h-3.5 w-3.5" /> Sync now
            </button>
          </>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-black/5 dark:border-white/5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative inline-flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors",
              tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
            {tab === t.key && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gold-gradient"
              />
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Knowledge items" value={provider.knowledgeItems.toLocaleString()} />
              <Metric label={provider.resourceLabel} value={String(provider.resources)} />
              <Metric label="Members mapped" value="128" />
            </div>

            <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
              <h3 className="mb-4 font-display text-[15px] font-semibold tracking-tight text-foreground">
                Recent knowledge captured
              </h3>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {[
                  { t: "Atlas v3 launch decision", meta: "#leadership · 12 min ago" },
                  { t: "Support ticket spike root cause", meta: "#customer-success · 42 min ago" },
                  { t: "Q4 roadmap review notes", meta: "#product-launch · 2h ago" },
                  { t: "Hiring loop feedback synthesis", meta: "#hiring · yesterday" },
                ].map((r) => (
                  <div key={r.t} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-[13.5px] font-medium text-foreground">{r.t}</div>
                      <div className="text-[11.5px] text-muted-foreground">{r.meta}</div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
              <div className="flex items-center gap-4">
                <EyeHealthRing value={provider.health} size={56} label="" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Eye status
                  </div>
                  <div className="font-display text-[16px] font-semibold text-foreground">
                    {provider.health >= 85 ? "Fully awake" : provider.health >= 60 ? "Attention" : "Weak signal"}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    Synced {formatAgo(provider.lastSyncMin)} · next {formatIn(provider.nextSyncMin)}
                  </div>
                </div>
              </div>
              <Link
                href={`/eyes/${providerKey}/health`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] py-2 text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-foreground"
              >
                Open health dashboard →
              </Link>
            </div>

            <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
              <h3 className="mb-3 font-display text-[14px] font-semibold tracking-tight text-foreground">Danger zone</h3>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/[0.06] py-2 text-[12.5px] font-semibold text-[color:var(--danger)] hover:bg-[color:var(--danger)]/[0.12]">
                <PowerOff className="h-3.5 w-3.5" /> Disconnect this Eye
              </button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Ingested data is retained per your retention policy and can be purged from Settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "resources" && (
        <div className="glass rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
          <h3 className="mb-4 font-display text-[15px] font-semibold tracking-tight text-foreground">
            Watched {provider.resourceLabel.toLowerCase()}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {provider.sampleResources.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
                  {r.kind === "private" ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground">{r.name}</div>
                  <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" /> {r.members ?? 0} · {r.activity} activity
                  </div>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
              </div>
            ))}
          </div>
          <Link
            href={`/eyes/${providerKey}/resources`}
            className="mt-4 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[color:var(--gold-soft)] hover:text-foreground"
          >
            Manage selection →
          </Link>
        </div>
      )}

      {tab === "data" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Documents", value: Math.floor(provider.knowledgeItems * 0.4).toLocaleString() },
            { label: "Messages", value: Math.floor(provider.knowledgeItems * 0.55).toLocaleString() },
            { label: "Entities", value: Math.floor(provider.knowledgeItems * 0.05).toLocaleString() },
          ].map((c) => (
            <Metric key={c.label} label={c.label} value={c.value} />
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
          <p className="text-[13px] text-muted-foreground">
            Configure sync cadence, retention and privacy for this Eye.
          </p>
          <Link
            href={`/eyes/${providerKey}/sync-config`}
            className="btn-gold btn-gold-hover mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[#17130A]"
          >
            Open sync configuration →
          </Link>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-[24px] font-semibold text-foreground">{value}</div>
    </div>
  );
}
