"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Activity, ListTree, RefreshCw, Radio } from "lucide-react";
import { useIntegrationsStore } from "@/store/integrations/integrations.store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getHealth,
  getScheduledMeetings,
  getLiveMeetings,
} from "@/api/integrations";

import { MeetingProviderHero } from "./MeetingProviderHero";
import { MeetingsList, getProviderLabel } from "./MeetingsList";
import { useMeetingsPagination } from "@/hooks/useMeetingsPagination";
import { AppLayout } from "@/layouts/AppLayout";

const TABS = [
  { key: "scheduled", label: "Scheduled meetings", icon: ListTree },
  { key: "live", label: "Live meetings", icon: Radio },
];

export function MeetingsDetails({ providerKey }: { providerKey: string }) {
  const providers = useIntegrationsStore(state => state.providers);
  const fetchIntegrations = useIntegrationsStore(state => state.fetchIntegrations);
  const isLoading = useIntegrationsStore(state => state.isLoading);
  const provider = providers.find((p) => p.key.toLowerCase() === providerKey.toLowerCase());

  const router = useRouter();

  const [tab, setTab] = useState("scheduled");
  const [healthData, setHealthData] = useState<any>(null);

  const scheduled = useMeetingsPagination(getScheduledMeetings, provider?.connectionId, providerKey);
  const live = useMeetingsPagination(getLiveMeetings, provider?.connectionId, providerKey);

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
        <AppLayout>
            <div className="flex h-[40vh] w-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--gold)] border-t-transparent"></div>
            </div>
        </AppLayout>
      );
    }
    return null;
  }

  return (
    <AppLayout>
    <div className="w-full">
      <MeetingProviderHero
        provider={provider}
        step="Meetings"
        actions={
          <>
            <Link
              href={`/eyes/${providerKey}/health`}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-foreground"
            >
              <Activity className="h-3.5 w-3.5" /> Health
            </Link>
            <button
              onClick={() => router.push(`/eyes/${providerKey}/syncing`)}
              className="btn-gold btn-gold-hover inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold text-[#17130A]">
              <RefreshCw className="h-3.5 w-3.5" /> Historic sync
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
                layoutId="meetings-tab-underline"
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gold-gradient"
              />
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-3">
          {tab === "scheduled" && (
            <MeetingsList
              data={scheduled.data}
              isLoading={scheduled.isLoading}
              emptyLabel="No upcoming scheduled meetings found."
              badgeFallback={getProviderLabel(providerKey)}
              hasNext={scheduled.hasNext}
              hasPrevious={scheduled.hasPrevious}
              onNext={scheduled.goNext}
              onPrevious={scheduled.goPrevious}
              pageNumber={scheduled.pageNumber}
            />
          )}

          {tab === "live" && (
            <MeetingsList
              data={live.data}
              isLoading={live.isLoading}
              emptyLabel="No live meetings right now."
              badgeFallback="Live"
              isLive
              hasNext={live.hasNext}
              hasPrevious={live.hasPrevious}
              onNext={live.goNext}
              onPrevious={live.goPrevious}
              pageNumber={live.pageNumber}
            />
          )}
        </div>
      </div>
    </div>
    </AppLayout>
  );
}