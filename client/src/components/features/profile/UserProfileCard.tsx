"use client";

import { useAuthStore } from "@/store/auth/auth.store";
import { 
  User as UserIcon, 
  Building2, 
  ShieldAlert, 
  ShieldCheck 
} from "lucide-react";

export default function UserProfileCard() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  const userInitials = user.fullName
    ? user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "OP";

  return (
    <div className="lg:col-span-5 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01] p-6 shadow-2xl">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#C9982B]/[0.02] blur-3xl" />
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#C9982B]/25 bg-[#C9982B]/5 text-lg font-bold text-[color:var(--gold-soft)] shadow-[0_0_20px_rgba(201,152,43,0.05)]">
            {userInitials}
          </div>

          <div>
            <h3 className="font-semibold text-lg text-foreground">{user.fullName}</h3>
            <span className="inline-flex items-center gap-1.5 mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] border border-white/5 bg-white/[0.02] text-muted-foreground">
              ID: {user.id.slice(0, 8)}...
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-4 border-t border-white/5 pt-6">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <UserIcon className="h-3.5 w-3.5 text-[color:var(--gold-soft)]/60" /> Email Address
            </span>
            <span className="text-xs font-mono text-foreground">{user.email}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-[color:var(--gold-soft)]/60" /> Organization Unit
            </span>
            <span className="text-xs font-semibold text-foreground">{user.organization || "Global Terminal"}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-[color:var(--gold-soft)]/60" /> Security Role Tier
            </span>
            <span className="text-xs font-mono font-semibold text-[color:var(--gold-soft)] bg-[#C9982B]/5 border border-[#C9982B]/20 rounded-md px-2 py-0.5 uppercase tracking-wide">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-white/[0.01] border border-white/5 p-4 text-xs text-muted-foreground">
        <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-[color:var(--gold-soft)] mt-0.5" />
        <span>These credentials correspond to your assigned level within the system. Modification of core identity parameters requires organization-tier privileges.</span>
      </div>
    </div>
  );
}