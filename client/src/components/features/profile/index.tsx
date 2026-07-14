"use client";

import { useAuthStore } from "@/store/auth/auth.store";
import { AppLayout } from "@/layouts/AppLayout"; 
import UserProfileCard from "./UserProfileCard";
import ChangePasswordForm from "./ChangePasswordForm";

export default function ProfileClient() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return (
      <AppLayout>
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-sm text-muted-foreground animate-pulse">
            Decrypting Identity Metrics...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-300">
        
        <div className="border-b border-white/5 pb-5">
          <h1 className="font-display font-bold text-2xl text-foreground">
            Operator Account Control
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your global identity parameters, security thresholds, and cryptographic keys.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <UserProfileCard />
          <ChangePasswordForm />
        </div>

      </div>
    </AppLayout>
  );
}