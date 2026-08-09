"use client";

import { useRouter } from "next/navigation";
import { AuthLayout } from "@/layouts/AuthLayout";
import ChangePasswordForm from "@/components/features/profile/ChangePasswordForm";

export default function ForcePasswordChangePage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/dashboard");
  };

  return (
    <AuthLayout
      eyebrow="Secure your account"
      title={
        <>
          Set your <span className="text-gold-gradient">new password</span>
        </>
      }
      subtitle="You logged in with a temporary password. For your security, we recommend setting a new one now."
    >
      <div className="max-w-md mx-auto">
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-[color:var(--gold-soft)]"
          >
            Skip for now
          </button>
        </div>
        <ChangePasswordForm onSuccess={handleSuccess} />
      </div>
    </AuthLayout>
  );
}