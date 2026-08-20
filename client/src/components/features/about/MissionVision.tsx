"use client";

import { motion } from "motion/react";
import { BrainCircuit } from "lucide-react";

export function MissionVision() {
  return (
    <section className="relative py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="glass-strong relative overflow-hidden rounded-3xl p-8 md:p-12"
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-[100px]"
            style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)" }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5">
              <BrainCircuit className="h-6 w-6 text-[color:var(--gold-soft)]" />
            </div>
            <div>
              <h2 className="font-display text-[24px] font-semibold text-foreground md:text-[30px]">
                Our mission
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-[16px]">
                Give every organization a memory as connected as the people
                who work there. Not another dashboard to check, not another
                inbox to triage — a living graph of decisions, people, and
                systems that anyone can question and trust the answer to.
              </p>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-[16px]">
                Every answer AIAN gives traces back to the conversation, the
                ticket, or the pull request it came from. Nothing is
                invented — everything is evidence.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}