"use client";

import { useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { useAuthStore } from "@/store/auth/auth.store";
import { useMembers } from "@/hooks/use-members";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteMemberSection } from "./InviteMemberSection";
import { MembersTable } from "./MembersTable";
import { MemberDetailsSheet } from "./MemberDetailsSheet";
// import { useRemoveMember } from "@/hooks/use-members";
import { Users } from "lucide-react";

export default function MembersPage() {
  const user = useAuthStore((s) => s.user);
  const organizationId = user?.organizationId;
  const { data: members, isLoading, isError } = useMembers(organizationId ?? "");
  // const { mutate: removeMember } = useRemoveMember(organizationId ?? "");

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const selectedMember = members?.find((m) => m.id === selectedMemberId) ?? null;

  if (!organizationId) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 border border-gold/20">
            <Users className="h-5 w-5 text-gold-soft" />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-semibold tracking-tight text-foreground">
              Members
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Manage who has access to your organization and what they can do.
            </p>
          </div>
        </div>

        {/* Invite Section */}
        <div className="glass-strong relative overflow-hidden rounded-3xl p-7">
          <InviteMemberSection organizationId={organizationId} />
        </div>

        {/* Members Table */}
        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load members.
          </div>
        ) : (
          <MembersTable
            members={members}
            isLoading={isLoading}
            onSelectMember={setSelectedMemberId}
            selectedMemberId={selectedMemberId ?? undefined}
            // onRemoveMember={(id) => removeMember(id)}
             organizationId={organizationId}
          />
        )}
      </div>

      <MemberDetailsSheet
        member={selectedMember}
        organizationId={organizationId}
        onClose={() => setSelectedMemberId(null)}
      />
    </AppLayout>
  );
}