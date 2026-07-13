"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CreditCard, Shield, Sparkles, Check, ArrowRight, Lock, Loader2 } from "lucide-react";
import { OnboardingLayout } from "@/layouts/OnboardingLayout";
import { useSubscriptionPlan } from "@/hooks/billing/useSubscriptionPlan";
import { useCheckout } from "@/hooks/billing/useCheckout";
import { BillingCycle } from "@/types/billing/billing";
import { useAuthStore } from "@/store/auth/auth.store";
import { toast } from "sonner";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planSlug = searchParams.get("plan") || "growth";
  const cycle = (searchParams.get("cycle") as BillingCycle) || "yearly";

  const { data: plan, isLoading } = useSubscriptionPlan(planSlug);
  const checkoutMutation = useCheckout();
  const user = useAuthStore((state) => state.user);

  // useEffect(() => {
  //   if (!user) {
  //     router.push("/login");
  //   }
  // }, [user, router]);

  const perSeatCents = cycle === "monthly" ? plan?.monthlyPriceCents : plan?.yearlyPriceCents;
  const totalCents = perSeatCents || 0;

  const handleCheckout = () => {
    // if (!user) {
    //   toast.error("You must be logged in to subscribe");
    //   return;
    // }
    console.log(user);

    // We send organizationId from the user object if available, otherwise a default for testing
    checkoutMutation.mutate({
      planSlug,
      billingCycle: cycle,
      organizationId: user!.organizationId,
      // || "dafccd4e-58a4-4886-af73-2ac0db62368e"
    }, {
      onSuccess: (data) => {
        // Redirect to Paymob unified checkout
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          toast.error("Failed to generate payment link");
        }
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || "Failed to initialize payment");
      }
    });
  };

  if (isLoading || !plan) {
    return (
      <OnboardingLayout eyebrow="Payment review" title="Loading..." subtitle="Please wait...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--gold-soft)]" />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      eyebrow="Payment review"
      title={<>Confirm your <span className="text-gold-gradient">{plan.name}</span> subscription</>}
      subtitle="Review your billing summary before activating your organizational memory."
      maxWidth="max-w-4xl"
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="glass relative overflow-hidden rounded-3xl p-7 lg:col-span-3"
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
            <Sparkles className="h-3.5 w-3.5" /> Selected plan
          </div>
          <h3 className="mt-2 font-display text-[26px] font-semibold">{plan.name} · {cycle === "yearly" ? "Yearly" : "Monthly"}</h3>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {plan.description || "Advanced AI reasoning, unlimited meetings, knowledge search, automations and priority support."}
          </p>

          <div className="mt-6 space-y-3">
            {[
              ...plan.features
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-[13.5px]">
                <Check className="h-4 w-4 text-[color:var(--gold-soft)]" /> {f}
              </div>
            ))}
          </div>

          {/* <div className="mt-8 rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-gold-gradient text-[11px] font-bold text-[#17130A]">
                SECURE
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold">Secure Checkout</div>
                <div className="text-[11.5px] text-muted-foreground">You will be redirected to complete payment</div>
              </div>
            </div>
          </div> */}

          <div className="mt-5 flex items-start gap-2 text-[12px] text-muted-foreground">
            <Shield className="mt-0.5 h-3.5 w-3.5 text-[color:var(--gold-soft)]" />
            <span>
              By confirming, you agree to AIAN's <a className="text-foreground underline underline-offset-2">Terms</a> and{" "}
              <a className="text-foreground underline underline-offset-2">DPA</a>. Cancel anytime.
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="glass-strong relative overflow-hidden rounded-3xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-7 lg:col-span-2"
        >
          <div
            className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, #E8C86A, transparent 70%)", opacity: 0.35 }}
          />
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" /> Order summary
          </div>
          <div className="mt-5 space-y-3 text-[13.5px]">
            <Row label="Plan" value={plan.name} />
            <Row label="Billing cycle" value={cycle === "yearly" ? "Yearly (20% off)" : "Monthly"} />
            <div className="my-3 h-px bg-black/10 dark:bg-white/10" />
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Total due today</span>
              <span className="font-display text-[28px] font-semibold text-gold-gradient">${(totalCents / 100).toLocaleString()}</span>
            </div>
            <div className="text-[11.5px] text-muted-foreground">Renews {cycle}. Prorated when you change plans.</div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkoutMutation.isPending}
            className="btn-gold btn-gold-hover group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Lock className="h-4 w-4" /> Continue to Payment
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
          <button
            onClick={() => router.push("/subscription")}
            className="mt-2 w-full rounded-2xl py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to plans
          </button>
        </motion.div>
      </div>
    </OnboardingLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
