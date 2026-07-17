"use client";

import { motion } from "motion/react";
import { Activity, Zap, AlertTriangle, RefreshCw, Server, HeartPulse } from "lucide-react";
import { ProviderHero } from "./components/ProviderHero";
import { EyeHealthRing } from "./components/EyeHealthRing";
import { getProvider, formatAgo, formatIn } from "./providers";
import Link from "next/link";

function seed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

export function IntegrationHealth({ providerKey }: { providerKey: string }) {
  const provider = getProvider(providerKey);
  const rand = seed(provider.key);

  const heartbeat = Array.from({ length: 60 }, () => 0.3 + rand() * 0.7);
  const latency = Array.from({ length: 24 }, () => Math.round(80 + rand() * 380));
  const events = Array.from({ length: 12 }, (_, i) => ({
    ts: `${String(23 - i).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}`,
    kind: ["sync", "sync", "sync", "info", "warn"][Math.floor(rand() * 5)],
    msg: [
      `Incremental sync completed · ${Math.floor(rand() * 800 + 40)} items`,
      `Webhook delivered from ${provider.name}`,
      `Rate limit near threshold · throttled`,
      `Reconnected after transient error`,
      `Backfill window advanced`,
    ][Math.floor(rand() * 5)],
  }));

  return (
    <div className="w-full">
      <ProviderHero
        provider={provider}
        step="Health"
        actions={
          <button className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Force sync
          </button>
        }
      />

      {/* Top cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="glass flex items-center gap-4 rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
          <EyeHealthRing value={provider.health} size={56} label="" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Overall</div>
            <div className="font-display text-[18px] font-semibold text-foreground">Eye health</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">
              Last check {formatAgo(provider.lastSyncMin ?? 2)}
            </div>
          </div>
        </div>
        {[
          { icon: Zap, label: "Uptime (30d)", value: "99.94%", tone: "text-[color:var(--success)]" },
          { icon: Activity, label: "Last sync", value: formatAgo(provider.lastSyncMin ?? 2) },
          { icon: HeartPulse, label: "Next sync", value: formatIn(provider.nextSyncMin ?? 5) },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </div>
            <div className={`mt-2 font-display text-[22px] font-semibold ${s.tone ?? "text-foreground"}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Heartbeat */}
        <div className="glass rounded-2xl p-5 lg:col-span-2 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">Heartbeat · last 60 min</h3>
            <span className="text-[11px] text-muted-foreground">events / min</span>
          </div>
          <div className="h-48 w-full">
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="hb-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8C86A" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#E8C86A" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="hb-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8A6416" />
                  <stop offset="100%" stopColor="#E8C86A" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = heartbeat.map((v, i) => `${(i / (heartbeat.length - 1)) * 300},${100 - v * 90}`);
                const path = `M0,100 L ${pts.join(" L ")} L 300,100 Z`;
                const line = `M ${pts.join(" L ")}`;
                return (
                  <>
                    <path d={path} fill="url(#hb-fill)" />
                    <motion.path
                      d={line}
                      stroke="url(#hb-stroke)"
                      strokeWidth="1.4"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, ease: "easeOut" }}
                    />
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-muted-foreground">
            <span>-60m</span>
            <span>-30m</span>
            <span>now</span>
          </div>
        </div>

        {/* Latency */}
        <div className="glass rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">API latency</h3>
            <span className="text-[11px] text-muted-foreground">p95 · ms</span>
          </div>
          <div className="flex h-40 items-end gap-1">
            {latency.map((v, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.min(100, v / 5)}%` }}
                transition={{ delay: i * 0.02 }}
                className="flex-1 rounded-t-sm"
                style={{
                  background:
                    v > 300
                      ? "linear-gradient(180deg, #E8C86A, #8A6416)"
                      : "linear-gradient(180deg, #15C2A7, #0e6d5f)",
                }}
                title={`${v}ms`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-muted-foreground">
            <span>24h ago</span>
            <span>now</span>
          </div>
        </div>

        {/* Event log */}
        <div className="glass rounded-2xl p-5 lg:col-span-2 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
          <h3 className="mb-3 font-display text-[15px] font-semibold tracking-tight text-foreground">Sync events</h3>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {events.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 py-2.5"
              >
                <span className="mt-1 font-mono text-[10.5px] text-muted-foreground">{e.ts}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                    e.kind === "warn"
                      ? "bg-[color:var(--gold-soft)]/15 text-[color:var(--gold-soft)]"
                      : e.kind === "info"
                        ? "bg-[color:var(--teal)]/15 text-[color:var(--teal)]"
                        : "bg-black/[0.05] dark:bg-white/[0.05] text-muted-foreground"
                  }`}
                >
                  {e.kind}
                </span>
                <div className="flex-1 text-[12.5px] text-foreground/90">{e.msg}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Connection details */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <h3 className="mb-3 flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight text-foreground">
              <Server className="h-4 w-4 text-[color:var(--gold-soft)]" /> Connection
            </h3>
            <div className="space-y-2.5 text-[12.5px]">
              <Row label="Workspace" value={provider.workspace ?? "—"} mono />
              <Row label="Region" value="eu-west-1" />
              <Row label="Token expires" value="in 42 days" />
              <Row label="Webhook" value="Verified" tone="text-[color:var(--success)]" />
            </div>
          </div>

          {provider.status === "unhealthy" && (
            <div className="rounded-2xl border border-[color:var(--gold-soft)]/30 bg-[color:var(--gold-soft)]/[0.06] p-4">
              <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-[color:var(--gold-soft)]">
                <AlertTriangle className="h-4 w-4" /> Attention needed
              </div>
              <p className="text-[12px] text-foreground/80">
                Rate limit hit twice in the last hour. Consider lowering sync frequency or contacting
                your {provider.name} admin to raise limits.
              </p>
              <Link
                href={`/eyes/${providerKey}/sync-config`}
                className="mt-3 inline-flex text-[12px] font-semibold text-foreground underline decoration-black/30 dark:decoration-white/30 underline-offset-2"
              >
                Adjust sync config →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${tone ?? "text-foreground"} ${mono ? "font-mono text-[11.5px]" : "font-medium"} truncate`}>
        {value}
      </span>
    </div>
  );
}
