"use client";

import { motion, useScroll, useTransform, useSpring, useInView } from "motion/react";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight,
  Sparkles,
  Search,
  MessageSquare,
  Github,
  Slack,
  Video,
  FileText,
  Cloud,
  Users,
  Mail,
  Layers,
  Shield,
  Gauge,
  Network,
  Brain,
  BookOpen,
  ScanEye,
  GitBranch,
  Workflow,
  Boxes,
  BarChart3,
  Check,
  Play,
  Bot,
  Lock,
  Zap,
  Command,
  Fingerprint,
  LineChart,
  ClipboardList,
  Building2,
  Quote,
} from "lucide-react";
import { AianMark, AianLogo } from "../../ui/Logo";
import { NeuralBackdrop } from "./NeuralBackdrop";
import { useTheme } from "next-themes";


/* ---------------- Section shell ---------------- */

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
      <span className="h-1 w-1 rounded-full bg-[color:var(--color-gold-soft)]" />
      {children}
    </div>
  );
}

function SectionHead({
  tag,
  title,
  desc,
  align = "center",
}: {
  tag: string;
  title: React.ReactNode;
  desc?: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={
        (align === "center" ? "mx-auto max-w-3xl text-center " : "max-w-2xl ") + "space-y-4"
      }
    >
      <SectionTag>{tag}</SectionTag>
      <h2 className="text-balance text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {desc && (
        <p className="text-pretty text-base text-muted-foreground md:text-lg">{desc}</p>
      )}
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.9, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Hero ---------------- */

