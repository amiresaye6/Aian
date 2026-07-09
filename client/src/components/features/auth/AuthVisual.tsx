import { motion } from "motion/react";
import { Brain, Slack, Github, FileText, MessageSquare, Video, Cloud, CheckCircle2 } from "lucide-react";

interface Props {
  variant?: "graph" | "orbit" | "verify";
}


export function AuthVisual({ variant = "graph" }: Props) {
  return (
    <div className="relative aspect-square w-full max-w-[560px]">
      {/* Concentric orbits */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute h-[92%] w-[92%] rounded-full border border-white/[0.06]" />
        <div className="absolute h-[70%] w-[70%] rounded-full border border-white/[0.08]" />
        <div className="absolute h-[46%] w-[46%] rounded-full border border-white/[0.10]" />
        <motion.div
          className="absolute h-[92%] w-[92%] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(201,152,43,0.25) 40deg, transparent 90deg, transparent 360deg)",
            mask: "radial-gradient(circle, transparent 48%, black 49%, black 50%, transparent 51%)",
            WebkitMask:
              "radial-gradient(circle, transparent 48%, black 49%, black 50%, transparent 51%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute h-[70%] w-[70%] rounded-full"
          style={{
            background:
              "conic-gradient(from 180deg, transparent 0deg, rgba(21,194,167,0.22) 60deg, transparent 120deg, transparent 360deg)",
            mask: "radial-gradient(circle, transparent 48%, black 49%, black 50%, transparent 51%)",
            WebkitMask:
              "radial-gradient(circle, transparent 48%, black 49%, black 50%, transparent 51%)",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Core brain node */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative">
          <div
            className="absolute inset-0 -m-8 rounded-full opacity-70 blur-2xl"
            style={{ background: "radial-gradient(circle, #C9982B, transparent 70%)" }}
          />
          <div className="glass-strong relative flex h-28 w-28 items-center justify-center rounded-3xl ring-gold-glow">
            {variant === "verify" ? (
              <CheckCircle2 className="h-12 w-12 text-gold-gradient" strokeWidth={1.5} style={{ stroke: "url(#g)" }} />
            ) : (
              <Brain className="h-12 w-12" style={{ color: "#E8C86A" }} strokeWidth={1.4} />
            )}
          </div>
          <div className="mt-3 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {variant === "verify" ? "Verified" : "AIAN Core"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Source nodes */}
      {[
        { icon: Slack, label: "Slack", x: "12%", y: "18%", delay: 0 },
        { icon: Github, label: "GitHub", x: "82%", y: "14%", delay: 0.4 },
        { icon: FileText, label: "Docs", x: "6%", y: "62%", delay: 0.8 },
        { icon: Video, label: "Zoom", x: "84%", y: "68%", delay: 1.2 },
        { icon: MessageSquare, label: "Jira", x: "22%", y: "88%", delay: 1.6 },
        { icon: Cloud, label: "Drive", x: "70%", y: "90%", delay: 2.0 },
      ].map(({ icon: Icon, label, x, y, delay }) => (
        <motion.div
          key={label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: delay * 0.15 },
            scale: { duration: 0.6, delay: delay * 0.15 },
            y: { duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay },
          }}
        >
          <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
            <Icon className="h-4 w-4" style={{ color: "#E8C86A" }} />
            <span className="text-[11px] font-medium tracking-wide text-foreground/90">
              {label}
            </span>
          </div>
        </motion.div>
      ))}

      {/* Connecting lines */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8C86A" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#C9982B" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[
          [12, 18],
          [82, 14],
          [6, 62],
          [84, 68],
          [22, 88],
          [70, 90],
        ].map(([x, y], i) => (
          <motion.line
            key={i}
            x1={x}
            y1={y}
            x2="50"
            y2="50"
            stroke="url(#g)"
            strokeWidth="0.2"
            strokeDasharray="1 2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ duration: 1.6, delay: 0.2 + i * 0.15, ease: "easeOut" }}
          />
        ))}
      </svg>

      {/* Caption */}
      <div className="absolute -bottom-6 left-0 right-0 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-gradient" />
          Organizational Intelligence
        </div>
      </div>
    </div>
  );
}
