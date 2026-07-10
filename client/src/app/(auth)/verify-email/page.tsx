"use client";

import { useState, type FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, Mail, KeyRound } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AuthField } from "@/components/features/auth/AuthFields";
import { AuthPrimaryButton } from "@/components/features/auth/AuthPrimitives";
import { authApi } from "@/api/auth";
import { VerifyOtpResponse } from "@/types/user_and_auth";

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("you@company.com");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response:VerifyOtpResponse = await authApi.verifyOtp(email, otp);
      setSuccessMsg("OTP verified successfully! Redirecting...");
      
      setTimeout(() => {
        router.push(`/reset-password?token=${encodeURIComponent(response.data.resetToken)}`);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg(null);
    try {
      await authApi.forgotPassword(email);
      setResent(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to resend email.");
    }
  };

  return (
    <AuthLayout
      eyebrow="Almost there"
      title={<>Verify your <span className="text-gold-gradient">email address</span></>}
      subtitle="We sent a secure verification OTP code to your inbox. Enter it below to proceed."
      visualVariant="verify"
      footer={
        <Link href="/login" className="font-medium text-foreground hover:text-[color:var(--gold-soft)]">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        {errorMsg && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            {successMsg}
          </div>
        )}

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="relative mx-auto flex h-24 w-24 items-center justify-center"
        >
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-70"
            style={{ background: "radial-gradient(circle, #C9982B, transparent 70%)" }}
          />
          <div className="glass-strong relative flex h-full w-full items-center justify-center rounded-full ring-gold-glow">
            <CheckCircle2 className="h-10 w-10" style={{ color: "#E8C86A" }} strokeWidth={1.6} />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border border-[color:var(--gold-soft)]/40"
            animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
        </motion.div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <div className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
            <Mail className="h-4 w-4" style={{ color: "#E8C86A" }} />
            Sent to <span className="text-foreground">{email}</span>
          </div>
        </div>

        <AuthField
          label="Verification OTP Code"
          type="text"
          placeholder="Enter your OTP code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          icon={<KeyRound className="h-4 w-4" />}
          required
        />

        <AuthPrimaryButton loading={loading}>
          Verify OTP Code
        </AuthPrimaryButton>

        <div className="text-center text-[13px] text-muted-foreground">
          Didn't receive it?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resent}
            className="font-medium text-foreground transition-colors hover:text-[color:var(--gold-soft)] disabled:opacity-60"
          >
            {resent ? "Verification email resent" : "Resend email"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-center text-gold-gradient p-10">Loading verification...</div>}>
      <VerifyPageContent />
    </Suspense>
  );
}