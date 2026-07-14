"use client";

import { useState } from "react";
import { Mail, Plus, AlertCircle } from "lucide-react";
import { useInviteMember } from "@/hooks/use-members";
import { useRoles } from "@/hooks/use-roles";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteMemberSection({ organizationId }: { organizationId: string }) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const { roles, isLoading: rolesLoading } = useRoles();
  const { mutate: invite, isPending } = useInviteMember(organizationId);

  const validate = () => {
    let valid = true;

    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      valid = false;
    } else {
      setEmailError(null);
    }

    if (!roleId) {
      setRoleError("Please select a role");
      valid = false;
    } else {
      setRoleError(null);
    }

    return valid;
  };

  const handleAdd = () => {
    if (!validate()) return;
    invite(
      { email: email.trim(), roleId },
      {
        onSuccess: () => {
          setEmail("");
          setRoleId("");
          setEmailError(null);
          setRoleError(null);
        },
      }
    );
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
              placeholder="colleague@company.com"
              className={`h-12 w-full rounded-2xl border pl-10 pr-4 text-[14px] outline-none transition-all placeholder:text-muted-foreground/60 bg-black/[0.02] dark:bg-white/[0.03] focus:bg-black/[0.03] dark:focus:bg-white/[0.05] ${
                emailError
                  ? "border-destructive/50 focus:border-destructive"
                  : "border-black/10 dark:border-white/10 focus:border-[color:var(--gold-soft)]/40"
              }`}
            />
          </div>
          {emailError && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {emailError}
            </div>
          )}
        </div>

        <div>
          <select
            value={roleId}
            onChange={(e) => {
              setRoleId(e.target.value);
              if (roleError) setRoleError(null);
            }}
            disabled={rolesLoading || !roles?.length}
            className={`h-12 appearance-none rounded-2xl border bg-[color:var(--popover)] text-[color:var(--popover-foreground)] px-4 pr-10 text-[14px] outline-none disabled:opacity-50 ${
              roleError
                ? "border-destructive/50 focus:border-destructive"
                : "border-black/10 dark:border-white/10 focus:border-[color:var(--gold-soft)]/40"
            }`}
          >
            <option value="" disabled className="bg-[color:var(--popover)] text-[color:var(--popover-foreground)]">
              {rolesLoading ? "Loading roles..." : "Select role"}
            </option>
            {roles?.map((r) => (
              <option
                key={r.id}
                value={r.id}
                className="bg-[color:var(--popover)] text-[color:var(--popover-foreground)]"
              >
                {r.name}
              </option>
            ))}
          </select>
          {roleError && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {roleError}
            </div>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={isPending}
          className="h-12 shrink-0 btn-gold btn-gold-hover inline-flex items-center gap-2 rounded-2xl px-5 text-[14px] font-semibold disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {isPending ? "Adding..." : "Add"}
        </button>
      </div>
    </div>
  );
}