"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Users, Search } from "lucide-react";
import { Member } from "@/types/members";
import { MemberRow } from "./MemberRow";
import { useRemoveMember } from "@/hooks/use-members";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "deactivated", label: "Deactivated" },
];

export function MembersList({ members, organizationId }: { members: Member[]; organizationId: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { mutate: remove } = useRemoveMember(organizationId);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || m.memberStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

 return (
    <div className="mt-8">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Members
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="h-9 w-48 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] pl-9 pr-3 text-[12.5px] outline-none placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-soft)]/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 appearance-none rounded-full border border-black/10 dark:border-white/10 bg-[color:var(--popover)] text-[color:var(--popover-foreground)] px-3 pr-7 text-[12.5px] outline-none focus:border-[color:var(--gold-soft)]/40"
          >
            {STATUS_FILTERS.map((f) => (
              <option
                key={f.value}
                value={f.value}
                className="bg-[color:var(--popover)] text-[color:var(--popover-foreground)]"
              >
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[12px] text-muted-foreground">{filtered.length} people</div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">No members found</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try a different search or filter, or invite someone new above.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <AnimatePresence initial={false}>
            {filtered.map((m, i) => (
              <MemberRow
                key={m.id}
                member={m}
                isFirst={i === 0}
                onRemove={() => remove(m.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}