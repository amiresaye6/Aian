import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { AnimatedEye } from "./AnimatedEye";
import { StatusBadge } from "./StatusBadge";
import { EyeHealthRing } from "./EyeHealthRing";
import { cn } from "@/lib/utils";
import { formatAgo, type Provider } from "../providers";

export function EyeCard({ provider, index = 0 }: { provider: Provider; index?: number }) {
  const isConnected = provider.status === "connected" || provider.status === "unhealthy";
  const href = isConnected
    ? `/eyes/${provider.key}/details`
    : `/eyes/${provider.key}/connect`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
    >
      <Link
        href={href}
        className={cn(
          "group relative block overflow-hidden rounded-2xl border p-5 transition-all",
          "border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none",
          "hover:border-[color:var(--gold-soft)]/40 dark:hover:border-[color:var(--gold-soft)]/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.04]",
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60"
          style={{ background: `radial-gradient(circle, ${provider.brand}, transparent 70%)` }}
        />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <AnimatedEye status={provider.status} size={64} glyph={provider.glyph} />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display text-[16px] font-semibold tracking-tight text-foreground">{provider.name}</h4>
              </div>
              <div className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {provider.category}
              </div>
            </div>
          </div>
          {isConnected ? (
            <EyeHealthRing value={provider.health} size={56} label="" />
          ) : (
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
          )}
        </div>

        <p className="relative mt-4 line-clamp-2 text-[13px] text-muted-foreground">{provider.tagline}</p>

        <div className="relative mt-4 flex items-center justify-between">
          <StatusBadge status={provider.status} />
          <div className="text-right text-[11px] text-muted-foreground">
            {isConnected ? (
              <>
                <div className="font-medium text-foreground">
                  {provider.knowledgeItems.toLocaleString()} items
                </div>
                <div>Synced {formatAgo(provider.lastSyncMin)}</div>
              </>
            ) : provider.status === "connecting" ? (
              <div className="text-[color:var(--teal)]">Establishing link…</div>
            ) : (
              <div>Connect this Eye →</div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
