"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { useOwnerDashboard } from "@/hooks/use-owner-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Video, FileText, MessageSquare, CalendarClock } from "lucide-react";

import { OrganizationStatusBadge } from "./OrganizationStatusBadge";
import { QuickActionsRow } from "./QuickActionsRow";
import { OrganizationDetailsCard } from "./OrganizationDetailsCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { StatsRow } from "./StatsRow";
import { SubscriptionCard } from "./SubscriptionCard";
import { ConnectedIntegrationsCard } from "./ConnectedIntegrationsCard";
// import { TeamCard } from "./TeamCard";
import { AskAianBar } from "./AskAianBar";
import { PlaceholderListCard } from "./PlaceholderListCard";
import { UsagePlaceholderCard } from "./UsagePlaceholderCard";

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useOwnerDashboard();

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
        <StatsRow memberCount={data.memberCount} roleCount={data.roleCount} />
      </div>

      <QuickActionsRow />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <PlaceholderListCard title="Recent AI Insights" icon={Sparkles} emptyMessage="No insights yet." />
          <PlaceholderListCard title="Recent Meetings" icon={Video} emptyMessage="No meetings yet." />

          <div className="grid gap-6 sm:grid-cols-2">
            <PlaceholderListCard title="Recent Documents" icon={FileText} emptyMessage="No documents yet." />
            <RecentActivityCard />
          </div>

          <PlaceholderListCard title="Recent Messages" icon={MessageSquare} emptyMessage="No messages yet." />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SubscriptionCard subscription={data.subscription} />
          {data.organization && <OrganizationDetailsCard organization={data.organization} />}
          <UsagePlaceholderCard />
          <ConnectedIntegrationsCard eyes={data.eyes} integrations={data.integrations} />
          {/* {data.organization?.id && <TeamCard organizationId={data.organization.id} />} */}
          <PlaceholderListCard title="Upcoming" icon={CalendarClock} emptyMessage="Nothing scheduled yet." />
        </div>
      </div>
    </AppLayout>
  );
}