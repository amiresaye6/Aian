"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth/auth.store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  DollarSign,
  AlertTriangle,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import { AianMark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn, getImageUrl } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Overview", icon: DollarSign },
  { to: "/admin/organizations", label: "Organizations", icon: Building2 },
  { to: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { to: "/admin/alerts", label: "Quota Alerts", icon: AlertTriangle },
];

function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const pathname = usePathname();
  
  return (
    <aside
      className={cn(
        "relative hidden shrink-0 border-r border-black/5 dark:border-gold/10 bg-black/[0.03] dark:bg-[color:var(--surface)]/60 backdrop-blur-xl transition-[width] duration-300 md:flex md:flex-col",
        collapsed ? "w-[76px]" : "w-[260px]",
      )}
    >
      <div className="flex items-center justify-between p-4">
        <Link href="/admin" className={cn("flex items-center gap-2.5", collapsed && "justify-center w-full")}>
          <AianMark className="h-7 w-7 text-gold-deep dark:text-gold" />
          {!collapsed && (
            <span className="font-display text-[15px] font-semibold tracking-[0.18em] text-gold-deep dark:text-gold flex items-center gap-2">
              ADMIN <ShieldAlert className="w-4 h-4" />
            </span>
          )}
        </Link>
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto scrollbar-none space-y-0.5 px-3 pb-6">
        {!collapsed && (
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-deep/70 dark:text-gold/70">
            Platform Management
          </div>
        )}
        {NAV.map((item) => {
          const active = pathname === item.to || (pathname.startsWith(item.to) && item.to !== '/admin');
          return (
            <Link
              key={item.label}
              href={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-all",
                active
                  ? "bg-gold/10 text-gold-deep dark:text-gold-soft"
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/[0.04] hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gold-deep dark:bg-gold"
                  aria-hidden
                />
              )}
              <item.icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-gold-deep dark:text-gold")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/[0.02] py-2 text-[12px] text-muted-foreground transition-colors hover:bg-black/10 dark:hover:bg-white/[0.05] hover:text-foreground"
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-black/[0.03] dark:bg-[color:var(--background)]/70 px-4 backdrop-blur-xl md:px-6">
      <div className="text-sm font-medium text-muted-foreground">AIAN Super Admin</div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="ml-1 flex items-center gap-2.5 rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.03] py-1 pl-1 pr-3">
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gold-deep dark:bg-gold text-[12px] font-bold text-white">
            <img
              src={getImageUrl(user?.avatarUrl) || `https://ui-avatars.com/api/?name=${user?.fullName ?? "?"}&background=6366f1&color=ffffff&bold=true`}
              alt={user?.fullName ?? "User"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-[12.5px] font-semibold text-foreground">
              {user?.fullName ?? "Loading..."}
            </div>
            <div className="text-[10.5px] text-gold-deep dark:text-gold-soft">Super Admin</div>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.03] text-muted-foreground transition-colors hover:bg-black/10 dark:hover:bg-white/[0.06] hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-black/5 dark:border-white/10 bg-background/95 backdrop-blur-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out of your account?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground text-foreground">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
              >
                Sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Basic client-side protection
  if (isAuthenticated && !user?.isSuperAdmin) {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none fixed -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-10 blur-[140px]"
        style={{ background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)" }}
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
