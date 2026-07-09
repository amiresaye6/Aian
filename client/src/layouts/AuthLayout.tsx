import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AianLogo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NeuralBackdrop } from "@/components/features/landing/NeuralBackdrop";
import { AuthVisual } from "@/components/features/auth/AuthVisual";

function AuthHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <AianLogo />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

export interface AuthLayoutProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  visualVariant?: "graph" | "orbit" | "verify";
}

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  visualVariant = "graph",
}: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Global atmosphere from landing */}
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <div className="pointer-events-none absolute inset-0">
        <NeuralBackdrop density={30} />
      </div>
      {/* Ambient gold glows */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full opacity-30 blur-[140px]"
        style={{ background: "radial-gradient(circle, #15C2A7 0%, transparent 70%)" }}
        aria-hidden
      />

      <AuthHeader />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-6 pt-28 pb-10 md:px-10 lg:grid lg:grid-cols-12 lg:gap-10 lg:pt-32">
        {/* Left visual — 45% */}
        <section className="relative hidden lg:col-span-5 lg:flex lg:items-center">
          <AuthVisual variant={visualVariant} />
        </section>

        {/* Right auth — 55% */}
        <section className="relative flex flex-1 items-center lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative w-full max-w-[520px] lg:ml-auto"
          >
            {/* soft halo behind the surface */}
            <div
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[36px] opacity-60 blur-2xl"
              style={{
                background:
                  "radial-gradient(60% 50% at 50% 30%, rgba(201,152,43,0.22), transparent 70%)",
              }}
              aria-hidden
            />
            <div className="glass-strong relative overflow-hidden rounded-[28px] p-8 md:p-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
              {/* top hairline gradient */}
              <div
                className="pointer-events-none absolute inset-x-6 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(232,200,106,0.6), transparent)",
                }}
                aria-hidden
              />
              {eyebrow && (
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-gradient" />
                  {eyebrow}
                </div>
              )}
              <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-foreground md:text-[34px]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                  {subtitle}
                </p>
              )}
              <div className="mt-8">{children}</div>
            </div>
            {footer && (
              <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
            )}
          </motion.div>
        </section>
      </main>
    </div>
  );
}
