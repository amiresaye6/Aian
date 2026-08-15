"use client";

import { motion } from "motion/react";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { AnimatedEye } from "./components/AnimatedEye";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent({ providerKey }: { providerKey: string }) {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error") || "unknown_error";
  
  const errorMessage = errorParam
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const providerName = providerKey.charAt(0).toUpperCase() + providerKey.slice(1);

  return (
    <div className="w-full">
      <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center overflow-hidden text-center">
        {/* burst */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.6, 1.2], opacity: [0, 0.4, 0] }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,106,106,0.25), transparent 55%)",
          }}
        />
        
        {/* orbit rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute rounded-full border border-destructive/20"
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
          <AnimatedEye status="error" size={200} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-destructive"
        >
          <AlertCircle className="h-3 w-3" /> Connection Failed
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 font-display text-[30px] font-semibold tracking-tight md:text-[42px] text-foreground"
        >
          Failed to connect <span className="text-destructive">{providerName}</span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-3 max-w-lg text-[14px] text-muted-foreground"
        >
          We couldn't establish a link with {providerName}. The integration process was interrupted or the authorization was denied.
          <br /><br />
          <span className="font-medium text-foreground/80">Reason: {errorMessage}</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href={`/eyes/${providerKey}/connect`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </Link>
          <Link
            href="/eyes"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-background px-6 text-[14px] font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Integrations
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export function IntegrationError({ providerKey }: { providerKey: string }) {
  return (
    <Suspense fallback={
      <div className="w-full">
        <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center overflow-hidden text-center" />
      </div>
    }>
      <ErrorContent providerKey={providerKey} />
    </Suspense>
  );
}