export function Hero() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-40 pb-24 md:pt-52 md:pb-32">
      {/* backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <NeuralBackdrop />
        <div className="absolute left-1/2 top-0 h-[80vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,152,43,0.18),transparent_70%)]" />
        <div className="absolute -bottom-40 left-1/2 h-[50vh] w-[100vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(21,194,167,0.08),transparent_70%)]" />
      </div>

      <motion.div style={{ y, opacity }} className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-gold-soft)]" />
              Introducing AIAN · Organizational Intelligence, live
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl md:text-7xl">
              Your Company's <span className="text-gold-gradient">Brain.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
              AIAN transforms every meeting, message, document, ticket and repository into one
              intelligent organizational memory your team can search, understand and grow from.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#cta"
                className="btn-gold btn-gold-hover inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
              >
                Start Free <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#cta"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
              >
                <Play className="h-3.5 w-3.5" /> Book Demo
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.35}>
            <p className="mt-6 text-xs uppercase tracking-[0.24em] text-muted-foreground/70">
              SOC 2 · GDPR · Enterprise SSO · Private deployment
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.4} y={40}>
          <div className="relative mx-auto mt-16 max-w-5xl">
            <HeroDashboard />
          </div>
        </Reveal>
      </motion.div>
    </section>
  );
}

/* Premium dashboard preview — pure SVG/DOM, no screenshots. */
function HeroDashboard() {
  return (
    <div className="relative">
      {/* soft glow */}
      <div className="absolute inset-0 -z-10 translate-y-8 scale-95 rounded-[32px] bg-[radial-gradient(closest-side,rgba(201,152,43,0.35),transparent_70%)] blur-3xl" />
      <div className="relative rounded-[26px] border border-white/10 bg-[color:var(--color-surface)]/70 p-2 shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="rounded-[20px] border border-white/5 bg-[color:var(--color-background)]/80">
          {/* window chrome */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground">
              <Command className="h-3 w-3" /> Ask AIAN anything…
            </div>
            <div className="h-5 w-5 rounded-full bg-white/[0.06]" />
          </div>

          <div className="grid gap-3 p-3 md:grid-cols-12">
            {/* sidebar */}
            <div className="hidden md:col-span-3 md:block">
              <div className="space-y-1 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                {[
                  ["Overview", Layers],
                  ["Memory", Brain],
                  ["Meetings", Video],
                  ["Projects", Boxes],
                  ["Reports", LineChart],
                  ["Search", Search],
                ].map(([label, Icon], i) => {
                  const IconEl = Icon as typeof Layers;
                  return (
                    <div
                      key={label as string}
                      className={
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 " +
                        (i === 1
                          ? "bg-white/[0.05] text-foreground"
                          : "text-muted-foreground")
                      }
                    >
                      <IconEl className="h-3.5 w-3.5" />
                      {label as string}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* main */}
            <div className="space-y-3 md:col-span-9">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: "Knowledge nodes", v: "1.24M", d: "+8.2%" },
                  { k: "Answered queries", v: "48,301", d: "+21%" },
                  { k: "Meetings indexed", v: "6,912", d: "this qtr" },
                ].map((s) => (
                  <div
                    key={s.k}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {s.k}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <div className="font-display text-xl font-semibold">{s.v}</div>
                      <div className="text-[10px] text-[color:var(--color-gold-soft)]">
                        {s.d}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Organizational memory · last 30 days</span>
                    <span className="text-[color:var(--color-gold-soft)]">live</span>
                  </div>
                  <SparklineChart />
                </div>
                <div className="col-span-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="mb-2 text-[11px] text-muted-foreground">
                    Knowledge graph
                  </div>
                  <MiniGraph />
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Bot className="h-3 w-3 text-[color:var(--color-gold-soft)]" /> Ask AIAN
                </div>
                <div className="text-sm text-foreground/90">
                  <span className="text-muted-foreground">→</span> Summarize the decisions made
                  during last sprint and flag any project risks.
                </div>
                <div className="mt-2 space-y-1 text-[12px] text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1 w-1 rounded-full bg-[color:var(--color-gold-soft)]" />
                    Rollout of Vault v2 approved · owners: Priya, Malik
                    <span className="ml-1 rounded bg-white/[0.04] px-1 text-[10px]">
                      Zoom · 04.11
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1 w-1 rounded-full bg-[color:var(--color-gold-soft)]" />
                    Auth service rewrite deferred to Q3 · risk: high vendor coupling
                    <span className="ml-1 rounded bg-white/[0.04] px-1 text-[10px]">
                      Jira · PLT‑812
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1 w-1 rounded-full bg-[color:var(--color-gold-soft)]" />
                    Data retention policy updated · legal review pending
                    <span className="ml-1 rounded bg-white/[0.04] px-1 text-[10px]">
                      Confluence
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating badges */}
      <motion.div
        className="glass absolute -left-6 top-24 hidden rounded-2xl p-3 md:block"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2 text-xs">
          <ScanEye className="h-4 w-4 text-[color:var(--color-gold-soft)]" />
          <div>
            <div className="text-foreground">42 new insights</div>
            <div className="text-muted-foreground">Extracted this hour</div>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="glass absolute -right-6 bottom-24 hidden rounded-2xl p-3 md:block"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2 text-xs">
          <Shield className="h-4 w-4 text-[color:var(--color-teal)]" />
          <div>
            <div className="text-foreground">Private deployment</div>
            <div className="text-muted-foreground">Your data. Your keys.</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SparklineChart() {
  const points = [10, 14, 12, 18, 22, 20, 26, 30, 28, 34, 40, 42, 48, 46, 54];
  const w = 320;
  const h = 92;
  const max = Math.max(...points);
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * (h - 8) - 4}`)
    .join(" ");
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#E8C86A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#E8C86A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <motion.path
        d={d}
        stroke="#E8C86A"
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      />
    </svg>
  );
}

function MiniGraph() {
  const nodes = [
    { x: 20, y: 30 },
    { x: 80, y: 20 },
    { x: 60, y: 60 },
    { x: 110, y: 50 },
    { x: 40, y: 80 },
    { x: 130, y: 88 },
    { x: 95, y: 90 },
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [5, 6],
  ];
  return (
    <svg viewBox="0 0 150 110" className="h-24 w-full">
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="rgba(232,200,106,0.35)"
          strokeWidth="0.6"
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={i === 2 ? 3.2 : 2} fill="#E8C86A" />
      ))}
    </svg>
  );
}

/* ---------------- Sources ---------------- */

export function Sources() {
  const sources = [
    { name: "Slack", Icon: Slack },
    { name: "Zoom", Icon: Video },
    { name: "GitHub", Icon: Github },
    { name: "Jira", Icon: ClipboardList },
    { name: "Confluence", Icon: BookOpen },
    { name: "Notion", Icon: FileText },
    { name: "Google Drive", Icon: Cloud },
    { name: "Teams", Icon: Users },
    { name: "Emails", Icon: Mail },
    { name: "Docs", Icon: FileText },
  ];
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Trusted Knowledge Sources"
          title={
            <>
              Every source your team uses,{" "}
              <span className="text-gold-gradient">flows into one brain.</span>
            </>
          }
          desc="AIAN listens across the tools your company already runs on — connectors are read‑only, scoped, and enterprise‑grade."
        />
        <Reveal>
          <div className="relative mx-auto mt-16 grid max-w-4xl place-items-center">
            <SourceOrbit sources={sources} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SourceOrbit({
  sources,
}: {
  sources: { name: string; Icon: typeof Slack }[];
}) {
  const size = 520;
  const c = size / 2;
  const rings = [
    { r: 130, count: 4, offset: 0 },
    { r: 220, count: 6, offset: Math.PI / 6 },
  ];
  const placed: { x: number; y: number; name: string; Icon: typeof Slack }[] = [];
  let idx = 0;
  rings.forEach((ring) => {
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + ring.offset;
      const s = sources[idx % sources.length];
      placed.push({
        x: c + Math.cos(a) * ring.r,
        y: c + Math.sin(a) * ring.r,
        name: s.name,
        Icon: s.Icon,
      });
      idx++;
    }
  });
  return (
    <div className="relative aspect-square w-full max-w-[520px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E8C86A" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#C9982B" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#C9982B" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* rings */}
        {rings.map((r) => (
          <circle
            key={r.r}
            cx={c}
            cy={c}
            r={r.r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="2 6"
          />
        ))}
        {/* lines from each icon to center */}
        {placed.map((p, i) => (
          <motion.line
            key={i}
            x1={p.x}
            y1={p.y}
            x2={c}
            y2={c}
            stroke="rgba(232,200,106,0.35)"
            strokeWidth="0.75"
            strokeDasharray="4 6"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 * i, duration: 1.2 }}
          />
        ))}
        {/* core glow */}
        <circle cx={c} cy={c} r={110} fill="url(#core)" />
      </svg>

      {/* center core with logo */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(232,200,106,0.55),transparent_70%)] blur-2xl" />
          <div className="glass-strong flex h-28 w-28 items-center justify-center rounded-full">
            <AianMark className="h-12 w-12 animate-pulse-soft" />
          </div>
        </div>
      </div>

      {/* icons */}
      {placed.map((p, i) => {
        const { Icon } = p;
        return (
          <motion.div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(p.x / size) * 100}%`, top: `${(p.y / size) * 100}%` }}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 * i, duration: 0.6, ease: "easeOut" }}
          >
            <div className="glass group flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all hover:-translate-y-0.5">
              <Icon className="h-4 w-4 text-[color:var(--color-gold-soft)]" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {p.name}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------------- Pipeline ---------------- */

