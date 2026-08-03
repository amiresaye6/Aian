import Link from "next/link";
import { Users, Shield, Network, Zap, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

const ACTIONS = [
  { label: "Ask AIAN", href: "/dashboard/chat", icon: MessageSquare },
  { label: "Data Pipeline", href: "/dashboard/pipeline", icon: Zap },
  { label: "Knowledge Graph", href: "/dashboard/knowledge/entities", icon: Network },
  { label: "Manage Members", href: "/dashboard/members", icon: Users },
  { label: "Manage Roles", href: "/dashboard/roles", icon: Shield },
];

export function QuickActionsRow() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
      {ACTIONS.map((action) => (
        <Link key={action.href} href={action.href}>
          <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
              <action.icon className="h-4 w-4" />
            </div>
            <span className="text-[13.5px] font-medium text-foreground">{action.label}</span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
             