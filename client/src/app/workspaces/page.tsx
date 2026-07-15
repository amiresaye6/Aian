/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { AianLogo } from "@/components/ui/Logo";
import { NeuralBackdrop } from "@/components/features/landing/NeuralBackdrop";
import { WorkspaceCard } from "@/components/features/workspace/WorkspaceCard"; 
import { CreateWorkspaceCard } from "@/components/features/workspace/CreateWorkspaceCard";
import { getOwnerDashboard } from "@/api/dashboard"; 

export default function WorkspacesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOwnerDashboard()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Failed to fetch data:", err);
        setData(null); 
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <NeuralBackdrop density={26} />
      </div>

      <header className="relative z-20 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <AianLogo />
        <Link href="/login" className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-20 md:px-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-display text-[38px] font-semibold leading-tight tracking-tight md:text-[46px]">
            Choose an <span className="text-gold-gradient">organizational brain</span>
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
  {data && (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <WorkspaceCard data={data} />
    </motion.div>
  )}

  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
    {data ? (
      <CreateWorkspaceCard disabled /> 
    ) : (
      !loading && <CreateWorkspaceCard />
    )}
  </motion.div>
</div>
      </main>
    </div>
  );
}