"use client";

import { useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";

export function AskAianBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      router.push(`/dashboard/chat?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-8">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-40 blur-[100px]"
        style={{ background: "radial-gradient(circle, #E8C86A, transparent 70%)" }}
      />
      <div className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
          <Sparkles className="h-3 w-3" /> AI Portal Active
        </div>
        <h2 className="font-display text-[28px] font-semibold leading-tight tracking-tight md:text-[36px]">
          Talk to <span className="text-gold-gradient">AIAN</span>
        </h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
          Ask questions to search your organization's integrated knowledge graph.
        </p>
        <div className="relative mt-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to know?"
            className="h-14 w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] pl-5 pr-14 text-[15px] outline-none placeholder:text-muted-foreground/40 focus:border-yellow-600/50 focus:ring-1 focus:ring-yellow-600/50 transition-all"
          />
          <button
            onClick={handleSubmit}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-black/[0.05] dark:bg-white/[0.08] text-foreground hover:bg-black/[0.1] dark:hover:bg-white/[0.15] transition-colors"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}