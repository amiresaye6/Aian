"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth/index";
import { Input } from "@/components/ui/input";
import { ChangePasswordData } from "@/types/user_and_auth";
import { 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  EyeOff 
} from "lucide-react";

export default function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<boolean>(false);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const { mutate: changePassword, isPending, error } = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      setSuccessMessage(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setValidationError(null);
      setTimeout(() => setSuccessMessage(false), 5000);
    },
    onError: () => {
      setSuccessMessage(false);
    }
  });

  const serverErrorMessage = (() => {
    if (!error) return null;
    const responseData = (error as any)?.response?.data;
    if (Array.isArray(responseData?.message)) {
      return responseData.message.join(" | ");
    }
    return responseData?.message || (error as any)?.message || null;
  })();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (newPassword !== confirmNewPassword) {
      setValidationError("New passwords do not match. Please verify credentials.");
      return;
    }

    if (newPassword.length < 8) {
      setValidationError("New password security threshold not met (minimum 8 characters).");
      return;
    }

    changePassword({ oldPassword, newPassword, confirmNewPassword } as ChangePasswordData);
  };

  return (
    <div className="lg:col-span-7">
      <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 shadow-2xl space-y-6">
        <div>
          <h2 className="font-semibold text-md text-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[color:var(--gold-soft)]" /> Cryptographic Key Rotation
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Rotate your access password to lock out previous auth sessions.
          </p>
        </div>

        {validationError && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {serverErrorMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{serverErrorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 animate-in fade-in slide-in-from-top-1 duration-150">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Security key rotated successfully. Previous credentials have been invalidated.</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Current Master Password
            </label>
            <div className="relative">
              <Input
                type={showOldPassword ? "text" : "password"}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 pr-10 rounded-xl border-white/15 bg-white/[0.03] placeholder:text-muted-foreground/35 focus:border-white/30 focus:bg-white/[0.05] focus-visible:ring-[color:var(--gold-soft)]/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              New Operational Password
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 pr-10 rounded-xl border-white/15 bg-white/[0.03] placeholder:text-muted-foreground/35 focus:border-white/30 focus:bg-white/[0.05] focus-visible:ring-[color:var(--gold-soft)]/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Confirm Key Integrity
            </label>
            <div className="relative">
              <Input
                type={showConfirmNewPassword ? "text" : "password"}
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 pr-10 rounded-xl border-white/15 bg-white/[0.03] placeholder:text-muted-foreground/35 focus:border-white/30 focus:bg-white/[0.05] focus-visible:ring-[color:var(--gold-soft)]/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn-gold btn-gold-hover w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50 transition-all"
            >
              <ShieldCheck className="h-4 w-4" />
              {isPending ? "Updating Security Protocols..." : "Commit Key Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}