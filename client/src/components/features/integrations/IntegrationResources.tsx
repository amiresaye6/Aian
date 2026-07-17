"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Search, ArrowRight, Users, CheckCircle2, Hash, Lock } from "lucide-react";
import { ProviderHero } from "./components/ProviderHero";
import { getProvider } from "./providers";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ACT_TONE: Record<string, string> = {
  high: "text-[color:var(--success)]",
  medium: "text-[color:var(--gold-soft)]",
  low: "text-muted-foreground",
};

export function IntegrationResources({ providerKey }: { providerKey: string }) {
  const provider = getProvider(providerKey);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(provider.sampleResources.slice(0, 4).map((r) => r.name)),
  );

  const filtered = useMemo(
    () =>
      provider.sampleResources.filter((r) =>
        r.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [provider, q],
  );

  const toggle = (n: string) => {
    const s = new Set(selected);
    s.has(n) ? s.delete(n) : s.add(n);
    setSelected(s);
  };

  return (
    <div className="w-full">
      <ProviderHero
        provider={provider}
        step="Select resources"
        actions={
          <Link
            href={`/eyes/${providerKey}/details`}
            className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3.5 py-2 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            Skip
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h3 className="font-display text-[16px] font-semibold tracking-tight text-foreground">
                  Which {provider.resourceLabel.toLowerCase()} should this Eye watch?
                </h3>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Choose what AIAN can see. You can change this any time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelected(new Set(provider.sampleResources.map((r) => r.name)))}
                  className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
                >
                  Select all
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Filter ${provider.resourceLabel.toLowerCase()}…`}
                className="h-10 w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-soft)]/40 text-foreground"
              />
            </div>

            <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
              {filtered.map((r, i) => {
                const isPrivate = r.kind === "private";
                const on = selected.has(r.name);
                return (
                  <motion.button
                    key={r.name}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => toggle(r.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                      on
                        ? "border-[color:var(--gold-soft)]/40 bg-[color:var(--gold-soft)]/[0.06]"
                        : "border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        on
                          ? "border-[color:var(--gold-soft)]/50 bg-gold-gradient text-[#17130A]"
                          : "border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-muted-foreground",
                      )}
                    >
                      {isPrivate ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[13.5px] font-medium text-foreground">{r.name}</div>
                        <span className="rounded-md bg-black/[0.04] dark:bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {r.kind}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
                        {r.members !== undefined && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {r.members}
                          </span>
                        )}
                        {r.activity && (
                          <span className={cn("uppercase tracking-[0.12em]", ACT_TONE[r.activity] || "text-muted-foreground")}>
                            {r.activity} activity
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                        on
                          ? "border-[color:var(--gold-soft)] bg-gold-gradient text-[#17130A]"
                          : "border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02]",
                      )}
                    >
                      {on && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* summary */}
        <div className="space-y-4">
          <div className="glass-strong rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Selection
            </div>
            <div className="mt-1 font-display text-[32px] font-semibold text-foreground">
              {selected.size}
              <span className="ml-2 text-[14px] font-medium text-muted-foreground">
                / {provider.sampleResources.length}
              </span>
            </div>
            <div className="mt-1 text-[12.5px] text-muted-foreground">
              {provider.resourceLabel.toLowerCase()} will feed this Eye.
            </div>

            <div className="my-5 h-px bg-black/10 dark:bg-white/10" />

            <div className="space-y-3 text-[12.5px]">
              <Row label="Estimated items" value={`${(selected.size * 4200).toLocaleString()}`} />
              <Row label="Initial sync" value={`~${Math.max(1, Math.round(selected.size * 0.6))}m`} />
              <Row label="Ongoing storage" value={`~${(selected.size * 0.4).toFixed(1)} GB`} />
            </div>

            <button
              onClick={() => router.push(`/eyes/${providerKey}/sync-config`)}
              disabled={selected.size === 0}
              className="btn-gold btn-gold-hover mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:transform-none text-[#17130A]"
            >
              Configure sync <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-4 text-[12px] text-muted-foreground">
            Private {provider.resourceLabel.toLowerCase()} require your account to be a member. AIAN
            respects source permissions — team members only see what they already have access to.
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