export function Pipeline() {
  const steps = [
    { t: "Raw Data", d: "Meetings, messages, tickets, code, docs.", Icon: Layers },
    { t: "Cleaning", d: "Normalize, dedupe, redact PII.", Icon: Fingerprint },
    { t: "Knowledge Extraction", d: "Facts, entities, decisions, action items.", Icon: ScanEye },
    { t: "Categorization", d: "Domain, project, urgency, sensitivity.", Icon: Boxes },
    { t: "Relationship Detection", d: "Who owns what · what depends on what.", Icon: Network },
    { t: "Organizational Memory", d: "Grounded, versioned, queryable.", Icon: Brain },
    { t: "AI Search", d: "Semantic + graph + citation.", Icon: Search },
    { t: "Reports", d: "Auto‑generated intelligence.", Icon: BarChart3 },
    { t: "Enterprise Intelligence", d: "Decisions, faster.", Icon: Sparkles },
  ];
  return (
    <section id="pipeline" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="How AIAN Thinks"
          title={
            <>
              A pipeline built for{" "}
              <span className="text-gold-gradient">deep understanding.</span>
            </>
          }
          desc="Every signal travels through a nine‑stage cognitive pipeline before it becomes memory."
        />
        <div className="mt-16 grid gap-3 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.04}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/8 bg-[color:var(--color-surface)]/70 p-5 transition-all hover:-translate-y-0.5 hover:border-white/15">
                <div className="absolute right-4 top-4 font-display text-xs tabular-nums text-muted-foreground/60">
                  0{i + 1}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[color:var(--color-gold-soft)]/20 to-transparent ring-1 ring-inset ring-white/10">
                  <s.Icon className="h-5 w-5 text-[color:var(--color-gold-soft)]" />
                </div>
                <div className="mt-4 font-display text-lg font-medium">{s.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[color:var(--color-gold-soft)]/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Agents ---------------- */

export function Agents() {
  const agents = [
    {
      t: "Knowledge Extraction Agent",
      d: "Turns raw signal into structured knowledge — facts, decisions, owners, dates.",
      Icon: ScanEye,
    },
    {
      t: "Categorization Agent",
      d: "Classifies by project, domain, urgency and sensitivity to keep memory clean.",
      Icon: Boxes,
    },
    {
      t: "Relationship Agent",
      d: "Detects dependencies between people, projects, risks and decisions.",
      Icon: GitBranch,
    },
    {
      t: "Report Generator",
      d: "Composes executive‑ready sprint, meeting and health reports on demand.",
      Icon: LineChart,
    },
    {
      t: "Search Agent",
      d: "Semantic + graph reasoning across every source, always cited.",
      Icon: Search,
    },
  ];
  return (
    <section id="agents" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Meet the Agents"
          title={
            <>
              A team of intelligent agents,{" "}
              <span className="text-gold-gradient">quietly working behind the glass.</span>
            </>
          }
          desc="Purpose‑built, orchestrated, observable — each agent has one job and does it exceptionally well."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((a, i) => (
            <Reveal key={a.t} delay={i * 0.05}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--color-card)]/70 p-6 transition-all hover:-translate-y-0.5 hover:ring-gold-glow">
                <div className="absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="absolute -inset-20 bg-[radial-gradient(closest-side,rgba(232,200,106,0.15),transparent_70%)]" />
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--color-gold-soft)]/20 to-transparent ring-1 ring-inset ring-white/10">
                    <a.Icon className="h-5 w-5 text-[color:var(--color-gold-soft)]" />
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Agent
                  </span>
                </div>
                <div className="mt-5 font-display text-lg font-medium">{a.t}</div>
                <div className="mt-2 text-sm text-muted-foreground">{a.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Knowledge Graph ---------------- */

export function OrgMemory() {
  return (
    <section id="memory" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <SectionHead
              align="left"
              tag="Organizational Memory"
              title={
                <>
                  A living{" "}
                  <span className="text-gold-gradient">knowledge graph</span> of everything your
                  company knows.
                </>
              }
              desc="People, projects, meetings, decisions, requirements and risks — connected, versioned and always in reach."
            />
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              {[
                "Every decision traced to the meeting it was made in.",
                "Every requirement linked to the ticket that delivers it.",
                "Every risk anchored to the person accountable.",
              ].map((li) => (
                <li key={li} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[color:var(--color-gold-soft)]" />
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-7">
            <Reveal>
              <KnowledgeGraph />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function KnowledgeGraph() {
  const nodes = [
    { id: "aian", x: 300, y: 220, r: 26, label: "AIAN", gold: true },
    { id: "proj", x: 130, y: 120, r: 14, label: "Project Vault v2" },
    { id: "meet", x: 470, y: 110, r: 14, label: "Sprint Review" },
    { id: "person1", x: 90, y: 260, r: 12, label: "Priya" },
    { id: "person2", x: 200, y: 340, r: 12, label: "Malik" },
    { id: "decision", x: 400, y: 300, r: 14, label: "Rollout Approved" },
    { id: "risk", x: 520, y: 250, r: 12, label: "Vendor Coupling" },
    { id: "req", x: 180, y: 60, r: 12, label: "SSO Requirement" },
    { id: "ticket", x: 380, y: 40, r: 12, label: "PLT‑812" },
    { id: "doc", x: 540, y: 360, r: 12, label: "Retention Policy" },
  ];
  const edges: [string, string][] = [
    ["aian", "proj"],
    ["aian", "meet"],
    ["aian", "person1"],
    ["aian", "person2"],
    ["aian", "decision"],
    ["aian", "risk"],
    ["aian", "req"],
    ["aian", "ticket"],
    ["aian", "doc"],
    ["proj", "req"],
    ["meet", "decision"],
    ["decision", "risk"],
    ["proj", "person1"],
    ["proj", "person2"],
    ["ticket", "req"],
    ["doc", "decision"],
  ];
  const map = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[color:var(--color-surface)]/60 p-3">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <svg viewBox="0 0 600 420" className="relative h-full w-full">
        <defs>
          <radialGradient id="core-g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E8C86A" stopOpacity="1" />
            <stop offset="100%" stopColor="#8A6416" stopOpacity="0.6" />
          </radialGradient>
        </defs>
        {edges.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={map[a].x}
            y1={map[a].y}
            x2={map[b].x}
            y2={map[b].y}
            stroke="rgba(232,200,106,0.28)"
            strokeWidth="0.9"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.02 * i, duration: 1.2 }}
          />
        ))}
        {nodes.map((n, i) => (
          <g key={n.id}>
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={n.gold ? "url(#core-g)" : theme.resolvedTheme !== 'dark' ? "rgba(206, 127, 24, 0.06)" : "hsla(170, 65%, 49%, 0.06)"}
              stroke={n.gold ? "#E8C86A" : "rgba(255,255,255,0.15)"}
              strokeWidth={n.gold ? 1.5 : 0.75}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 * i, duration: 0.5 }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            />
            <text
              x={n.x}
              y={n.y + n.r + 12}
              textAnchor="middle"
              fontSize="9"
              fill={theme.resolvedTheme !== 'dark' ? "rgba(0, 0, 0, 0.7)" : "rgba(245,247,250,0.7)"}
              fontFamily="Inter"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------------- Ask AIAN ---------------- */

export function AskAian() {
  const questions = [
    "What decisions were made last sprint?",
    "Summarize all Zoom meetings from Q3.",
    "Show project risks across the platform team.",
    "Which engineers own auth?",
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % questions.length), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Ask AIAN"
          title={
            <>
              Answers with{" "}
              <span className="text-gold-gradient">citations, confidence and context.</span>
            </>
          }
          desc="Every reply is grounded in your organization's real sources — no hallucinations, always traceable."
        />
        <Reveal>
          <div className="relative mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[color:var(--color-surface)]/70 p-6 backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap gap-2">
              {questions.map((q, i) => (
                <button
                  key={q}
                  onClick={() => setActive(i)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs transition-all " +
                    (i === active
                      ? "border-[color:var(--color-gold-soft)]/40 bg-[color:var(--color-gold-soft)]/10 text-foreground"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground")
                  }
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[color:var(--color-background)]/60 p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" /> You
              </div>
              <div className="mt-1 font-display text-lg">{questions[active]}</div>

              <div className="mt-5 border-t border-white/5 pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AianMark className="h-4 w-4" /> AIAN
                  <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px]">
                    confidence 96%
                  </span>
                </div>
                <TypedAnswer key={active} />
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "Zoom · Sprint 42 Review",
                    "Jira · PLT‑812",
                    "Confluence · Vault v2 Plan",
                  ].map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      <span className="h-1 w-1 rounded-full bg-[color:var(--color-gold-soft)]" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TypedAnswer() {
  const text =
    "Three decisions shaped last sprint: Vault v2 rollout was approved with Priya and Malik as owners; the auth service rewrite was deferred to Q3 due to high vendor coupling; and the data retention policy was updated pending legal review.";
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(t);
          return v;
        }
        return v + 2;
      });
    }, 12);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="mt-2 text-sm leading-relaxed text-foreground/90">
      {text.slice(0, n)}
      <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-[color:var(--color-gold-soft)]" />
    </p>
  );
}

/* ---------------- Reports ---------------- */

export function Reports() {
  const reports = [
    { t: "Sprint Report", d: "Velocity, blockers, decisions, follow‑ups.", Icon: LineChart },
    { t: "Meeting Intelligence", d: "Summaries, action items, owners.", Icon: Video },
    { t: "Project Health", d: "Momentum, risk, dependency stress.", Icon: Gauge },
    { t: "Executive Summary", d: "The one‑pager for Monday morning.", Icon: Building2 },
    { t: "Decision Report", d: "What was decided, when, by whom.", Icon: ClipboardList },
    { t: "Productivity Report", d: "Team output signal without surveillance.", Icon: BarChart3 },
  ];
  return (
    <section id="reports" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Reports"
          title={
            <>
              Executive intelligence,{" "}
              <span className="text-gold-gradient">generated continuously.</span>
            </>
          }
          desc="Turn hundreds of scattered signals into a handful of clear, cited briefings."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((r, i) => (
            <Reveal key={r.t} delay={i * 0.04}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[color:var(--color-card)]/80 to-[color:var(--color-surface)]/60 p-5 transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
                    <r.Icon className="h-5 w-5 text-[color:var(--color-gold-soft)]" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Auto‑generated
                  </span>
                </div>
                <div className="mt-4 font-display text-lg">{r.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{r.d}</div>
                <div className="mt-5 h-16 rounded-lg border border-white/5 bg-[color:var(--color-background)]/60 p-2">
                  <ReportBars />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportBars() {
  const bars = [30, 60, 45, 70, 55, 80, 65, 90, 72];
  return (
    <div className="flex h-full items-end gap-1">
      {bars.map((b, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${b}%` }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.6, ease: "easeOut" }}
          className="w-full rounded-sm bg-gradient-to-t from-[color:var(--color-gold-deep)]/30 to-[color:var(--color-gold-soft)]/80"
        />
      ))}
    </div>
  );
}

/* ---------------- Search Everything ---------------- */

export function SearchEverything() {
  const scopes = [
    "Meetings",
    "Tickets",
    "Repositories",
    "Requirements",
    "Risks",
    "People",
    "Projects",
    "Knowledge",
  ];
  const [q, setQ] = useState("payment webhook retries");
  const results = [
    {
      t: "Meeting · Payments sync · 12 Apr",
      d: "Decision to switch to idempotent retries with exponential backoff.",
      k: "Zoom",
    },
    {
      t: "Ticket · PAY‑2211",
      d: "Implement retry policy on webhook receiver; owner: Aisha.",
      k: "Jira",
    },
    {
      t: "Repo · payments/webhooks.ts",
      d: "handleRetry() introduced last sprint; test coverage 92%.",
      k: "GitHub",
    },
    {
      t: "Doc · Webhook Reliability",
      d: "Runbook for on‑call, alerts and dead‑letter queue.",
      k: "Confluence",
    },
  ];
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Search Everything"
          title={
            <>
              One bar.{" "}
              <span className="text-gold-gradient">Every corner of your company.</span>
            </>
          }
          desc="Semantic search across every source, every project, every conversation — instantly."
        />
        <Reveal>
          <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[color:var(--color-surface)]/70 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[color:var(--color-background)]/60 px-4 py-3">
              <Search className="h-4 w-4 text-[color:var(--color-gold-soft)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Search anything…"
              />
              <span className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
                ⌘K
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {scopes.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10">
              {results.map((r, i) => (
                <motion.div
                  key={r.t}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-[color:var(--color-gold-soft)]" />
                  <div className="flex-1">
                    <div className="text-sm text-foreground">{r.t}</div>
                    <div className="text-xs text-muted-foreground">{r.d}</div>
                  </div>
                  <span className="rounded-md border border-white/10 bg-white/[0.02] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {r.k}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Why AIAN ---------------- */

export function WhyAian() {
  const items = [
    { t: "One Brain", d: "Every source, one intelligence.", Icon: Brain },
    { t: "Enterprise Ready", d: "SSO, SCIM, audit, data residency.", Icon: Building2 },
    { t: "Private", d: "Your data. Your keys. Your cloud.", Icon: Lock },
    { t: "Fast", d: "Sub‑second search on billions of tokens.", Icon: Zap },
    { t: "AI Native", d: "Agents, retrieval and reasoning built in.", Icon: Bot },
    { t: "Multi Source", d: "Slack, Jira, GitHub, Zoom and beyond.", Icon: Workflow },
    { t: "Knowledge Graph", d: "Meaning encoded in relationships.", Icon: Network },
    { t: "Semantic Search", d: "Understand intent, not just keywords.", Icon: Search },
    { t: "Actionable Intelligence", d: "Insight your team can act on today.", Icon: Sparkles },
  ];
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Why AIAN"
          title={
            <>
              Built for teams who think{" "}
              <span className="text-gold-gradient">institutional memory is a moat.</span>
            </>
          }
        />
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.t} delay={i * 0.03}>
              <div className="flex h-full items-start gap-3 rounded-2xl border border-white/8 bg-[color:var(--color-surface)]/70 p-5 transition-all hover:-translate-y-0.5 hover:border-white/15">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[color:var(--color-gold-soft)]/20 to-transparent ring-1 ring-inset ring-white/10 ">
                  <it.Icon className="h-4.5 w-4.5 text-[color:var(--color-gold-soft)]" />
                </div>
                <div>
                  <div className="font-display text-base font-medium">{it.t}</div>
                  <div className="text-sm text-muted-foreground">{it.d}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Architecture ---------------- */

export function Architecture() {
  const layers = [
    { t: "Data Sources", d: "Slack · Jira · GitHub · Zoom · Notion · Drive", Icon: Layers },
    { t: "Connectors", d: "Scoped, read‑only, event‑driven", Icon: Workflow },
    { t: "Normalization", d: "Clean, dedupe, structure, redact", Icon: Fingerprint },
    { t: "AI Pipeline", d: "Extraction · categorization · relations", Icon: Bot },
    { t: "Knowledge Base", d: "Versioned, permissioned, auditable", Icon: BookOpen },
    { t: "Vector Search", d: "Billion‑scale semantic retrieval", Icon: Search },
    { t: "Knowledge Graph", d: "Entities & relationships at the core", Icon: Network },
    { t: "Applications", d: "Ask, Search, Reports, Automations", Icon: Sparkles },
  ];
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Architecture"
          title={
            <>
              Enterprise architecture,{" "}
              <span className="text-gold-gradient">designed for scale and trust.</span>
            </>
          }
        />
        <Reveal>
          <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[color:var(--color-surface)]/60 p-6">
            <div className="space-y-3">
              {layers.map((l, i) => (
                <motion.div
                  key={l.t}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.6 }}
                  className="group relative flex items-center gap-4 rounded-2xl border border-white/8 bg-background  px-5 py-4 transition-all hover:border-[color:var(--color-gold-soft)]/25"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
                    <l.Icon className="h-5 w-5 text-[color:var(--color-gold-soft)]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-base">{l.t}</div>
                    <div className="text-xs text-muted-foreground">{l.d}</div>
                  </div>
                  <div className="font-display text-xs tabular-nums text-muted-foreground/60">
                    L{i + 1}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Feature Grid ---------------- */

export function FeatureGrid() {
  const feats = [
    { t: "Enterprise Security", d: "SOC 2, SSO, SCIM, audit logs.", Icon: Shield },
    { t: "Semantic Search", d: "Meaning‑aware retrieval.", Icon: Search },
    { t: "Knowledge Graph", d: "Relationships at the core.", Icon: Network },
    { t: "Vector Search", d: "Billion‑scale, sub‑second.", Icon: Boxes },
    { t: "Meeting Intelligence", d: "Summaries, decisions, actions.", Icon: Video },
    { t: "Project Intelligence", d: "Health, momentum, risk.", Icon: Gauge },
    { t: "Developer Insights", d: "Signal from every repo.", Icon: Github },
    { t: "AI Reports", d: "Continuous executive briefings.", Icon: LineChart },
    { t: "Automation", d: "Trigger workflows from knowledge.", Icon: Workflow },
    { t: "Smart Categorization", d: "Keeps memory clean and useful.", Icon: Boxes },
    { t: "Cross Project Memory", d: "Learn once, apply everywhere.", Icon: Brain },
    { t: "Enterprise Analytics", d: "Trends, adoption, ROI.", Icon: BarChart3 },
  ];
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Feature Grid"
          title={
            <>
              Everything you need,{" "}
              <span className="text-gold-gradient">nothing you don't.</span>
            </>
          }
        />
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {feats.map((f, i) => (
            <Reveal key={f.t} delay={i * 0.02}>
              <div className="group h-full rounded-2xl border border-white/10 bg-[color:var(--color-surface)]/70 p-5 transition-colors hover:bg-white/[0.04]">
                <f.Icon className="h-5 w-5 text-[color:var(--color-gold-soft)]" />
                <div className="mt-3 font-display text-sm font-medium">{f.t}</div>
                <div className="mt-1 text-xs text-muted-foreground">{f.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */

export function Testimonials() {
  const items = [
    {
      q: "AIAN feels less like software and more like the memory our company always wished it had.",
      a: "Elena Voss",
      r: "Chief of Staff, Northlake",
    },
    {
      q: "Onboarding an engineer used to take a month. Now they ship in the first week.",
      a: "Rohan Mehta",
      r: "VP Engineering, Cygnus AI",
    },
    {
      q: "We finally stopped losing decisions between Slack, Jira and the meeting no one remembers.",
      a: "Sara Lindqvist",
      r: "COO, Halden Systems",
    },
  ];
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Trusted"
          title={
            <>
              Teams building the future{" "}
              <span className="text-gold-gradient">remember with AIAN.</span>
            </>
          }
        />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={t.a} delay={i * 0.05}>
              <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[color:var(--color-card)]/80 to-[color:var(--color-surface)]/60 p-7">
                <Quote className="h-6 w-6 text-[color:var(--color-gold-soft)]/80" />
                <p className="mt-4 text-pretty text-base leading-relaxed text-foreground/90">
                  {t.q}
                </p>
                <div className="mt-6 border-t border-white/5 pt-4">
                  <div className="text-sm text-foreground">{t.a}</div>
                  <div className="text-xs text-muted-foreground">{t.r}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */

export function Pricing() {
  const plans = [
    {
      t: "Starter",
      p: "$0",
      s: "For small teams exploring organizational memory.",
      f: ["3 connectors", "Semantic search", "Ask AIAN · 500 queries/mo", "Community support"],
      cta: "Start Free",
    },
    {
      t: "Growth",
      p: "$29",
      s: "per user / month · billed annually",
      f: [
        "All connectors",
        "Meeting Intelligence",
        "Knowledge Graph",
        "Auto Reports",
        "Priority support",
      ],
      cta: "Start 14‑day trial",
    },
    {
      t: "Enterprise",
      p: "Custom",
      s: "For companies where memory is a moat.",
      f: [
        "SSO, SCIM, audit",
        "Private deployment · BYO‑cloud",
        "Custom AI models",
        "Dedicated CSM",
        "24/7 SLA",
      ],
      cta: "Book Demo",
      highlight: true,
    },
  ];
  return (
    <section id="pricing" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHead
          tag="Pricing"
          title={
            <>
              Simple, transparent,{" "}
              <span className="text-gold-gradient">built for scale.</span>
            </>
          }
          desc="Start free. Grow into the team plan. Deploy privately when you're ready."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.t} delay={i * 0.06}>
              <div
                className={
                  "relative h-full overflow-hidden rounded-3xl border p-7 transition-all " +
                  (p.highlight
                    ? "border-[color:var(--color-gold-soft)]/40 bg-gradient-to-b from-[color:var(--color-card)] to-[color:var(--color-surface)] ring-gold-glow"
                    : "border-white/10 bg-[color:var(--color-surface)]/60")
                }
              >
                {p.highlight && (
                  <div className="absolute right-5 top-5 rounded-full bg-gold-gradient px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-[#17130A]">
                    Most Popular
                  </div>
                )}
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {p.t}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <div className="font-display text-4xl font-semibold">{p.p}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{p.s}</div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.f.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-[color:var(--color-gold-soft)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#cta"
                  className={
                    "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all " +
                    (p.highlight
                      ? "btn-gold btn-gold-hover"
                      : "border border-primary/30 bg-white/[0.03] text-foreground hover:bg-white/[0.06]")
                  }
                >
                  {p.cta} <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

export function FinalCTA() {
  return (
    <section id="cta" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[color:var(--color-surface)]/60 p-10 text-center md:p-16">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(201,152,43,0.25),transparent_70%)]" />
          </div>
          <SectionTag>The Future of Enterprise Knowledge</SectionTag>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Stop losing company knowledge.{" "}
            <span className="text-gold-gradient">Start building organizational intelligence.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground">
            Give every employee access to the company's collective memory — searchable, understandable,
            always up to date.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#"
              className="btn-gold btn-gold-hover inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/[0.03] px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
            >
              Book Demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}



/* dummy to silence unused useSpring if not needed later */
export const _unused = { useSpring };
