import Link from "next/link";
import { Rocket, Plug, UserPlus, ShieldCheck, ArrowRight } from "lucide-react";

const GUIDES = [
  {
    title: "Getting started with AIAN",
    description: "A quick tour of your Owner dashboard and organization setup.",
    href: "/dashboard",
    icon: Rocket,
  },
  {
    title: "Connect your first Eye",
    description: "Link Slack, GitHub, Jira, Zoom, Trello, or Teams to start collecting knowledge.",
    href: "/dashboard",
    icon: Plug,
  },
  {
    title: "Invite your team",
    description: "Bring teammates in and assign the right role from day one.",
    href: "/dashboard/members",
    icon: UserPlus,
  },
  {
    title: "Roles & permissions",
    description: "Understand system roles or build a custom role for your team.",
    href: "/dashboard/roles",
    icon: ShieldCheck,
  },
];

export function QuickGuides() {
  return (
    <div>
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Quick Guides
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <Link
            key={guide.title}
            href={guide.href}
            className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.04]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <guide.icon className="h-[18px] w-[18px] text-[color:var(--gold-soft)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[14px] font-semibold text-foreground">{guide.title}</h4>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--gold-soft)]" />
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {guide.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}