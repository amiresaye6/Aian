import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { EyeStatus } from "../providers";

export function StatusDot({ status }: { status: EyeStatus }) {
  const color =
    status === "connected"
      ? "var(--success)"
      : status === "connecting"
        ? "var(--teal)"
        : status === "unhealthy"
          ? "#E8C86A"
          : status === "error"
            ? "var(--danger)"
            : "rgba(255,255,255,0.35)";
  const isLive = status === "connected" || status === "connecting";
  return (
    <span className="relative inline-flex h-2 w-2">
      {isLive && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
          animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

const LABELS: Record<EyeStatus, string> = {
  connected: "Live",
  connecting: "Connecting",
  disconnected: "Not connected",
  unhealthy: "Attention",
  error: "Error",
};

export function StatusBadge({ status, className }: { status: EyeStatus; className?: string }) {
  const color =
    status === "connected"
      ? "text-[color:var(--success)]"
      : status === "connecting"
        ? "text-[color:var(--teal)]"
        : status === "unhealthy"
          ? "text-[color:var(--gold-soft)]"
          : status === "error"
            ? "text-[color:var(--danger)]"
            : "text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
        color,
        className,
      )}
    >
      <StatusDot status={status} />
      {LABELS[status]}
    </span>
  );
}
