"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Building2, ArrowRight } from "lucide-react";
import { OnboardingLayout } from "@/layouts/OnboardingLayout";
import { cn } from "@/lib/utils";
import { useSubscriptionPlans } from "@/hooks/billing/useSubscriptionPlans";
import { BillingCycle } from "@/types/billing/billing";
import { useAuthStore } from "@/store/auth/auth.store";

const ICONS: Record<string, any> = {
  zap: Zap,
  sparkles: Sparkles,
  "building-2": Building2,
};

export default function SubscriptionPage() {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const [selectedSlug, setSelectedSlug] = useState<string>("growth");
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  
  const { data: plans, isLoading } = useSubscriptionPlans();

  console.log(user);
  // useEffect(() => {
  //   if (!user) {
  //     router.push("/login");
  //   }
  // }, [user, router]);

  if (isLoading ) {
    return (
      <OnboardingLayout eyebrow="Subscription" title="Loading plans..." subtitle="Please wait...">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--gold-soft)] border-t-transparent"></div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      eyebrow="Subscription"
      title={<>Choose a plan for your <span className="text-gold-gradient">organizational memory</span></>}
      subtitle="Pick the tier that fits your company. You can upgrade or downgrade at any time."
    >
      <div className="mb-8 flex items-center justify-center">
        <div className="relative inline-flex items-center rounded-full border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-1">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={cn(
                "relative z-10 rounded-full px-5 py-1.5 text-[13px] font-medium capitalize transition-colors",
                cycle === c ? "text-[#17130A]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c === "yearly" ? "Yearly · save 20%" : c}
            </button>
          ))}
          <motion.div
            layout
            className="absolute inset-y-1 rounded-full bg-gold-gradient shadow-[0_6px_20px_-6px_rgba(201,152,43,0.5)]"
            style={{
              width: cycle === "yearly" ? "60%" : "40%",
              left: cycle === "yearly" ? "40%" : "0%",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {plans?.map((plan, i) => {
          const active = selectedSlug === plan.slug;
          const price = cycle === "monthly" ? plan.monthlyPriceCents / 100 : plan.yearlyPriceCents / 100;
          const Icon = ICONS[plan.iconName] || Zap;

          return (
            <motion.button
              key={plan.id}
              onClick={() => setSelectedSlug(plan.slug)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 * i }}
              whileHover={{ y: -3 }}
              className={cn(
                "group relative overflow-hidden rounded-3xl border p-6 text-left transition-all",
                active
                  ? "border-[color:var(--gold-soft)]/40 bg-gradient-to-b from-[color:var(--card)] to-[color:var(--surface)] ring-gold-glow"
                  : "border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:border-black/20 dark:hover:border-white/20"
              )}
            >
              {plan.highlighted && (
                <div className="absolute right-4 top-4 rounded-full bg-gold-gradient px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#17130A]">
                  Recommended
                </div>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    active ? "bg-gold-gradient text-[#17130A]" : "border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[color:var(--gold-soft)]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-[18px] font-semibold">{plan.name}</div>
                  <div className="text-[12px] text-muted-foreground">{plan.tagline}</div>
                </div>
              </div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-[42px] font-semibold tracking-tight">${price}</span>
                <span className="text-[13px] text-muted-foreground">/ mo</span>
              </div>
              <div className="text-[11.5px] uppercase tracking-[0.18em] text-muted-foreground">{plan.limits}</div>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-[13.5px] text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--gold-soft)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-4">
                <span className="text-[12px] text-muted-foreground">{active ? "Selected" : "Select this plan"}</span>
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                    active ? "border-[color:var(--gold-soft)] bg-gold-gradient" : "border-black/20 dark:border-white/20"
                  )}
                >
                  {active && <Check className="h-3 w-3 text-[#17130A]" />}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-10 flex items-center justify-end gap-3">
        <button
          onClick={() => router.push("/workspaces")}
          className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-5 py-3 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Back
        </button>
        <button
          onClick={() => router.push(`/payment?plan=${selectedSlug}&cycle=${cycle}`)}
          className="btn-gold btn-gold-hover group inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-[14px] font-semibold"
        >
          Continue to payment <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </OnboardingLayout>
  );
}
