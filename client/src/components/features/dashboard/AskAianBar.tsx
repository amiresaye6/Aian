import { Sparkles, ArrowUp } from "lucide-react";

export function AskAianBar() {
  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-8">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-40 blur-[100px]"
        style={{ background: "radial-gradient(circle, #E8C86A, transparent 70%)" }}
      />
      <div className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
          <Sparkles className="h-3 w-3" /> Ask AIAN
        </div>
        <h2 className="font-display text-[28px] font-semibold leading-tight tracking-tight md:text-[36px]">
          Coming <span className="text-gold-gradient">soon</span>
        </h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
          AI-powered search across your organization is not available yet.
        </p>
        <div className="relative mt-6">
          <input
            disabled
            placeholder="Ask AIAN or search knowledge... (coming soon)"
            className="h-14 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] pl-5 pr-14 text-[15px] text-muted-foreground/50 outline-none placeholder:text-muted-foreground/40"
          />
          <button
            disabled
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-not-allowed items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground/40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}