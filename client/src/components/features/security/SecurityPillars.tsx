"use client";

import { motion } from "motion/react";
import { Lock, KeyRound, Webhook, Building2 } from "lucide-react";

const PILLARS = [
  {
    icon: Lock,
    title: "Encrypted credentials at rest",
    body: "Every access and refresh token AIAN stores for Slack, GitHub, Jira, and Zoom is encrypted before it ever touches the database — never saved as plain text.",
  },
  {
    icon: KeyRound,
    title: "Role-based access control",
    body: "Every backend request is checked three times: is the user authenticated, do they belong to the organization, and do they hold the specific permission the action requires.",
  },
  {
    icon: Webhook,
    title: "Verified webhooks",
    body: "Incoming webhooks from every connected provider are validated against their cryptographic signature before AIAN accepts a single byte of payload.",
  },
  {
    icon: Building2,
    title: "Isolated by organization",
    body: "Every query is scoped to a single organization at the database layer. One organization's knowledge graph is never reachable from another's session.",
  },
];

export function SecurityPillars() {
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
            What's actually protecting your data
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
            No vague promises — these are the mechanisms built into AIAN
            today.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass flex gap-4 rounded-2xl p-6"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5">
                <p.icon className="h-5 w-5 text-[color:var(--gold-soft)]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">
                  {p.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}