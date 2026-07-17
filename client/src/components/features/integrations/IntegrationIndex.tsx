"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Search, Filter, Sparkles, Eye, Plug } from "lucide-react";
import { EyeCard } from "./components/EyeCard";
import { PROVIDER_LIST } from "./providers";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Communication", "Engineering", "Documents", "Meetings", "Delivery"];

export function IntegrationIndex() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = PROVIDER_LIST.filter(
    (p) =>
      (cat === "All" || p.category === cat) &&
      (q === "" || p.name.toLowerCase().includes(q.toLowerCase())),
  );

  const connected = PROVIDER_LIST.filter((p) => p.status === "connected" || p.status === "unhealthy");
  const totalHealth = Math.round(
    connected.reduce((acc, p) => acc + p.health, 0) / Math.max(connected.length, 1),
  );

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
            <Eye className="h-3 w-3" /> AI Eyes
          </div>
          <h1 className="font-display text-[30px] font-semibold tracking-tight md:text-[38px] text-foreground">
            Your organization's <span className="text-gold-gradient">senses</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
            Every connection is a living Eye — a real-time sensor that lets AIAN see, listen and
            understand a slice of your company. Connect an Eye to feed it knowledge.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Eyes online", value: connected.length },
            { label: "Health", value: `${totalHealth || 0}%` },
            { label: "Available", value: PROVIDER_LIST.length },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-3 text-center bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
              <div className="font-display text-[20px] font-semibold text-foreground">{s.value}</div>
              <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Eyes…"
            className="h-11 w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 pl-10 text-[14px] outline-none placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-soft)]/40 text-foreground"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                cat === c
                  ? "border-[color:var(--gold-soft)]/50 bg-black/[0.05] dark:bg-white/[0.06] text-foreground"
                  : "border-black/10 dark:border-white/10 bg-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Recommended banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass mb-6 flex items-center gap-4 overflow-hidden rounded-2xl p-4 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-gradient text-[#17130A]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-medium text-foreground">Recommended for Atlas Robotics</div>
          <div className="text-[12px] text-muted-foreground">
            Based on your team's tools we suggest connecting <b className="text-foreground">Google Drive</b> and <b className="text-foreground">Notion</b> next.
          </div>
        </div>
        <button className="btn-gold btn-gold-hover rounded-xl px-3.5 py-2 text-[12.5px] font-semibold text-[#17130A]">
          View suggestions
        </button>
      </motion.div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p, i) => (
          <EyeCard key={p.key} provider={p} index={i} />
        ))}
        {filtered.length === 0 && (
          <div className="glass col-span-full flex flex-col items-center justify-center rounded-2xl p-16 text-center">
            <Plug className="mb-3 h-8 w-8 text-muted-foreground" />
            <div className="font-display text-[16px] font-semibold text-foreground">No Eyes match</div>
            <div className="text-[12.5px] text-muted-foreground">Try a different filter or search term.</div>
          </div>
        )}
      </div>
    </div>
  );
}
