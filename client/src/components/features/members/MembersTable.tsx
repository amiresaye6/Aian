"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { Users, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Member } from "@/types/members";
import { RoleBadge } from "./RoleBadge";
import { useRemoveMember } from "@/hooks/use-members";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "deactivated", label: "Deactivated" },
];

const ITEMS_PER_PAGE = 10;

function MemberStatusBadge({ status }: { status: Member["memberStatus"] }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    invited: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    deactivated: "bg-white/5 text-muted-foreground border-white/10",
  };
  return (
    <Badge
      variant="outline"
      className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm ${styles[status] ?? styles.deactivated}`}
    >
      {status}
    </Badge>
  );
}

interface MembersTableProps {
  members?: Member[];
  isLoading: boolean;
  organizationId: string;
  onSelectMember: (id: string) => void;
  selectedMemberId?: string;
  // onRemoveMember: (id: string) => void;
}

export function MembersTable({
  members,
  isLoading,
  organizationId,
  onSelectMember,
  selectedMemberId,
  // onRemoveMember,
}: MembersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const { mutate: removeMember, isPending: isRemoving } =useRemoveMember(organizationId);

  const filtered = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => {
      const matchesSearch =
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || m.memberStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <>
    <Card className="glass overflow-hidden flex flex-col border-white/5">
      {/* Toolbar */}
      <div className="p-4 md:p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/10 rounded-lg">
            <Users className="w-5 h-5 text-gold-soft drop-shadow-[0_0_5px_rgba(201,152,43,0.8)]" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Members</h3>
            <p className="text-xs text-muted-foreground">Showing {filtered.length} people</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search members..."
              className="h-9 w-full md:w-48 rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-soft)]/40"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium">Member</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Joined</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-8" /></td>
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm">No members found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => onSelectMember(member.id)}
                  className={`group cursor-pointer transition-all duration-200 hover:bg-white/[0.03] ${
                    selectedMemberId === member.id ? "bg-white/[0.04] relative" : ""
                  }`}
                >
                  {selectedMemberId === member.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[color:var(--gold)] shadow-[0_0_10px_var(--gold)]" />
                  )}

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[12px] font-semibold uppercase text-foreground">
                        {member.fullName.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground group-hover:text-[color:var(--gold)] transition-colors truncate">
                          {member.fullName}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {member.memberStatus === "invited" ? "Invitation pending" : member.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <RoleBadge roleKey={member.role.key} roleName={member.role.name} />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <MemberStatusBadge status={member.memberStatus} />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground">
                      {member.joinedAt
                        ? formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })
                        : "—"}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberToRemove(member);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
        <span className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
    <ConfirmActionDialog
      open={!!memberToRemove}
      onClose={() => setMemberToRemove(null)}
      onConfirm={() => {
        if (!memberToRemove) return;

        removeMember(memberToRemove.id, {
          onSuccess: () => setMemberToRemove(null),
        });
      }}
      isPending={isRemoving}
      title="Remove member"
      description={
        memberToRemove
          ? `Are you sure you want to remove "${memberToRemove.fullName}" from the organization? This action cannot be undone.`
          : ""
      }
      confirmLabel="Remove"
    />
    </>
    
  );
}