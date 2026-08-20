"use client";

import { useSubscriptionPlans } from "@/hooks/billing/useSubscriptionPlans";
import { motion, useScroll, useTransform, useSpring, useInView } from "motion/react";
import { useRef, useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
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
  Plug,
  Database,
} from "lucide-react";
import { AianMark, AianLogo } from "../../ui/Logo";
import { NeuralBackdrop } from "./NeuralBackdrop";
import { useTheme } from "next-themes";


/* ---------------- Section shell ---------------- */

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
      <span className="h-1 w-1 rounded-full bg-gold-soft" />
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
      <h2 className="text-balance text-3xl font-semibold leading-[1.05] tracking-tight tracking-[-0.02em] sm:text-4xl md:text-5xl font-display font-display">
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
      initial={{ opacity: 0, y, scale: 0.95, filter: "blur(12px)" }}
      animate={inView ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.8, delay, type: "spring", bounce: 0.4 }}
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
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-40 pb-24 md:pt-52 md:pb-32">
      {/* backdrop */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0 noise-after" />
        <NeuralBackdrop />
        <div className="absolute left-1/2 top-0 h-[80vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,152,43,0.18),transparent_70%)]" />
        <div className="absolute -bottom-40 left-1/2 h-[50vh] w-[100vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(21,194,167,0.08),transparent_70%)]" />
      </motion.div>

      <motion.div style={{ y, opacity }} className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-gold-soft" />
              Introducing AIAN · Organizational Intelligence, live
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.98] tracking-tight tracking-[-0.02em] sm:text-6xl md:text-7xl font-display font-display">
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
      <div className="absolute inset-0 -z-10 translate-y-8 scale-95 rounded-[32px] bg-[radial-gradient(closest-side,rgba(201,152,43,0.35),transparent_70%)] blur-3xl" />
      <div className="relative rounded-[26px] glass-strong p-2 shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex h-[500px] overflow-hidden rounded-[20px] border border-white/5 bg-background text-foreground">
          {/* Sidebar */}
          <aside className="hidden w-[220px] shrink-0 flex-col border-r border-white/5 bg-surface/60 backdrop-blur-xl md:flex">
            <div className="flex items-center gap-2 p-4">
              <AianMark className="h-6 w-6" />
              <span className="font-display text-sm font-semibold tracking-widest text-foreground">AIAN</span>
            </div>
            <div className="px-3">
              <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-gradient text-[11px] font-bold text-[#17130A]">AI</div>
                <div className="text-[12px] font-semibold">Acme Corp</div>
              </div>
            </div>
            <nav className="mt-4 flex-1 space-y-0.5 px-3">
              <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Workspace</div>
              {[
                { l: "Dashboard", i: Layers },
                { l: "AI Portal", i: Sparkles },
                { l: "Knowledge", i: BookOpen },
                { l: "Entities", i: Network },
                { l: "Meetings", i: Video },
                { l: "Integrations", i: Plug },
                { l: "Pipeline", i: Database },
                { l: "Members", i: Users },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-[12px] font-medium transition-all ${i === 1 ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:bg-white/[0.04]"}`}>
                  <item.i className={`h-4 w-4 ${i === 1 ? "text-gold-soft" : ""}`} />
                  {item.l}
                </div>
              ))}
            </nav>
          </aside>
          {/* Main */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center justify-between border-b border-white/5 bg-surface/40 px-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-muted-foreground">
                <Search className="h-3 w-3" /> Search across Acme Corp...
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-white/10" />
                <div className="h-7 w-7 rounded-lg bg-gold-gradient" />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-gold-soft" />
                  <span className="font-display text-lg font-medium">Ask AIAN</span>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="text-sm text-foreground/90"><span className="text-muted-foreground">→</span> Summarize the decisions made during last sprint and flag any project risks.</div>
                  <div className="mt-4 space-y-3 text-[13px] text-muted-foreground">
                    <div className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-gold-soft" />Rollout of Vault v2 approved · owners: Priya, Malik <span className="ml-1 rounded bg-white/[0.04] px-1 text-[10px]">Zoom · 04.11</span></div>
                    <div className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-gold-soft" />Auth service rewrite deferred to Q3 · risk: high vendor coupling <span className="ml-1 rounded bg-white/[0.04] px-1 text-[10px]">Jira · PLT‑812</span></div>
                    <div className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-gold-soft" />Data retention policy updated · legal review pending <span className="ml-1 rounded bg-white/[0.04] px-1 text-[10px]">Confluence</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { k: "Knowledge nodes", v: "1.24M", d: "+8.2%" },
                    { k: "Answered queries", v: "48,301", d: "+21%" },
                    { k: "Meetings indexed", v: "6,912", d: "this qtr" },
                  ].map((s) => (
                    <div key={s.k} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.k}</div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <div className="font-display text-2xl font-semibold">{s.v}</div>
                        <div className="text-[10px] text-gold-soft">{s.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
      <motion.div className="glass absolute -left-6 top-32 hidden rounded-2xl p-4 md:block" animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <div className="flex items-center gap-3 text-xs">
          <ScanEye className="h-5 w-5 text-gold-soft" />
          <div><div className="text-foreground">42 new insights</div><div className="text-muted-foreground">Extracted this hour</div></div>
        </div>
      </motion.div>
      <motion.div className="glass absolute -right-6 bottom-32 hidden rounded-2xl p-4 md:block" animate={{ y: [0, 8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
        <div className="flex items-center gap-3 text-xs">
          <Shield className="h-5 w-5 text-teal" />
          <div><div className="text-foreground">Private deployment</div><div className="text-muted-foreground">Your data. Your keys.</div></div>
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


/* ---------------- Integrations Marquee ---------------- */

export function IntegrationsMarquee() {
  const providers = [
    { name: "Slack", Icon: Slack },
    { name: "Zoom", Icon: Video },
    { name: "GitHub", Icon: Github },
    { name: "Jira", Icon: ClipboardList },
    { name: "Confluence", Icon: BookOpen },
    { name: "Notion", Icon: FileText },
    { name: "Google Drive", Icon: Cloud },
    { name: "Teams", Icon: Users },
  ];
  const duplicated = [...providers, ...providers, ...providers, ...providers];

  return (
    <section className="relative py-10 overflow-hidden border-y border-white/5 bg-surface/20">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-16 w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
      >
        {duplicated.map((p, i) => (
          <div key={i} className="flex items-center gap-3 text-muted-foreground opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
            <p.Icon className="h-7 w-7" />
            <span className="font-display font-medium text-xl">{p.name}</span>
          </div>
        ))}
      </motion.div>
    </section>
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


function SourceOrbit({ sources }: { sources: { name: string; Icon: typeof Slack }[] }) {
  const size = 520;
  const c = size / 2;
  const rings = [{ r: 130, count: 4, offset: 0 }, { r: 220, count: 6, offset: Math.PI / 6 }];
  const placed: { x: number; y: number; name: string; Icon: typeof Slack }[] = [];
  let idx = 0;
  rings.forEach((ring) => {
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + ring.offset;
      const s = sources[idx % sources.length];
      placed.push({ x: c + Math.cos(a) * ring.r, y: c + Math.sin(a) * ring.r, name: s.name, Icon: s.Icon });
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
        {rings.map((r) => (<circle key={r.r} cx={c} cy={c} r={r.r} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 6" />))}
        {placed.map((p, i) => (<motion.line key={i} x1={p.x} y1={p.y} x2={c} y2={c} stroke="rgba(232,200,106,0.35)" strokeWidth="0.75" strokeDasharray="4 6" initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.05 * i, duration: 1.2 }} />))}
        <circle cx={c} cy={c} r={110} fill="url(#core)" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(232,200,106,0.55),transparent_70%)] blur-2xl" />
          <div className="glass-strong flex h-28 w-28 items-center justify-center rounded-full"><AianMark className="h-12 w-12 animate-pulse-soft" /></div>
        </div>
      </div>
      {placed.map((p, i) => {
        const { Icon } = p;
        return (
          <motion.div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(p.x / size) * 100}%`, top: `${(p.y / size) * 100}%` }} initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.05 * i, duration: 0.6, ease: "easeOut" }}>
            <div className="glass group flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all hover:bg-white/10 hover:ring-gold-glow">
              <Icon className="h-4 w-4 text-gold-soft" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.name}</span>
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
              <div className="group relative h-full overflow-hidden rounded-2xl glass p-5 transition-all hover:-translate-y-0.5 hover:border-white/15">
                <div className="absolute right-4 top-4 font-display text-xs tabular-nums text-muted-foreground/60">
                  0{i + 1}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-soft/20 to-transparent ring-1 ring-inset ring-white/10">
                  <s.Icon className="h-5 w-5 text-gold-soft" />
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
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-6 transition-all hover:-translate-y-0.5 hover:ring-gold-glow">
                <div className="absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="absolute -inset-20 bg-[radial-gradient(closest-side,rgba(232,200,106,0.15),transparent_70%)]" />
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-soft/20 to-transparent ring-1 ring-inset ring-white/10">
                    <a.Icon className="h-5 w-5 text-gold-soft" />
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
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const textOpacities = [
    useTransform(scrollYProgress, [0.4, 0.6], [0.2, 1]),
    useTransform(scrollYProgress, [0.6, 0.8], [0.2, 1]),
    useTransform(scrollYProgress, [0.8, 1.0], [0.2, 1]),
  ];

  const graphX = useTransform(scrollYProgress, [0, 1], [150, -50]);
  const graphScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 1.1]);
  const graphOpacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);

  return (
    <section id="memory" ref={containerRef} className="relative h-[250vh]">
      <div className="sticky top-0 flex min-h-screen items-center py-24 overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
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
              />
              <ScrollTextReveal 
                text="People, projects, meetings, decisions, requirements and risks — connected, versioned and always in reach." 
                progress={scrollYProgress} 
              />
              <ul className="mt-8 space-y-4 text-base font-medium">
                {[
                  "Every decision traced to the meeting it was made in.",
                  "Every requirement linked to the ticket that delivers it.",
                  "Every risk anchored to the person accountable.",
                ].map((li, i) => (
                  <motion.li key={li} className="flex items-start gap-3" style={{ opacity: textOpacities[i] }}>
                    <Check className="mt-0.5 h-5 w-5 text-gold-soft shrink-0" />
                    <span>{li}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-7">
              <motion.div style={{ x: graphX, scale: graphScale, opacity: graphOpacity }}>
                <KnowledgeGraph />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScrollTextReveal({ text, progress }: { text: string; progress: import("motion/react").MotionValue<number> }) {
  const words = text.split(" ");
  return (
    <p className="mt-6 max-w-lg text-pretty text-[22px] leading-relaxed font-medium text-foreground">
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + (1 / words.length);
        const opacity = useTransform(progress, [start * 0.5, end * 0.5], [0.15, 1]);
        return (
          <motion.span key={i} style={{ opacity }} className="mr-1.5 inline-block">
            {word}
          </motion.span>
        );
      })}
    </p>
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
    <div className="relative overflow-hidden rounded-3xl glass p-3">
      <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="absolute inset-0 noise-after" />
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
          <div className="relative mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl glass p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {questions.map((q, i) => (
                <button
                  key={q}
                  onClick={() => setActive(i)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs transition-all " +
                    (i === active
                      ? "border-gold-soft/40 bg-gold-soft/10 text-foreground"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground")
                  }
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/60 p-5">
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
                      <span className="h-1 w-1 rounded-full bg-gold-soft" />
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
      <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-gold-soft" />
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
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-card/80 to-surface/60 p-5 transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
                    <r.Icon className="h-5 w-5 text-gold-soft" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Auto‑generated
                  </span>
                </div>
                <div className="mt-4 font-display text-lg">{r.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{r.d}</div>
                <div className="mt-5 h-20 rounded-lg border border-white/5 bg-background/60 p-2.5">
                  <ReportVisual type={r.t} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportVisual({ type }: { type: string }) {
  if (type === "Sprint Report") return (
     <div className="h-full w-full flex flex-col justify-end gap-1">
        <div className="flex justify-between text-[9px] text-muted-foreground"><span className="text-gold-soft">Velocity +14%</span><span>Sprint 42</span></div>
        <div className="relative h-full mt-1 border-b border-white/10">
           <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible preserve-3d">
              <path d="M0,30 L20,25 L40,35 L60,15 L80,20 L100,5" fill="none" stroke="#E8C86A" strokeWidth="2" />
              <path d="M0,30 L20,25 L40,35 L60,15 L80,20 L100,5 L100,40 L0,40 Z" fill="url(#spark)" opacity="0.3" />
           </svg>
        </div>
     </div>
  );
  if (type === "Meeting Intelligence") return (
     <div className="h-full w-full flex flex-col gap-2 justify-center">
        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gold-soft" /><div className="h-1.5 bg-white/20 rounded-full w-full" /></div>
        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gold-soft" /><div className="h-1.5 bg-white/10 rounded-full w-3/4" /></div>
        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gold-soft" /><div className="h-1.5 bg-white/5 rounded-full w-1/2" /></div>
     </div>
  );
  if (type === "Project Health") return (
     <div className="h-full w-full grid grid-cols-5 gap-1">
        {Array.from({length: 15}).map((_, i) => (
           <div key={i} className={`rounded-sm ${i % 4 === 0 ? "bg-red-500/30" : i % 3 === 0 ? "bg-amber-500/30" : "bg-emerald-500/30"} border border-white/5`} />
        ))}
     </div>
  );
  if (type === "Executive Summary") return (
    <div className="h-full w-full flex gap-3">
       <div className="w-1/3 h-full rounded-md bg-gold-soft/20 border border-gold-soft/30 flex items-center justify-center text-[10px] text-gold-soft font-display font-medium">92%</div>
       <div className="w-2/3 h-full flex flex-col gap-2 py-1">
          <div className="h-1.5 bg-white/20 rounded-full w-full" />
          <div className="h-1.5 bg-white/10 rounded-full w-full" />
          <div className="h-1.5 bg-white/5 rounded-full w-2/3" />
       </div>
    </div>
  );
  if (type === "Decision Report") return (
    <div className="h-full w-full flex flex-col gap-1.5">
       <div className="flex items-center gap-2 text-[9px] text-muted-foreground bg-white/[0.03] p-1.5 rounded"><Check className="h-3 w-3 text-gold-soft" /> Architecture Decided</div>
       <div className="flex items-center gap-2 text-[9px] text-muted-foreground bg-white/[0.03] p-1.5 rounded"><Check className="h-3 w-3 text-gold-soft" /> Vendor Selected</div>
    </div>
  );
  // Default (Productivity)
  return (
    <div className="h-full w-full flex items-end gap-1">
       {[30, 40, 35, 60, 55, 80, 70, 90, 85, 75, 95].map((h, i) => (
         <motion.div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-gold-deep/30 to-gold-soft/60" initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} />
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
          <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl glass p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/60 px-4 py-3">
              <Search className="h-4 w-4 text-gold-soft" />
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
                  <div className="mt-1 h-2 w-2 rounded-full bg-gold-soft" />
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
              <div className="flex h-full items-start gap-3 rounded-2xl glass p-5 transition-all hover:-translate-y-0.5 hover:border-white/15">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-gold-soft/20 to-transparent ring-1 ring-inset ring-white/10 ">
                  <it.Icon className="h-4.5 w-4.5 text-gold-soft" />
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
          <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-3xl glass p-6">
            <div className="space-y-3">
              {layers.map((l, i) => (
                <motion.div
                  key={l.t}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.6 }}
                  className="group relative flex items-center gap-4 rounded-2xl border border-white/8 bg-background  px-5 py-4 transition-all hover:border-gold-soft/25"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
                    <l.Icon className="h-5 w-5 text-gold-soft" />
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


/* ---------------- Security & Trust ---------------- */

export function SecurityTrust() {
  const items = [
    { t: "SOC 2 Type II", d: "Independently audited and certified for security, availability, and confidentiality.", Icon: Shield },
    { t: "Zero Data Retention", d: "LLM providers do not train on your data, and inputs are never stored by models.", Icon: Lock },
    { t: "GDPR & HIPAA Ready", d: "Built from day one to handle sensitive data with strict compliance.", Icon: Fingerprint },
    { t: "Enterprise SSO & SCIM", d: "Granular access control synced directly with your identity provider.", Icon: Users },
  ];
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-[32px] glass-strong p-10 md:p-16 text-center noise">
          <SectionHead
            tag="Security First"
            title={
              <>
                Your data. <span className="text-gold-gradient">Your keys.</span> Your moat.
              </>
            }
            desc="We designed AIAN for enterprise security from the ground up. We don't train models on your IP."
          />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-left">
            {items.map((it, i) => (
              <Reveal key={it.t} delay={i * 0.05}>
                <div className="h-full glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
                    <it.Icon className="h-5 w-5 text-gold-soft" />
                  </div>
                  <div className="mt-4 font-display text-base font-medium text-foreground">{it.t}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{it.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
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
              <div className="group h-full rounded-2xl glass p-5 transition-colors hover:bg-white/[0.04]">
                <f.Icon className="h-5 w-5 text-gold-soft" />
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
      q: "We reduced our executive alignment meetings by 15 hours a week. AIAN's auto-generated reports just give us the facts.",
      a: "Elena Voss",
      r: "Chief of Staff, Northlake",
    },
    {
      q: "Onboarding an engineer used to take a month. By searching AIAN's knowledge graph for past context, new hires now ship in their first week.",
      a: "Rohan Mehta",
      r: "VP Engineering, Cygnus AI",
    },
    {
      q: "Zero data retention was non-negotiable for us. AIAN delivered state-of-the-art semantic search without compromising our IP.",
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
              <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-card/80 to-surface/60 p-7">
                <Quote className="h-6 w-6 text-gold-soft/80" />
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
  const { data: serverPlans, isLoading } = useSubscriptionPlans();

  const plans = serverPlans?.map((plan) => ({
    t: plan.name,
    p: `$${(plan.monthlyPriceCents / 100).toLocaleString()}`,
    s: plan.description || "per user / month · billed annually",
    f: [
      `Up to ${plan.maxMembers} Users`,
      `${Math.floor(plan.storageLimitMb / 1024)}GB Storage`,
      `${(plan.aiTokenLimit / 1000000).toLocaleString()}M AI Tokens`,
      "Full Security Audit access",
      "Semantic search & Graph",
    ],
    cta: "Book Demo",
    highlight: plan.slug === "growth",
    slug: plan.slug,
  })) || [
    {
      t: "Free Trial",
      p: "$0",
      s: "Test the AIAN platform with a limited feature set.",
      f: ["Up to 5 Users", "5GB Storage", "1M AI Tokens", "Community Support", "Basic Graph Access"],
      cta: "Start Free Trial",
      highlight: false,
      slug: "freetrial",
    },
    {
      t: "Starter",
      p: "$29",
      s: "Perfect for startups and small teams getting started with AIAN.",
      f: ["Up to 10 Users", "25GB Storage", "10M AI Tokens", "Standard Connectors", "Email Support"],
      cta: "Get Started",
      highlight: false,
      slug: "starter",
    },
    {
      t: "Growth",
      p: "$99",
      s: "Ideal for growing businesses collaborating across multiple teams.",
      f: ["Up to 50 Users", "100GB Storage", "60M AI Tokens", "Unlimited Connectors", "Priority Support"],
      cta: "Start 14-day trial",
      highlight: true,
      slug: "growth",
    },
    {
      t: "Business",
      p: "$249",
      s: "Advanced collaboration, security, and scalability for large organizations.",
      f: ["Up to 200 Users", "500GB Storage", "250M AI Tokens", "SOC 2, SSO, SCIM", "Dedicated CSM"],
      cta: "Book Demo",
      highlight: false,
      slug: "business",
    },
  ];

  return (
    <section id="pricing" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4">
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
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p, i) => (
            <Reveal key={p.t} delay={i * 0.05}>
              <div
                className={
                  "group relative flex flex-col h-full overflow-hidden rounded-[24px] border p-7 transition-all duration-300 hover:-translate-y-1 " +
                  (p.highlight
                    ? "border-gold-soft/50 bg-gradient-to-br from-[#1c180e] to-surface ring-1 ring-gold-glow/30"
                    : "border-white/10 bg-surface/60 hover:bg-surface hover:border-white/20")
                }
              >
                {p.highlight && (
                  <div className="absolute inset-0 -z-10 opacity-50 bg-[radial-gradient(ellipse_at_top,rgba(232,200,106,0.15),transparent_70%)]" />
                )}
                {p.highlight && (
                  <div className="absolute right-5 top-5 rounded-full bg-gold-gradient px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#17130A] shadow-[0_0_15px_rgba(232,200,106,0.3)]">
                    Most Popular
                  </div>
                )}
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {p.t}
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  <div className="font-display text-4xl font-semibold tracking-tight text-foreground">{p.p}</div>
                  <div className="text-xs font-medium text-muted-foreground">/mo</div>
                </div>
                <div className="mt-3 text-[13px] leading-relaxed text-muted-foreground h-[60px]">
                  {p.s}
                </div>
                <div className="my-6 h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
                <ul className="mb-8 space-y-3.5 text-[13.5px]">
                  {p.f.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-foreground/80">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-gold-soft" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`/subscription?plan=${p.slug}`}
                  className={
                    "mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all " +
                    (p.highlight
                      ? "btn-gold btn-gold-hover shadow-[0_0_20px_rgba(232,200,106,0.2)] hover:shadow-[0_0_30px_rgba(232,200,106,0.4)]"
                      : "border border-white/10 bg-white/[0.02] text-foreground hover:bg-white/[0.06]")
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
        <div className="relative overflow-hidden rounded-[32px] glass p-10 text-center md:p-16">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="absolute inset-0 noise-after" />
            <div className="absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(201,152,43,0.25),transparent_70%)]" />
          </div>
          <SectionTag>The Future of Enterprise Knowledge</SectionTag>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight tracking-[-0.02em] md:text-6xl font-display">
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
