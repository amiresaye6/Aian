"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Search, ArrowRight, Users, CheckCircle2, Hash, Lock, Loader2, AlertTriangle } from "lucide-react";
import { ProviderHero } from "./components/ProviderHero";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAvailableResources, getSelectedResources, saveSelectedResources, ProviderKey } from "@/api/integrations";
import { useIntegrationsStore } from "@/store/integrations/integrations.store";

const PROVIDER_EYE_TYPE: Record<string, string> = {
  github: "coding",
  slack: "chat",
  zoom: "meeting",
  jira: "task",
};

type NormalizedResource = {
  id: string;
  name: string;
  kind: "private" | "public";
};
// const ACT_TONE: Record<string, string> = {
//   high: "text-[color:var(--success)]",
//   medium: "text-[color:var(--gold-soft)]",
//   low: "text-muted-foreground",
// };

export function IntegrationResources({ providerKey }: { providerKey: string }) {
  const providers = useIntegrationsStore(state => state.providers);
  const fetchIntegrations = useIntegrationsStore(state => state.fetchIntegrations);
  const isLoadingStore = useIntegrationsStore(state => state.isLoading);
  const provider = providers.find((p) => p.key.toLowerCase() === providerKey.toLowerCase());
  const router = useRouter();
  const [q, setQ] = useState("");
  const [availableResources, setAvailableResources] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const connectionId = provider?.connectionId;

  useEffect(() => {
    if (connectionId) {
      Promise.all([
        getAvailableResources(providerKey as ProviderKey, connectionId),
        getSelectedResources(providerKey as ProviderKey, connectionId)
      ]).then(([available, selectedRes]) => {
        setAvailableResources(available);
        setSelected(new Set(selectedRes.map((r: any) => r.externalResourceId || r.id)));
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    } else if (!isLoadingStore) {
      setLoading(false);
    }
  }, [connectionId, providerKey, isLoadingStore]);

  const filtered = useMemo(
    () =>
      availableResources.filter((r) =>
        r.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [availableResources, q],
  );

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const handleSave = async () => {
    if (connectionId) {
      setIsSaving(true);
      setSaveError(false);
      try {
        await saveSelectedResources(providerKey as ProviderKey, connectionId, Array.from(selected));
        router.push(`/eyes/${providerKey}/syncing`);
      } catch (err) {
        console.error("Failed to save resources", err);
        setSaveError(true);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSkipSync = async () => {
    if (connectionId) {
      setIsSaving(true);
      setSaveError(false);
      try {
        await saveSelectedResources(providerKey as ProviderKey, connectionId, Array.from(selected));
        router.push(`/eyes/${providerKey}/details`);
      } catch (err) {
        console.error("Failed to save resources", err);
        setSaveError(true);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!provider) {
    if (isLoadingStore) {
      return (
        <div className="flex h-[40vh] w-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--gold)] border-t-transparent"></div>
        </div>
      );
    }
    return null;
  }

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
                  onClick={() => setSelected(new Set(availableResources.map((r) => r.externalResourceId || r.id)))}
                  className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
                >

                  Select all
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  disabled={isLoadingStore || selected.size === 0}
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
              {loading ? (
                <div className="py-8 text-center text-[13px] text-muted-foreground">Loading resources...</div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-muted-foreground">No resources found.</div>
              ) : (
                filtered.map((r, i) => {
                  const isPrivate = r.isPrivate === true || r.metadata?.private === true || r.metadata?.is_private === true;
                  const on = selected.has(r.externalResourceId || r.id);
                  return (
                    <motion.button
                      key={r.externalResourceId || r.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => toggle(r.externalResourceId || r.id)}
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
                          {r.type && (
                            <span className="rounded-md bg-black/[0.04] dark:bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {r.type}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
                          {r.memberCount !== undefined && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" /> {r.memberCount}
                            </span>
                          )}
                          {r.url && (
                            <span className="truncate max-w-[200px]">
                              {r.url}
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
                })
              )}
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
                / {availableResources.length}
              </span>
            </div>
            <div className="mt-1 text-[12.5px] text-muted-foreground">
              {provider.resourceLabel.toLowerCase()} will feed this Eye.
            </div>
            {saveError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 p-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--danger)]" />
                <span className="text-[11.5px] text-foreground">
                  Couldn't save your selection. Please try again.
                </span>
              </div>
            )}


            {/* //             <div className="my-5 h-px bg-black/10 dark:bg-white/10" />

  //             <div className="space-y-3 text-[12.5px]">
  //               <Row label="Estimated items" value={`${(selected.size * 4200).toLocaleString()}`} />
  //               <Row label="Initial sync" value={`~${Math.max(1, Math.round(selected.size * 0.6))}m`} />
  //               <Row label="Ongoing storage" value={`~${(selected.size * 0.4).toFixed(1)} GB`} />
  //             </div> */}

            <button
              onClick={handleSave}
              disabled={selected.size === 0 || !connectionId}
              className="btn-gold btn-gold-hover mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:transform-none text-[#17130A]"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Start historical sync <ArrowRight className="h-4 w-4" />
                </>
                )}
             </button>
             <button
              onClick={handleSkipSync}
              disabled={selected.size === 0 || !connectionId || isSaving}
              className="mt-2 block w-full text-center text-[12px] text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Skip historical sync (track new only)
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




