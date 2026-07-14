"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth/auth.store";

export default function OAuthSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginStore = useAuthStore((state) => state.login);

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refresh_token");
    const userRaw = searchParams.get("user");

    if (token && refreshToken && userRaw) {
      try {
        const userData = JSON.parse(decodeURIComponent(userRaw));

        loginStore(userData, token, refreshToken);
        
        router.push("/workspaces");
      } catch (error) {
        console.error("Failed to parse OAuth user data", error);
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [searchParams, loginStore, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center text-gold-gradient bg-background">
      Connecting to your organizational brain...
    </div>
  );
}