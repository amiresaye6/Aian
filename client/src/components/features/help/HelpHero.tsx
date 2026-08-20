"use client";

import { Search, LifeBuoy, X } from "lucide-react";

interface HelpHeroProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function HelpHero({ search, onSearchChange }: HelpHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 glass-strong p-8 text-center md:p-12">
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
        style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)" }}
        aria-hidden
      />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <LifeBuoy className="h-6 w-6 text-[color:var(--gold-soft)]" />
        </div>
        <h1 className="font-display text-[30px] font-semibold tracking-tight text-foreground md:text-[38px]">
          How can we <span className="text-gold-gradient">help</span>?
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[14.5px] text-muted-foreground">
          Search our knowledge base or browse categories below to get the most out of AIAN.
        </p>

        <div className="relative mx-auto mt-7 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for answers…"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-11 text-[14px] text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-soft)]/40 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(232,200,106,0.08)]"
          />
          {search.length > 0 && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}