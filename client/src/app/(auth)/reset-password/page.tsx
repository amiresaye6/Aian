"use client";

import { useState, useMemo, type FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Lock, Check, X } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AuthField } from "@/components/features/auth/AuthFields";
import { AuthPrimaryButton } from "@/components/features/auth/AuthPrimitives";
import { authApi } from "@/api/auth";

function ResetPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setResetToken(tokenParam);
    }
  }, [searchParams]);

  const checks = useMemo(
    () => [
      { label: "At least 8 characters", ok: pw.length >= 8 },
      { label: "Contains a number", ok: /\d/.test(pw) },
      { label: "Upper & lowercase letters", ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
      { label: "One special character", ok: /[^A-Za-z0-9]/.test(pw) },
    ],
    [pw],
  );
  
  const score = checks.filter((c) => c.ok).length;
  const strengthLabel = ["Too weak", "Weak", "Fair", "Strong", "Excellent"][score];
  const strengthColor = ["#65718040", "#EF4444", "#F59E0B", "#E8C86A", "#15C2A7"][score];

  const matches = confirm.length > 0 && pw === confirm;
  const canSubmit = score >= 3 && matches && resetToken;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await authApi.resetPassword({
        resetToken,
        newPassword: pw,
        confirmNewPassword: confirm,
      });

      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to reset password. Token might be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="New password"
      title={<>Choose a <span className="text-gold-gradient">strong password</span></>}
      subtitle="Protect your organizational memory with a password only you know."
      footer={
        <Link href="/login" className="font-medium text-foreground hover:text-[color:var(--gold-soft)]">
          Return to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400 font-medium animate-pulse">
            {successMsg}
          </div>
        )}

        {!resetToken && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-400">
            Warning: Reset token missing. Please follow the link from your email or verification screen.
          </div>
        )}

        <AuthField
          label="New password"
          type="password"
          placeholder="Create new password"
          icon={<Lock className="h-4 w-4" />}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          required
          disabled={!!successMsg}
        />

        {/* Strength bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>Strength</span>
            <span style={{ color: score >= 3 ? "#E8C86A" : undefined }}>{strengthLabel}</span>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 flex-1 rounded-full bg-white/5"
                animate={{
                  backgroundColor: i < score ? strengthColor : "rgba(255,255,255,0.05)",
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>

        <AuthField
          label="Confirm password"
          type="password"
          placeholder="Repeat new password"
          icon={<Lock className="h-4 w-4" />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          disabled={!!successMsg}
          hint={
            confirm.length > 0 && !matches ? (
              <span className="text-[color:var(--danger)] text-xs text-red-400">Passwords don't match</span>
            ) : null
          }
        />

        <ul className="space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-[13px]">
              <span
                className={
                  "flex h-4 w-4 items-center justify-center rounded-full transition-colors " +
                  (c.ok ? "bg-[color:var(--gold)]/20 text-[color:var(--gold-soft)]" : "bg-white/5 text-muted-foreground")
                }
              >
                {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-60" />}
              </span>
              <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
            </li>
          ))}
        </ul>

        <div className="pt-2">
          <AuthPrimaryButton loading={loading} disabled={!canSubmit || !!successMsg}>
            {successMsg ? "Redirecting..." : "Reset password"}
          </AuthPrimaryButton>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="text-center text-gold-gradient p-10">Loading reset form...</div>}>
      <ResetPageContent />
    </Suspense>
  );
}