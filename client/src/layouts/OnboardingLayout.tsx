"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { AianLogo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NeuralBackdrop } from "@/components/features/landing/NeuralBackdrop";
import { cn } from "@/lib/utils";

const STEPS = [
  { path: "/onboarding/subscription", label: "Plan" },
  { path: "/onboarding/payment", label: "Payment" },
  { path: "/onboarding/create-organization", label: "Organization" },
  { path: "/onboarding/invite", label: "Members" },
  { path: "/onboarding/integrations", label: "Integrations" },
];

export function OnboardingLayout({
  eyebrow,
  title,
  subtitle,
  children,
  maxWidth = "max-w-5xl",
  showSteps = true,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  showSteps?: boolean;
}) {
  const pathname = usePathname();
  const currentIdx = STEPS.findIndex((s) => s.path === pathname);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <NeuralBackdrop density={22} />
      </div>
      <div
        className="pointer-events-none absolute -top-40 left-1/3 h-[520px] w-[520px] rounded-full opacity-30 blur-[140px]"
        style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)" }}
        aria-hidden
      />

      <header className="relative z-20 mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <Link href="/workspaces" className="transition-opacity hover:opacity-80">
          <AianLogo />
        </Link>
        {showSteps && currentIdx >= 0 && (
          <div className="hidden items-center gap-2 lg:flex">
            {STEPS.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s.path} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-all",
                      active
                        ? "border-[color:var(--gold-soft)]/60 bg-gold-gradient text-[#17130A] shadow-[0_0_20px_-4px_rgba(232,200,106,0.6)]"
                        : done
                          ? "border-[color:var(--gold-soft)]/40 bg-white/[0.04] text-[color:var(--gold-soft)]"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "text-[12px] font-medium tracking-wide",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && <div className="mx-1 h-px w-6 bg-white/10" />}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="hidden text-[13px] text-muted-foreground transition-colors hover:text-foreground md:inline"
          >
            Skip for now
          </Link>
        </div>
      </header>

      <main className={cn("relative z-10 mx-auto w-full px-6 pb-16 md:px-10", maxWidth)}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="mb-10 text-center"
        >
          {eyebrow && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-gradient" />
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-[34px] font-semibold leading-tight tracking-tight text-foreground md:text-[44px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
