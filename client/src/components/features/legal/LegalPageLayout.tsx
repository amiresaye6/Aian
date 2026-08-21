"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { LegalDocument } from "./legal-content";

export function LegalPageLayout({ doc }: { doc: LegalDocument }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" aria-hidden />

      <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-24 md:px-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-[30px] font-semibold text-foreground md:text-[38px]">
            {doc.title}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Last updated: {doc.lastUpdated}
          </p>
        </div>

        {/* Academic disclaimer */}
        <div className="mb-10 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3.5 text-[13px] leading-relaxed text-amber-200/90">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            AIAN is a graduation project built for academic demonstration.
            This page describes how the platform actually works, but it has
            not been reviewed by legal counsel and does not constitute legal
            advice. It should not be relied on for a production or
            commercial deployment.
          </span>
        </div>

        <p className="mb-12 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {doc.intro}
        </p>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[220px_1fr]">
          {/* Desktop TOC */}
          <nav className="sticky top-24 hidden h-fit rounded-2xl border border-white/5 bg-white/[0.015] p-4 md:block">
            <div className="mb-2 px-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              On this page
            </div>
            <ul className="space-y-0.5">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  
                   <a href={`#${s.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  >
                    <span className="text-[10.5px] tabular-nums text-muted-foreground/50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile TOC */}
          <div className="-mx-6 mb-2 flex gap-2 overflow-x-auto px-6 pb-2 md:hidden">
            {doc.sections.map((s) => (
              <a
               key={s.id}
               href={`#${s.id}`}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-muted-foreground"
              >
                {s.title}
              </a>
            ))}
          </div>

          {/* Content */}
          <div className="min-w-0 space-y-12">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[13px] font-semibold tracking-[0.14em] text-muted-foreground/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-display text-[19px] font-semibold text-foreground md:text-[21px]">
                    {s.title}
                  </h2>
                </div>

                <div className="mt-4 space-y-3 border-l border-white/5 pl-6">
                  {s.content.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="text-[14.5px] leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}

                  {s.bullets && s.bullets.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {s.bullets.map((b, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-[14px] leading-relaxed text-muted-foreground"
                        >
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold-soft)]" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Footer contact note */}
        <div className="mt-16 border-t border-white/5 pt-8 text-center text-[13px] text-muted-foreground">
          Questions about this document?{" "}
          <Link
            href="/dashboard/contact"
            className="font-medium text-foreground hover:text-[color:var(--gold-soft)]"
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}