"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Github } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AuthField } from "@/components/features/auth/AuthFields";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/auth/auth.store";
import { AuthResponse } from "@/types/user_and_auth";
import {
  AuthPrimaryButton,
  AuthSocialButton,
  AuthDivider,
  GoogleIcon,
} from "@/components/features/auth/AuthPrimitives";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await authApi.login({ email, password });
      
      loginStore(response.data.user, response.data.access_token, response.data.refresh_token);
      //console.log("Login successful:", response.data);
      router.push("/workspaces");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1234/api/v1";
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title={<>Sign in to your <span className="text-gold-gradient">organizational brain</span></>}
      subtitle="Access every meeting, message, doc and ticket — unified into one intelligent memory."
      footer={
        <>
          New to AIAN?{" "}
          <Link href="/register" className="font-medium text-foreground hover:text-[color:var(--gold-soft)]">
            Create an account
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
        <AuthField
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          autoComplete="current-password"
          required
        />
        
        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[color:var(--gold)]"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-[color:var(--gold-soft)]"
          >
            Forgot password?
          </Link>
        </div>

        <div className="pt-2">
          <AuthPrimaryButton loading={loading}>Sign in</AuthPrimaryButton>
        </div>

        <AuthDivider />

        <div className="grid grid-cols-2 gap-3">
          <AuthSocialButton type="button" onClick={() => handleOAuth('google')}>
            <GoogleIcon /> Google
          </AuthSocialButton>
          <AuthSocialButton type="button" onClick={() => handleOAuth('github')}>
            <Github className="h-4 w-4 text-foreground" /> GitHub
          </AuthSocialButton>
        </div>
      </form>
    </AuthLayout>
  );
}