"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { ShieldCheck, Lock, ArrowRight, ExternalLink, Check } from "lucide-react";
import { ProviderHero } from "./components/ProviderHero";
import { getProvider } from "./providers";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function IntegrationConnect({ providerKey }: { providerKey: string }) {
  const provider = getProvider(providerKey);
  const [accepted, setAccepted] = useState(false);
  const router = useRouter();

  return (
    <div className="w-full">
      <ProviderHero provider={provider} step="Connect" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: permissions */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[color:var(--gold-soft)]" />
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                What this Eye will see
              </h3>
            </div>
            <p className="mb-5 text-[13px] text-muted-foreground">
              AIAN requests <b className="text-foreground">read-only</b> access. We never post, edit
              or delete anything in your {provider.name} workspace.
            </p>
            <ol className="relative space-y-4 border-l border-black/10 dark:border-white/10 pl-6">
              {provider.permissions.map((p, i) => (
                <motion.li
                  key={p.title}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="relative"
                >
                  <span className="absolute -left-[29px] flex h-5 w-5 items-center justify-center rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#0B0D11] text-[10px] font-bold text-[color:var(--gold-soft)]">
                    {i + 1}
                  </span>
                  <div className="text-[13.5px] font-medium text-foreground">{p.title}</div>
                  <div className="text-[12px] text-muted-foreground">{p.description}</div>
                </motion.li>
              ))}
            </ol>
          </div>

          <div className="glass rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <div className="mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[color:var(--gold-soft)]" />
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">Security & privacy</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: "SOC 2 Type II", desc: "Independently audited controls." },
                { title: "End-to-end encryption", desc: "TLS 1.3 in transit, AES-256 at rest." },
                { title: "Revoke anytime", desc: "Disconnect this Eye in one click." },
                { title: "Zero training", desc: "Your data is never used to train models." },
              ].map((s) => (
                <div key={s.title} className="rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-3">
                  <div className="mb-1 flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <Check className="h-3.5 w-3.5 text-[color:var(--success)]" /> {s.title}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: action panel */}
        <div className="space-y-4">
          <div className="glass-strong rounded-2xl p-6 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Workspace
            </div>
            <div className="mt-1 truncate font-display text-[15px] font-semibold text-foreground">
              {provider.workspace || `${provider.name} Workspace`}
            </div>

            <div className="my-5 h-px bg-black/10 dark:bg-white/10" />

            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Scopes requested
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {provider.scopes.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2 py-1 font-mono text-[10.5px] text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-3">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[color:var(--gold)]"
              />
              <span className="text-[12px] leading-snug text-muted-foreground">
                I authorize AIAN to open this Eye and understand the{" "}
                <span className="text-foreground underline decoration-black/30 dark:decoration-white/30 underline-offset-2">
                  data processing terms
                </span>
                .
              </span>
            </label>

            <button
              disabled={!accepted}
              onClick={() => router.push(`/eyes/${providerKey}/redirect`)}
              className="btn-gold btn-gold-hover mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:transform-none text-[#17130A]"
            >
              <ExternalLink className="h-4 w-4" />
              Continue to {provider.name}
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/eyes"
              className="mt-2 block text-center text-[12px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Link>
          </div>

          <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-4 text-[12px] text-muted-foreground">
            You'll be redirected to <b className="text-foreground">{provider.name}</b> to authorize
            access, then returned to AIAN automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
