"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "@/store/auth/auth.store";
import {
  LayoutDashboard,
  BookOpen,
  Video,
  BarChart3,
  Plug,
  Users,
  Building2,
  CreditCard,
  Settings,
  HelpCircle,
  Search,
  Bell,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Command,
  Plus,
  Check,
  LogOut,
} from "lucide-react";
import { AianMark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard", label: "Knowledge", icon: BookOpen },
  { to: "/dashboard", label: "Meetings", icon: Video },
  { to: "/dashboard", label: "Reports", icon: BarChart3 },
  { to: "/dashboard", label: "Integrations", icon: Plug },
  { to: "/dashboard/members", label: "Members", icon: Users },
  { to: "/dashboard", label: "Organization", icon: Building2 },
  { to: "/dashboard", label: "Billing", icon: CreditCard },
];

const SECONDARY = [
  { to: "/dashboard", label: "Settings", icon: Settings },
  { to: "/dashboard", label: "Help", icon: HelpCircle },
];

function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const organization = useAuthStore((s) => s.user?.organization);

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5",
        collapsed && "justify-center",
      )}
    >
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gold-gradient text-[13px] font-bold text-[#17130A] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
        {organization?.charAt(0) ?? "?"}
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-foreground">
            {organization ?? "Loading..."}
          </div>
        </div>
      )}
    </div>
  );
}
function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "relative hidden shrink-0 border-r border-white/5 bg-[color:var(--surface)]/60 backdrop-blur-xl transition-[width] duration-300 md:flex md:flex-col",
        // "relative hidden shrink-0 border-r border-black/10 dark:border-white/5 bg-[color:var(--surface)]/60 backdrop-blur-xl transition-[width] duration-300 md:flex md:flex-col",
        collapsed ? "w-[76px]" : "w-[260px]",
      )}
    >
      <div className="flex items-center justify-between p-4">
        <Link href="/dashboard" className={cn("flex items-center gap-2.5", collapsed && "justify-center w-full")}>
          <AianMark className="h-7 w-7" />
          {!collapsed && (
            <span className="font-display text-[15px] font-semibold tracking-[0.18em] text-foreground">AIAN</span>
          )}
        </Link>
      </div>

      <div className="px-3">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <nav className="mt-6 flex-1 space-y-0.5 px-3">
        {!collapsed && (
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            Workspace
          </div>
        )}
        {NAV.map((item, i) => {
          const active = i === 0 && pathname === "/dashboard";
          return (
            <Link
              key={item.label}
              href={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-all",
                active
                  ? "bg-white/[0.06] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gold-gradient"
                  aria-hidden
                />
              )}
              <item.icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-[color:var(--gold-soft)]")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {!collapsed && (
          <div className="px-2 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            System
          </div>
        )}
        {SECONDARY.map((item) => (
          <Link
            key={item.label}
            href={item.to}
            className={cn(
              "flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-medium text-muted-foreground transition-all hover:bg-white/[0.04] hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-3">
        {!collapsed && (
          <div className="relative mb-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4">
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl"
              style={{ background: "radial-gradient(circle, #E8C86A, transparent 70%)", opacity: 0.35 }}
            />
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--gold-soft)]">
              <Sparkles className="h-3.5 w-3.5" /> Enterprise
            </div>
            <div className="mt-1.5 text-[13px] leading-snug text-foreground">
              Unlock advanced AI agents & Knowledge Graph.
            </div>
            <Link
              href="/onboarding/subscription"
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-foreground hover:text-[color:var(--gold-soft)]"
            >
              Upgrade →
            </Link>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] py-2 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : (<><ChevronsLeft className="h-4 w-4" /> Collapse</>)}
        </button>
      </div>
    </aside>
  );
}

function TopBar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-[color:var(--background)]/70 px-4 backdrop-blur-xl md:px-6">
      {/* ...search bar unchanged... */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <button className="..." aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold-gradient" />
        </button>
        <div className="ml-1 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-gradient text-[12px] font-bold text-[#17130A]">
            {user?.fullName?.charAt(0) ?? "?"}
          </div>
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-[12.5px] font-semibold text-foreground">
              {user?.fullName ?? "Loading..."}
            </div>
            <div className="text-[10.5px] text-muted-foreground">{user?.role ?? ""}</div>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-60" aria-hidden />
      <div
        className="pointer-events-none fixed -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-20 blur-[140px]"
        style={{ background: "radial-gradient(circle, #C9982B 0%, transparent 70%)" }}
        aria-hidden
      />
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="relative flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}