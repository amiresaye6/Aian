"use client";

import { motion } from "motion/react";
import { Sparkles, ArrowRight } from "lucide-react";
import { AnimatedEye } from "./components/AnimatedEye";
import { getProvider } from "./providers";
import Link from "next/link";

export function IntegrationSuccess({ providerKey }: { providerKey: string }) {
  const provider = getProvider(providerKey);

  return (
    <div className="w-full">
      <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center overflow-hidden text-center">
        {/* burst */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.6, 1.2], opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at center, rgba(232,200,106,0.35), transparent 55%)",
          }}
        />
        {/* orbit rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute rounded-full border border-[color:var(--gold-soft)]/25"
            style={{ width: 260 + i * 80, height: 260 + i * 80, top: 60 - i * 20 }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: [0, 0.6, 0.2] }}
            transition={{ duration: 1.4 + i * 0.4, delay: i * 0.15 }}
          />
        ))}

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
        >
          <AnimatedEye status="connected" size={200} glyph={provider.glyph} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--gold-soft)]"
        >
          <Sparkles className="h-3 w-3" /> Eye awakened
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 font-display text-[30px] font-semibold tracking-tight md:text-[42px] text-foreground"
        >
          {provider.name} is now <span className="text-gold-gradient">seeing</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-3 max-w-lg text-[14px] text-muted-foreground"
        >
          AIAN has established a live link with your {provider.name} workspace. Next, choose which
          resources this Eye should focus on.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href={`/eyes/${providerKey}/resources`}
            className="btn-gold btn-gold-hover inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-[#17130A]"
          >
            Select resources <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/eyes"
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
            Configure later
          </Link>
        </motion.div>

        {/* stats reveal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="glass mt-10 grid w-full max-w-lg grid-cols-3 gap-3 rounded-2xl p-4 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10"
        >
          {[
            { label: "Detected", value: `${provider.sampleResources.length * 12}` },
            { label: resourceUnit(provider.resourceLabel), value: `${provider.sampleResources.length}+` },
            { label: "Members", value: `${sumMembers(provider.sampleResources)}` },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-[20px] font-semibold text-foreground">{s.value}</div>
              <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function resourceUnit(label: string) {
  return label;
}
function sumMembers(list: { members?: number }[]) {
  return list.reduce((a, b) => a + (b.members ?? 0), 0);
}
