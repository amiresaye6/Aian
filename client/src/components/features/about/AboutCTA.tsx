"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function AboutCTA() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="glass-strong ring-gold-glow relative overflow-hidden rounded-3xl px-8 py-14 md:px-14"
        >
          <div
            className="pointer-events-none absolute -bottom-24 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
            style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)" }}
            aria-hidden
          />
          <h2 className="relative font-display text-[28px] font-semibold text-foreground md:text-[36px]">
            Give your organization a memory that never forgets.
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Connect your first tool in minutes and watch AIAN start building
            your knowledge graph automatically.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Link
              href="/register"
              className="btn-gold btn-gold-hover inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[14.5px] font-semibold"
            >
              Create your organization <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}