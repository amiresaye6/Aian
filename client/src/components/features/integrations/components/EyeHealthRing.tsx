import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Animated ring showing overall Eye health (0-100).
 */
export function EyeHealthRing({
  value,
  size = 88,
  label = "Health",
  className,
}: {
  value: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const stroke = 6;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const tone =
    value >= 85
      ? { color: "#E8C86A", glow: "rgba(232,200,106,0.45)" }
      : value >= 60
        ? { color: "#15C2A7", glow: "rgba(21,194,167,0.4)" }
        : { color: "#ff6a6a", glow: "rgba(255,106,106,0.4)" };

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${tone.glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-[20px] font-semibold leading-none" style={{ color: tone.color }}>
          {value}
        </div>
        <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
