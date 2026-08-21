"use client";

import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

export function SecurityHero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-20">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[440px] w-[440px] -translate-x-1/2 rounded-full opacity-20 blur-[140px]"
        style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)" }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--gold-soft)]" />
          Security
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-display text-[34px] font-semibold leading-[1.15] tracking-tight text-foreground md:text-[48px]"
        >
          Your organization's memory deserves{" "}
          <span className="text-gold-gradient">real protection.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
          className="mx-auto mt-6 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground md:text-[17px]"
        >
          Every credential AIAN stores, every webhook it accepts, and every
          query it runs is scoped, verified, and isolated by design — not as
          an afterthought.
        </motion.p>
      </div>
    </section>
  );
}