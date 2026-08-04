"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { useOwnerDashboard } from "@/hooks/use-owner-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Video, FileText, MessageSquare, CalendarClock } from "lucide-react";

import { OrganizationStatusBadge } from "./OrganizationStatusBadge";
import { QuickActionsRow } from "./QuickActionsRow";
import { OrganizationDetailsCard } from "./OrganizationDetailsCard";
import { RecentSyncJobsCard } from "./RecentSyncJobsCard";
import { KnowledgeDistributionChart } from "./KnowledgeDistributionChart";
import { RecentAuditsCard } from "./RecentAuditsCard";
import { StatsRow } from "./StatsRow";
import { SubscriptionCard } from "./SubscriptionCard";
import { ConnectedIntegrationsCard } from "./ConnectedIntegrationsCard";
import { TeamCard } from "./TeamCard";
import { AskAianBar } from "./AskAianBar";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useOwnerDashboard();
  const router = useRouter();
  useEffect(() => {
    const status = (error as any)?.response?.status;
    if (isError && status === 404) {
      router.push("/workspace");
    }
  }, [isError, error, router]);

  if (isError && (error as any)?.response?.status === 404) {
    return null; 
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load dashboard. {error instanceof Error ? error.message : ""}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {data.organization?.name ?? "Dashboard"}
        </h1>
        {data.organization?.status && (
          <OrganizationStatusBadge status={data.organization.status} />
        )}
      </div>

      <div className="mb-8">
        <AskAianBar />
      </div>

      <div className="mb-6">
        <StatsRow 
          memberCount={data.memberCount || 0} 
          roleCount={data.roleCount || 0} 
          totalKnowledge={data.integrations?.reduce((acc, curr) => acc + (curr.knowledgeItems || 0), 0) || 0}
          connectedIntegrations={data.integrations?.length || 0}
          recentSyncs={data.syncJobs?.length || 0}
        />
      </div>

      <QuickActionsRow />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
             <KnowledgeDistributionChart integrations={data.integrations || []} eyes={data.eyes || []} />
             <RecentSyncJobsCard jobs={data.syncJobs || []} />
          </div>
          
          <RecentAuditsCard />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SubscriptionCard subscription={data.subscription} />
          {data.organization && <OrganizationDetailsCard organization={data.organization} />}
          <ConnectedIntegrationsCard eyes={data.eyes} integrations={data.integrations} />
          {data.organization?.id && <TeamCard organizationId={data.organization.id} />}
        </div>
      </div>
    </AppLayout>
  );
}