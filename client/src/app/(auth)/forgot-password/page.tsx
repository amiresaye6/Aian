"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AuthField } from "@/components/features/auth/AuthFields";
import { authApi } from "@/api/auth";
import { AuthPrimaryButton } from "@/components/features/auth/AuthPrimitives";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Password recovery"
      title={<>Reset your <span className="text-gold-gradient">access</span></>}
      subtitle="Enter your work email and we'll send you a secure link to reset your password."
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-[color:var(--gold-soft)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      }
    >
      {errorMsg && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      {sent ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ring-gold-glow">
            <Mail className="h-5 w-5" style={{ color: "#E8C86A" }} />
          </div>
          <h3 className="text-base font-semibold text-foreground">Check your inbox</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            If an account exists, a reset link is on its way to <span className="text-foreground font-medium">{email}</span>.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <AuthPrimaryButton onClick={() => router.push(`/verify-email?email=${encodeURIComponent(email)}`)}>
              Enter OTP Code
            </AuthPrimaryButton>
            <button
              onClick={() => setSent(false)}
              className="text-[13px] font-medium text-muted-foreground hover:text-[color:var(--gold-soft)]"
            >
              Use a different email
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <AuthField
            label="Work email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            required
          />
          <div className="pt-2">
            <AuthPrimaryButton loading={loading}>Send reset link</AuthPrimaryButton>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}