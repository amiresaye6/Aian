"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useState } from "react";
import { ArrowRight, Plus, Users, Sparkles, Building2, Search, LogOut } from "lucide-react";
import { AianLogo } from "@/components/ui/Logo";
import { NeuralBackdrop } from "@/components/features/landing/NeuralBackdrop";
import { cn } from "@/lib/utils";

const ORGS: {
  name: string;
  industry: string;
  members: number;
  plan: string;
  lastActive: string;
  accent: string;
}[] = [];

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    Enterprise: "bg-gold-gradient text-[#17130A]",
    Growth: "bg-[color:var(--teal)]/20 text-[color:var(--teal)] border border-[color:var(--teal)]/30",
    Starter: "bg-white/[0.06] text-muted-foreground border border-white/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.16em]",
        styles[plan],
      )}
    >
      {plan}
    </span>
  );
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const filtered = ORGS.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <NeuralBackdrop density={26} />
      </div>
      <div
        className="pointer-events-none absolute -top-40 -right-40 h-[560px] w-[560px] rounded-full opacity-30 blur-[140px]"
        style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)" }}
      />

      <header className="relative z-20 mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <AianLogo />
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-20 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="mb-10"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-gradient" /> Welcome back
          </div>
          <h1 className="font-display text-[38px] font-semibold leading-tight tracking-tight md:text-[46px]">
            Choose an <span className="text-gold-gradient">organizational brain</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Open a workspace to enter its memory, or spin up a new one to unify a new company&apos;s knowledge.
          </p>
        </motion.div>

        {ORGS.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workspaces…"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-[14px] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-soft)]/40 focus:bg-white/[0.05]"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((org, i) => (
            <motion.button
              key={org.name}
              onClick={() => router.push("/dashboard")}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.2, 0.8, 0.2, 1] }}
              whileHover={{ y: -3 }}
              className="group glass relative overflow-hidden rounded-3xl p-6 text-left transition-all hover:border-white/20"
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
                style={{ background: "radial-gradient(circle, #E8C86A, transparent 70%)" }}
              />
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-[22px] font-bold text-[#17130A] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
                    org.accent,
                  )}
                >
                  {org.name.charAt(0)}
                </div>
                <PlanBadge plan={org.plan} />
              </div>
              <div className="mt-5">
                <h3 className="font-display text-[20px] font-semibold tracking-tight text-foreground">
                  {org.name}
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{org.industry}</p>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {org.members} members
                </span>
                <span>{org.lastActive}</span>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Open workspace</span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition-all group-hover:border-[color:var(--gold-soft)]/50 group-hover:bg-white/[0.06]">
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </motion.button>
          ))}

          <motion.button
            onClick={() => router.push("/subscription")}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 * filtered.length, ease: [0.2, 0.8, 0.2, 1] }}
            whileHover={{ y: -3 }}
            className="group relative overflow-hidden rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-left transition-all hover:border-[color:var(--gold-soft)]/40 hover:bg-white/[0.04]"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(201,152,43,0.14), transparent 70%)" }}
            />
            <div className="relative flex h-full flex-col items-start justify-between">
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[color:var(--gold-soft)]">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-[20px] font-semibold tracking-tight text-foreground">
                  Create a new organization
                </h3>
                <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
                  Unify a new company&apos;s meetings, docs, tickets and repos into one intelligent memory.
                </p>
              </div>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-[12px] font-semibold text-[#17130A] shadow-[0_10px_30px_-12px_rgba(201,152,43,0.55)]">
                <Sparkles className="h-3.5 w-3.5" /> Start onboarding
              </div>
            </div>
          </motion.button>
        </div>

        {ORGS.length > 0 && filtered.length === 0 && (
          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg font-semibold">No matching workspaces</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search — or create a new organization.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}