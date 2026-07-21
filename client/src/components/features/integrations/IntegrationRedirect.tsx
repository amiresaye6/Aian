"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { AnimatedEye } from "./components/AnimatedEye";
import { useIntegrationsStore } from "@/store/integrations/integrations.store";
import { useRouter } from "next/navigation";

const STAGES = [
  "Opening secure channel with provider",
  "Waiting for authorization",
  "Receiving access token",
  "Verifying with AIAN Core",
  "Awakening the Eye",
];

export function IntegrationRedirect({ providerKey }: { providerKey: string }) {
  const providers = useIntegrationsStore(state => state.providers);
  const fetchIntegrations = useIntegrationsStore(state => state.fetchIntegrations);
  const provider = providers.find(p => p.key.toLowerCase() === providerKey.toLowerCase());
  
  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);
  const router = useRouter();
  const [stage, setStage] = useState(0);


  useEffect(() => {
    if (providerKey === "github") return; 
    if (providerKey === "zoom") {
      const t = setTimeout(
        () => router.push(`/eyes`),
        400,
      );
      return () => clearTimeout(t);
    }

    if (!provider) return; // Wait until provider is loaded
    
    if (stage >= STAGES.length) {
      const t = setTimeout(
        () => router.push(`/eyes/${providerKey}/success`),
        400,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStage((s) => s + 1), 900 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [stage, providerKey, router, provider]);


  if (!provider) {
    return (
      <div className="flex h-[40vh] w-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--gold)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <AnimatedEye status="connecting" size={180} glyph={provider.glyph} />
        </div>

        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--teal)]">
          <Shield className="h-3 w-3" /> Authorizing
        </div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight md:text-[36px] text-foreground">
          Connecting to <span className="text-gold-gradient">{provider.name}</span>
        </h1>
        <p className="mt-2 max-w-md text-[13.5px] text-muted-foreground">
          Complete the sign-in with {provider.name} in the popup window. AIAN will finish awakening the
          Eye automatically.
        </p>

        <div className="mt-8 w-full max-w-md space-y-2 text-left">
          {STAGES.map((s, i) => {
            const done = stage > i;
            const active = stage === i;
            return (
              <motion.div
                key={s}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 rounded-xl border p-3 text-[12.5px] transition-all ${
                  active
                    ? "border-[color:var(--teal)]/40 bg-black/[0.04] dark:bg-white/[0.04] text-foreground"
                    : done
                      ? "border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-muted-foreground"
                      : "border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] text-muted-foreground/60"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#0B0D11]">
                  {done ? (
                    <motion.svg
                      viewBox="0 0 12 12"
                      className="h-3 w-3"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                    >
                      <motion.path
                        d="M2 6.5L5 9.5L10 3"
                        stroke="var(--success)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </motion.svg>
                  ) : active ? (
                    <Loader2 className="h-3 w-3 animate-spin text-[color:var(--teal)]" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20" />
                  )}
                </span>
                <span className={active ? "font-medium text-foreground" : ""}>{s}</span>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-[11.5px] text-muted-foreground">
          Taking too long?{" "}
          <button
            onClick={() => router.push(`/eyes/${providerKey}/connect`)}
            className="text-foreground underline decoration-black/30 dark:decoration-white/30 underline-offset-2 hover:text-foreground/80"
          >
            Cancel and try again
          </button>
        </div>
      </div>
    </div>
  );
}
