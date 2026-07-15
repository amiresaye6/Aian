/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Users, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";

export const WorkspaceCard = ({ data }: { data: any }) => {
  const router = useRouter();
  const planName = data.subscription?.planName || (data.subscription ? "Active plan" : "Free");
  return (
    <motion.div 
      whileHover={{ y: -8 }} 
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-3xl border border-white/10 bg-[#0B0D11] p-6 w-[350px]"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="h-12 w-12 rounded-xl bg-gold flex items-center justify-center overflow-hidden">
            <span className="font-bold text-lg text-black">{data.organization.name.charAt(0)}</span>
        </div>
        <span className="rounded-full border px-3 py-1 text-[11px] uppercase font-bold text-black bg-gold">
          {planName}
        </span>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white">{data.organization.name}</h3>
        <p className="text-sm text-muted-foreground">{data.organization.slug || "No slug"}</p>
      </div>

      <div className="border-t border-white/5 pt-4 text-xs text-muted-foreground flex items-center gap-2 mb-6">
        <Users className="h-3.5 w-3.5" /> {data.memberCount} members
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        <span className="text-sm text-foreground">Open workspace</span>
        <button 
          onClick={() => router.push("/dashboard")}
          className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center hover:border-gold transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
};