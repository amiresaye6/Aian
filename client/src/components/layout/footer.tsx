"use client";

import { AianLogo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-primary/20 py-14 bg-background">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <AianLogo />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              The enterprise organizational intelligence platform. One brain for every meeting,
              message, doc, ticket and repo.
            </p>
          </div>
          {[
            {
              t: "Product",
              i: ["Platform", "Agents", "Reports", "Pricing"],
            },
            {
              t: "Company",
              i: ["About", "Security", "Contact", "Careers"],
            },
          ].map((col) => (
            <div key={col.t}>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{col.t}</div>
              <ul className="mt-4 space-y-2 text-sm">
                {col.i.map((x) => (
                  <li key={x}>
                    <a
                      href="#"
                      className="text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} AIAN. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground">
              Terms
            </a>
            <a href="#" className="hover:text-foreground">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
