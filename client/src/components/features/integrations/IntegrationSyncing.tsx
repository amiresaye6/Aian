"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Cpu, FileText, MessageSquare, Users, Sparkles } from "lucide-react";
import { AnimatedEye } from "./components/AnimatedEye";
import { useRouter } from "next/navigation";
import { startHistoricalSync, getHistoricalSyncStatus, ProviderKey } from "@/api/integrations";
import { useIntegrationsStore } from "@/store/integrations/integrations.store";

const STAGES = [
  { label: "Discovering resources", icon: Cpu, share: 8 },
  { label: "Fetching history", icon: FileText, share: 28 },
  { label: "Indexing messages", icon: MessageSquare, share: 26 },
  { label: "Mapping people", icon: Users, share: 12 },
  { label: "Building knowledge graph", icon: Sparkles, share: 26 },
];

export function IntegrationSyncing({ providerKey }: { providerKey: string }) {
  const { providers, getProviderByKey, fetchIntegrations, isLoading } = useIntegrationsStore();
  const provider = getProviderByKey(providerKey);
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const connectionId = provider?.connectionId;

  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!connectionId) return;

    let id: any;

    const startAndPoll = async () => {
      try {
        await startHistoricalSync(providerKey as ProviderKey, connectionId);
      } catch (err) {
        console.log("Sync might already be running", err);
      }

      id = setInterval(async () => {
        try {
          const status = await getHistoricalSyncStatus(providerKey as ProviderKey, connectionId);
          if (status?.progress) {
            const current = status.progress.totalItemsSynced || 0;
            const target = status.progress.totalItemsExpected || 100;
            let percent = (current / target) * 100;
            if (percent > 100) percent = 100;
            
            setProgress(percent);
            
            if (status.status === 'completed' || percent >= 100) {
              clearInterval(id);
              setTimeout(() => router.push(`/eyes/${providerKey}/details`), 900);
            }
          }
        } catch (err) {
          console.error("Failed to check sync status", err);
        }
      }, 2000);
    };

    startAndPoll();

    return () => clearInterval(id);
  }, [connectionId, providerKey, router]);

  useEffect(() => {
    if (!provider) return;
    setLogs([
      `[00:00] Handshake with ${provider.name} …`,
      `[00:01] Verified scopes: ${provider.scopes.slice(0, 2).join(", ")} …`,
    ]);
    const id = setInterval(() => {
      const t = new Date();
      const ts = `${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}`;
      const samples = [
        `[${ts}] Indexed ${Math.floor(Math.random() * 400 + 40)} items from #eng-atlas`,
        `[${ts}] Extracted ${Math.floor(Math.random() * 24 + 2)} decisions`,
        `[${ts}] Mapped ${Math.floor(Math.random() * 12 + 1)} people to Organization`,
        `[${ts}] Embedded ${Math.floor(Math.random() * 800 + 100)} tokens`,
      ];
      setLogs((prev) => [samples[Math.floor(Math.random() * samples.length)], ...prev].slice(0, 40));
    }, 700);
    return () => clearInterval(id);
  }, [provider]);

  if (!provider) return null;

  let acc = 0;
  const stageStates = STAGES.map((s) => {
    const start = acc;
    acc += s.share;
    const end = acc;
    const local =
      progress <= start ? 0 : progress >= end ? 100 : ((progress - start) / (end - start)) * 100;
    return { ...s, local, done: progress >= end };
  });

  return (
    <div className="w-full">
      <div className="mx-auto max-w-5xl">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-6 md:p-10 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #E8C86A, transparent 70%)" }}
          />

          <div className="relative grid gap-8 md:grid-cols-[220px_1fr] md:items-center">
            <div className="flex justify-center">
              <div className="relative">
                <AnimatedEye status="connecting" size={200} glyph={provider.glyph} />
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    boxShadow: "0 0 60px 8px rgba(21,194,167,0.3)",
                  }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--teal)]">
                Initial sync
              </div>
              <h1 className="font-display text-[26px] font-semibold tracking-tight md:text-[34px] text-foreground">
                Awakening the <span className="text-gold-gradient">{provider.name} Eye</span>
              </h1>
              <p className="mt-2 max-w-lg text-[13.5px] text-muted-foreground">
                AIAN is scanning, understanding and weaving {provider.name} into your organizational
                knowledge graph. You can leave — we'll notify you when it's complete.
              </p>

              {/* progress bar */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Overall progress</span>
                  <span className="font-display text-[16px] font-semibold text-foreground">
                    {Math.floor(progress)}%
                  </span>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/5">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gold-gradient"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute inset-y-0 w-24 opacity-70"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                    }}
                    animate={{ x: ["-20%", "800%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stages */}
          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {stageStates.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-2xl border p-4 ${
                  s.done
                    ? "border-[color:var(--gold-soft)]/30 bg-[color:var(--gold-soft)]/[0.05]"
                    : s.local > 0
                      ? "border-[color:var(--teal)]/30 bg-[color:var(--teal)]/[0.05]"
                      : "border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <s.icon
                    className={`h-4 w-4 ${
                      s.done ? "text-[color:var(--gold-soft)]" : s.local > 0 ? "text-[color:var(--teal)]" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {Math.floor(s.local)}%
                  </span>
                </div>
                <div className="text-[12.5px] font-medium text-foreground">{s.label}</div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                  <div
                    className={`h-full ${s.done ? "bg-gold-gradient" : "bg-[color:var(--teal)]"}`}
                    style={{ width: `${s.local}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live logs */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="glass rounded-2xl p-5 lg:col-span-2 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[14px] font-semibold tracking-tight text-foreground">Live activity</h3>
              <span className="text-[11px] text-muted-foreground">streaming</span>
            </div>
            <div className="h-64 overflow-hidden rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.03] dark:bg-black/40 p-3 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
              {logs.map((l, i) => (
                <div key={i} className={i === 0 ? "text-[color:var(--gold-soft)]" : ""}>
                  {l}
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <h3 className="mb-3 font-display text-[14px] font-semibold tracking-tight text-foreground">Estimates</h3>
            <div className="space-y-3 text-[12.5px]">
              <Row label="Elapsed" value={fmt(progress * 0.6)} />
              <Row label="Remaining" value={fmt((100 - progress) * 0.6)} />
              <Row label="Items indexed" value={Math.floor(progress * 128).toLocaleString()} />
              <Row label="Throughput" value={`${Math.floor(400 + Math.random() * 120)}/s`} />
            </div>
            <p className="mt-4 text-[11.5px] text-muted-foreground">
              You can safely close this page — the Eye keeps working in the background.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
