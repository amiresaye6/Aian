import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";

export function ContactSupportBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-7 md:p-8">
      <div
        className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)" }}
        aria-hidden
      />
      <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <MessageCircle className="h-5 w-5 text-[color:var(--gold-soft)]" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Still need help?</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Can&apos;t find what you&apos;re looking for? Our support team is happy to help.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/contact"
          className="btn-gold btn-gold-hover inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold"
        >
          Contact Support <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}