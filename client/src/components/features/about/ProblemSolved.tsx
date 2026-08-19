"use client";

import { motion } from "motion/react";
import { MessageSquareOff, UserX, Search } from "lucide-react";

const PROBLEMS = [
  {
    icon: MessageSquareOff,
    title: "Decisions vanish into threads",
    body: "Why a system was rebuilt or a vendor was dropped lives in a Slack thread from six months ago that nobody can find again.",
  },
  {
    icon: UserX,
    title: "Context leaves when people do",
    body: "A teammate leaves, and the reasoning behind half the tickets they closed leaves with them.",
  },
  {
    icon: Search,
    title: "Search finds words, not answers",
    body: "Keyword search returns a hundred messages that mention \"checkout\" — none of them explain what actually broke it.",
  },
];

export function ProblemSolved() {
  return (
    <section className="relative py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <h2 className="font-display text-[26px] font-semibold text-foreground md:text-[32px]">
            The problem we set out to fix
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
            Organizational knowledge is scattered across six tools by
            design. Understanding it shouldn't require six tabs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                <p.icon className="h-5 w-5 text-[color:var(--gold-soft)]" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {p.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}