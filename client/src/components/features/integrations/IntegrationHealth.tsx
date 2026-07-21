"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { ShieldCheck, ServerCrash, Cpu, Activity, Zap, AlertTriangle, RefreshCw, Server, HeartPulse, CheckCircle2 } from "lucide-react";
import { ProviderHero } from "./components/ProviderHero";
import { EyeHealthRing } from "./components/EyeHealthRing";
import { formatAgo, formatIn } from "./providers";
import { useIntegrationsStore } from "@/store/integrations/integrations.store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getHealth } from "@/api/integrations";
import { formatDistanceToNow } from "date-fns";

function seed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

export function IntegrationHealth({ providerKey }: { providerKey: string }) {
  const providers = useIntegrationsStore(state => state.providers);
  const fetchIntegrations = useIntegrationsStore(state => state.fetchIntegrations);
  const isLoading = useIntegrationsStore(state => state.isLoading);
  const provider = providers.find((p) => p.key.toLowerCase() === providerKey.toLowerCase());

  const router = useRouter();
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  useEffect(() => {
    if (!provider?.connectionId) return;
    getHealth(provider.connectionId).then((res) => {
      setHealthData(res.data || res);
    }).catch(() => {});
  }, [provider?.connectionId]);

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
          <button 
            onClick={() => router.push(`/eyes/${providerKey}/syncing`)}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Historic sync
          </button>
        }
      />

      {/* Top cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="glass flex items-center gap-4 rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
          <EyeHealthRing value={healthData?.status === 'connected' ? 100 : healthData?.status === 'pending' ? 60 : 20} size={56} label="" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Overall</div>
            <div className="font-display text-[18px] font-semibold text-foreground">Eye health</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">
              Last check {healthData?.lastVerifiedAt ? formatDistanceToNow(new Date(healthData.lastVerifiedAt), { addSuffix: true }) : 'Never'}
            </div>
          </div>
        </div>
        {[
          { icon: Zap, label: "Status", value: healthData?.status === 'connected' ? "Connected" : healthData?.status === 'pending' ? "Pending" : "Error", tone: healthData?.status === 'connected' ? "text-[color:var(--success)]" : "text-[color:var(--gold-soft)]" },
          { icon: Activity, label: "Last sync", value: healthData?.lastSyncAt ? formatDistanceToNow(new Date(healthData.lastSyncAt), { addSuffix: true }) : 'Never' },
          { icon: HeartPulse, label: "Next sync", value: "Auto" },
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
              <Row label="Workspace" value={healthData?.connection?.accountName ?? "—"} mono />
              <Row label="Region" value="eu-west-1" />
              <Row label="Connection ID" value={healthData?.connection?.accountId ?? "—"} mono />
              <Row label="Webhook" value={healthData?.isValid ? "Verified" : "Error"} tone={healthData?.isValid ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"} />
            </div>
          </div>

          {healthData?.status === "error" && (
            <div className="rounded-2xl border border-[color:var(--gold-soft)]/30 bg-[color:var(--gold-soft)]/[0.06] p-4">
              <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-[color:var(--gold-soft)]">
                <AlertTriangle className="h-4 w-4" /> Attention needed
              </div>
              <p className="text-[12px] text-foreground/80">
                {healthData.message || `An error occurred with your ${provider.name} connection. Please try reconnecting.`}
              </p>
              <button
                onClick={() => router.push(`/eyes/${providerKey}/connect`)}
                className="mt-3 inline-flex text-[12px] font-semibold text-foreground underline decoration-black/30 dark:decoration-white/30 underline-offset-2"
              >
                Reconnect Eye →
              </button>
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
