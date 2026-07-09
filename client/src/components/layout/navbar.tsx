"use client";

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { AianLogo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const items = [
    ["Platform", "#pipeline"],
    ["Agents", "#agents"],
    ["Memory", "#memory"],
    ["Reports", "#reports"],
    ["Pricing", "#pricing"],
  ] as const;

  return (
    <header
      className={
        "fixed inset-x-0 top-0 z-50 transition-all duration-500 " +
        (scrolled ? "py-2" : "py-4")
      }
    >
      <div className="mx-auto max-w-6xl px-4">
        <nav
          className={
            "flex items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 " +
            (scrolled ? "glass-strong" : "border border-transparent")
          }
        >
          <AianLogo />
          <div className="hidden items-center gap-1 md:flex">
            {items.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="#cta"
              className="hidden rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Sign in
            </a>
            <a
              href="#cta"
              className="btn-gold btn-gold-hover inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium"
            >
              Start Free <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
export default Navbar;
