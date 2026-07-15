"use client";

import { Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
export const CreateWorkspaceCard = ({ disabled = false }: { disabled?: boolean }) => {
  const router = useRouter();
  return (
    <div
      className={cn(
        "rounded-3xl border border-dashed p-6 w-[350px] transition-all flex flex-col justify-between",
        "border-white/15 bg-white/[0.02]", 
        disabled ? "opacity-60" : "hover:border-[color:var(--gold-soft)]/40 hover:bg-white/[0.04]"
      )}
    >
      <div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[color:var(--gold-soft)] mb-5">
          <Plus className="h-6 w-6" />
        </div>

        <div className="mb-8">
          <h3 className="font-display text-[20px] font-semibold text-foreground">
            {disabled ? "Organization already exists" : "Create a new organization"}
          </h3>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            {disabled 
              ? "You already have an active workspace.             To create another one, Sign Up with a different email." 
              : "Unify a new company's meetings, docs, tickets and repos into one intelligent memory."}
          </p>
        </div>
      </div>

      <button 
  type="button"
  onClick={() => !disabled && router.push("/subscription")}
  className={cn(
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold shadow-[0_10px_30px_-12px_rgba(201,152,43,0.55)] w-fit transition-all",
    disabled 
      ? "bg-white/10 text-white/30 cursor-not-allowed" // شلنا pointer-events-none عشان يظهر شكل الممنوع
      : "bg-gold-gradient text-[#17130A] hover:scale-105 cursor-pointer"
  )}
>
  <Sparkles className="h-3.5 w-3.5" /> Start onboarding
</button>
    </div>
  );
};