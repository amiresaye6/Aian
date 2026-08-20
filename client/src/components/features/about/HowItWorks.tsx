"use client";

import { motion } from "motion/react";
import { Database, Layers, Sparkles, MessageCircleQuestion } from "lucide-react";

const STAGES = [
  {
    number: "01",
    icon: Database,
    title: "Collect",
    body: "Every connected Eye listens continuously — a Slack message, a Jira update, a GitHub review, a Zoom transcript — and stores it as a permanent, unmodified record.",
  },
  {
    number: "02",
    icon: Layers,
    title: "Assemble",
    body: "Related events are grouped into meaningful units: dozens of messages become a Conversation, a pull request's commits and reviews become an Implementation Story.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Understand",
    body: "A single extraction pass reads the language once and pulls out entities, decisions, and action items — with a confidence score and a source for every fact.",
  },
  {
    number: "04",
    icon: MessageCircleQuestion,
    title: "Answer",
    body: "Ask a question in plain language. AIAN traverses the graph, gathers the connected evidence, and answers with citations back to what was actually said.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-gradient" />
            How AIAN works
          </div>
          <h2 className="font-display text-[26px] font-semibold text-foreground md:text-[32px]">
            From raw activity to grounded answers
          </h2>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-5 md:grid-cols-4">
          <div
            className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent md:block"
            aria-hidden
          />
          {STAGES.map((s, i) => (
            <motion.div
              key={s.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass relative rounded-2xl p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-[#17130A] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="font-display text-[13px] font-semibold tracking-[0.2em] text-muted-foreground">
                  {s.number}
                </span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}