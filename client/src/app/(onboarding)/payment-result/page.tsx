"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, ArrowRight, Receipt, Loader2, Sparkles } from "lucide-react";
import { OnboardingLayout } from "@/layouts/OnboardingLayout";
import { billingApi } from "@/api/billing";
import { PaymentVerificationResult } from "@/types/billing/billing";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function PaymentResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [result, setResult] = useState<PaymentVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Paymob sends back a query param `merchant_order_id` which corresponds to our providerPaymentId
  const providerPaymentId = searchParams.get("merchant_order_id");

  useEffect(() => {
    async function verify() {
      if (!providerPaymentId) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await billingApi.verifyPayment(providerPaymentId);
        setResult(response.data);
      } catch (error) {
        console.error("Verification failed", error);
        toast.error("Failed to verify payment status");
      } finally {
        setIsLoading(false);
      }
    }
    verify();
  }, [providerPaymentId]);

  if (isLoading) {
    return (
      <OnboardingLayout eyebrow="Payment Status" title="Verifying your payment..." subtitle="Please wait while we confirm with Paymob.">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--gold-soft)]" />
        </div>
      </OnboardingLayout>
    );
  }

  if (!providerPaymentId || !result) {
    return (
      <OnboardingLayout eyebrow="Error" title="Payment not found" subtitle="We couldn't locate this transaction.">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <XCircle className="h-16 w-16 text-red-500/80" />
          <button onClick={() => router.push("/subscription")} className="text-sm text-muted-foreground hover:text-foreground">
            Return to plans
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  const isSuccess = result.status === "paid";
  const isPending = result.status === "pending";
  const isFailed = result.status === "failed";

  const StatusIcon = isSuccess ? CheckCircle2 : isPending ? Clock : XCircle;
  const statusColor = isSuccess ? "text-emerald-500" : isPending ? "text-amber-500" : "text-red-500";
  const statusBg = isSuccess ? "bg-emerald-500/10 border-emerald-500/20" : isPending ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

  return (
    <OnboardingLayout
      eyebrow="Transaction Result"
      title={<>Payment <span className={cn(isSuccess ? "text-emerald-500" : isPending ? "text-amber-500" : "text-red-500")}>
        {isSuccess ? "Successful" : isPending ? "Processing" : "Failed"}
      </span></>}
      subtitle={
        isSuccess
          ? "Your organizational memory is now active. Welcome aboard!"
          : isPending
            ? "Your payment is currently being processed by the provider."
            : "Unfortunately, your payment could not be processed. Please try again."
      }
      maxWidth="max-w-3xl"
    >
      {/* <div className="grid gap-6 "> */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="glass-strong relative overflow-hidden rounded-3xl p-7 lg:col-span-2"
        >
          {isSuccess && (
            <div
              className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, #10b981, transparent 70%)", opacity: 0.15 }}
            />
          )}

          <div className="flex flex-col items-center justify-center text-center">
            <div className={cn("flex h-20 w-20 items-center justify-center rounded-full border mb-6", statusBg)}>
              <StatusIcon className={cn("h-10 w-10", statusColor)} />
            </div>

            <h3 className="font-display text-[28px] font-semibold">
              ${(result.amountCents / 100).toLocaleString()} <span className="text-muted-foreground text-[18px]">/ {result.currency}</span>
            </h3>

            <div className="mt-8 w-full max-w-md space-y-4">
              <div className={theme.resolvedTheme === "dark" ? "rounded-2xl border border-white/5 bg-white/[0.02] p-6" : "rounded-2xl border border-black/5 bg-black/[0.02] p-6"}>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-4">
                  <Receipt className="h-3.5 w-3.5" /> Receipt details
                </div>

                <div className="space-y-3 text-[13.5px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-foreground">{providerPaymentId.split('-').pop()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-[color:var(--gold-soft)]" /> {result.planName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Billing Cycle</span>
                    <span className="capitalize text-foreground">{result.billingCycle}</span>
                  </div>
                  {isSuccess && result.paidAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Date</span>
                      <span className="text-foreground">
                        {new Date(result.paidAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex w-full max-w-md flex-col gap-3">
              {isSuccess ? (
                <button
                  onClick={() => router.push("/organization")}
                  className="btn-gold btn-gold-hover group inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14.5px] font-semibold"
                >
                  Continue to Organization <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <button
                  onClick={() => router.push("/subscription")}
                  className="btn-gold btn-gold-hover group inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14.5px] font-semibold"
                >
                  Try Again <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      {/* </div> */}
    </OnboardingLayout>
  );
}
