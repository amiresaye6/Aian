"use client";

import { useState } from "react";
import { Mail, Plus } from "lucide-react";
import { useInviteMember } from "@/hooks/use-members";

const ROLE_OPTIONS = [
  { id: "f707ce32-a263-4549-beb7-bd2877afc9f4", key: "owner", name: "Owner" },
  { id: "cf738264-fb49-4cdf-b64b-4a7233bf8c1d", key: "admin", name: "Admin" },
  { id: "68d24e5a-8125-4037-9df9-6daeb9fa356f", key: "member", name: "Member" },
];

export function InviteMemberSection({ organizationId }: { organizationId: string }) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(ROLE_OPTIONS[2].id); // defaults to Member
  const { mutate: invite, isPending } = useInviteMember(organizationId);

  const handleAdd = () => {
    if (!email.includes("@")) return;
    invite({ email, roleId }, { onSuccess: () => setEmail("") });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder="colleague@company.com"
          className="h-12 w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] pl-10 pr-4 text-[14px] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-soft)]/40 focus:bg-black/[0.03] dark:focus:bg-white/[0.05]"
        />
      </div>
      <select
        value={roleId}
        onChange={(e) => setRoleId(e.target.value)}
       className="h-12 appearance-none rounded-2xl border border-black/10 dark:border-white/10 bg-[color:var(--popover)] text-[color:var(--popover-foreground)] px-4 pr-10 text-[14px] outline-none focus:border-[color:var(--gold-soft)]/40"
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r.id}
           value={r.id}
           className="bg-[color:var(--popover)] text-[color:var(--popover-foreground)]"
          >
            {r.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={isPending}
        className="btn-gold btn-gold-hover inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-[14px] font-semibold disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> {isPending ? "Adding..." : "Add"}
      </button>
    </div>
  );
}

   