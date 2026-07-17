import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { EyeStatus } from "../providers";

/**
 * The AI Eye — a futuristic sensor.
 * Iris responds to status. Scanline sweeps when connecting. Heartbeat when healthy.
 */
export function AnimatedEye({
  status = "connected",
  size = 140,
  glyph,
  className,
}: {
  status?: EyeStatus;
  size?: number;
  glyph?: any;
  className?: string;
}) {
  const stroke =
    status === "error"
      ? "var(--danger)"
      : status === "unhealthy"
        ? "#E8C86A"
        : status === "connecting"
          ? "var(--teal)"
          : status === "disconnected"
            ? "rgba(255,255,255,0.35)"
            : "var(--gold)";
  const irisColor =
    status === "error"
      ? "#ff6a6a"
      : status === "unhealthy"
        ? "#E8C86A"
        : status === "connecting"
          ? "#15C2A7"
          : status === "disconnected"
            ? "rgba(255,255,255,0.5)"
            : "#E8C86A";

  const isLive = status === "connected" || status === "unhealthy";
  const isScanning = status === "connecting";

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* halo */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${irisColor}55, transparent 70%)`,
        }}
        animate={{ opacity: isLive ? [0.4, 0.8, 0.4] : 0.3, scale: isLive ? [1, 1.08, 1] : 1 }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* orbit ring */}
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke={stroke}
          strokeOpacity="0.25"
          strokeWidth="0.4"
          strokeDasharray="2 4"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={stroke}
          strokeOpacity="0.35"
          strokeWidth="0.4"
          strokeDasharray="10 6"
        />
      </motion.svg>

      {/* eye */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`iris-${status}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={irisColor} stopOpacity="0.95" />
            <stop offset="55%" stopColor={irisColor} stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0b0d13" stopOpacity="0.95" />
          </radialGradient>
          <linearGradient id={`eye-frame-${status}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8C86A" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8A6416" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* outer eye lens */}
        <circle cx="50" cy="50" r="36" fill="#0b0d13" stroke={`url(#eye-frame-${status})`} strokeWidth="0.8" />
        {/* iris */}
        <motion.circle
          cx="50"
          cy="50"
          r="22"
          fill={`url(#iris-${status})`}
          animate={isLive ? { r: [22, 20.5, 22] } : { r: 22 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* pupil */}
        <circle cx="50" cy="50" r="7" fill="#05070c" />
        <circle cx="47" cy="47" r="2" fill="white" fillOpacity="0.85" />
        {/* iris ticks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x1 = 50 + Math.cos(angle) * 15;
          const y1 = 50 + Math.sin(angle) * 15;
          const x2 = 50 + Math.cos(angle) * 20;
          const y2 = 50 + Math.sin(angle) * 20;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={irisColor}
              strokeOpacity="0.5"
              strokeWidth="0.5"
            />
          );
        })}
      </svg>

      {/* scan sweep */}
      {isScanning && (
        <motion.div
          className="absolute inset-2 overflow-hidden rounded-full"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <motion.div
            className="absolute left-0 right-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${irisColor}, transparent)`,
            }}
            initial={{ top: "0%" }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}

      {/* glyph */}
      {glyph && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-display text-[13px] font-bold flex items-center justify-center"
            style={{ color: "rgba(255,255,255,0.75)", textShadow: "0 0 10px rgba(0,0,0,0.6)" }}
          >
            {typeof glyph === 'string' ? glyph : (() => { const Glyph = glyph; return <Glyph className="h-8 w-8" />; })()}
          </span>
        </div>
      )}
    </div>
  );
}
