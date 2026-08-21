"use client";

import { motion } from "motion/react";
import { Send, CheckCircle2, Search, MegaphoneOff } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Send,
    title: "Report",
    body: "Send us the details privately by email. Please avoid publicly disclosing the issue until we've had a chance to address it.",
  },
  {
    number: "02",
    icon: CheckCircle2,
    title: "Acknowledge",
    body: "We confirm we've received your report and begin an initial assessment of its scope and severity.",
  },
  {
    number: "03",
    icon: Search,
    title: "Investigate & fix",
    body: "We reproduce the issue, work on a fix, and keep you updated on progress as we go.",
  },
  {
    number: "04",
    icon: MegaphoneOff,
    title: "Disclose",
    body: "Once resolved, we coordinate with you on how and when to share details publicly, if at all.",
  },
];

export function ResponsibleDisclosure() {
  return (
    <section className="relative py-16 md:py-20">
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
            Responsible disclosure
          </div>
          <h2 className="font-display text-[26px] font-semibold text-foreground md:text-[32px]">
            Found something? Here's what happens next
          </h2>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-5 md:grid-cols-4">
          <div
            className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent md:block"
            aria-hidden
          />
          {STEPS.map((s, i) => (
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