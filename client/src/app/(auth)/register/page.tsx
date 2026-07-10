"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Github } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AuthField } from "@/components/features/auth/AuthFields";
import { authApi } from "@/api/auth";
import {
  AuthPrimaryButton,
  AuthSocialButton,
  AuthDivider,
  GoogleIcon,
} from "@/components/features/auth/AuthPrimitives";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agree) return;
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long");
      return;
    }
    if (password.toLowerCase() == password) {
      setErrorMsg("Password must contain at least one uppercase letter");
      return;
    }
    if (password.search(/[!@#$%^&*(),.?":{}|<>]/g) == -1) {
      setErrorMsg("Password must contain at least one special character");
      return;
    }
    if (!email.endsWith(".com") || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
    if (fullName.length < 4) {
      setErrorMsg("Full name must be at least 4 characters long");
      return;
    }
    
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await authApi.register({ fullName, email, password, confirmPassword });
      
      setSuccessMsg("Account created successfully! Redirecting to login page...");
      
      setTimeout(() => {
        router.push("/login");
      }, 3000);
      
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Registration failed. Try again.");
      setLoading(false); 
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1234/api/v1";
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <AuthLayout
      eyebrow="Get started"
      title={<>Build your <span className="text-gold-gradient">organizational brain</span></>}
      subtitle="Connect every source of knowledge in minutes. No credit card required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:text-[color:var(--gold-soft)]">
            Sign in
          </Link>
        </>
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

        <AuthField
          label="Username"
          placeholder="Add your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          icon={<User className="h-4 w-4" />}
          autoComplete="name"
          required
          disabled={!!successMsg}
        />
        <AuthField
          label="Work email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          required
          disabled={!!successMsg}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label="Password"
            type="password"
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
            required
            disabled={!!successMsg}
          />
          <AuthField
            label="Confirm"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
            required
            disabled={!!successMsg}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 pt-1 text-[13px] text-muted-foreground">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            disabled={!!successMsg}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-[color:var(--gold)]"
          />
          <span>
            I agree to the{" "}
            <a className="text-foreground hover:text-[color:var(--gold-soft)]" href="#">Terms</a> and{" "}
            <a className="text-foreground hover:text-[color:var(--gold-soft)]" href="#">Privacy Policy</a>.
          </span>
        </label>

        <div className="pt-2">
          <AuthPrimaryButton loading={loading || !!successMsg} disabled={!agree || !!successMsg}>
            {successMsg ? "Redirecting..." : "Create account"}
          </AuthPrimaryButton>
        </div>

        <AuthDivider />

        <div className="grid grid-cols-2 gap-3">
          <AuthSocialButton type="button" onClick={() => handleOAuth('google')} disabled={!!successMsg}>
            <GoogleIcon /> Google
          </AuthSocialButton>
          <AuthSocialButton type="button" onClick={() => handleOAuth('github')} disabled={!!successMsg}>
            <Github className="h-4 w-4 text-foreground" /> GitHub
          </AuthSocialButton>
        </div>
      </form>
    </AuthLayout>
  );
}