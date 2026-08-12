"use client";

import { useState, useMemo } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { useRoles } from "@/hooks/use-roles";
import { RolesList } from "./RolesList";
import { RoleForm } from "./RoleForm";
import { Role } from "@/types/roles";
import {
  Shield,
  ShieldPlus,
  ShieldAlert,
  ShieldCheck,
  Users,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: boolean;
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-2xl border p-4 transition-all",
        accent
          ? "border-[#C9982B]/20 bg-[#C9982B]/[0.04]"
          : "border-white/5 bg-white/[0.015]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          accent
            ? "bg-gold-gradient text-[#17130A]"
            : "bg-white/[0.04] border border-white/10 text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl font-bold text-foreground leading-none">
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1 truncate">
          {label}
        </div>
      </div>
    </div>
  );
}

export default function RolesPage() {
  const {
    roles,
    isLoading,
    isError,
    createRole,
    isCreating,
    updateRole,
    isUpdating,
    deleteRole,
    createRoleError,
    updateRoleError,
  } = useRoles();

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const stats = useMemo(() => {
    const total = roles?.length || 0;
    const systemCount = roles?.filter((r) => r.isSystemRole).length || 0;
    const customCount = total - systemCount;
    const totalUsers = roles?.reduce(
      (sum, r) => sum + (r.users?.length || 0),
      0
    ) || 0;

    return { total, systemCount, customCount, totalUsers };
  }, [roles]);

  const handleEditClick = (role: Role) => {
    setEditingRole(role);
    setIsFormOpen(true);
  };

  const handleCreateClick = () => {
    setEditingRole(null);
    setIsFormOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {!isFormOpen && (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
              <div>
                <h1 className="text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
                  <Shield className="h-6 w-6 text-[color:var(--gold-soft)]" />{" "}
                  Roles & Permissions
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Define access control hierarchies, create client-specific
                  customized positions, and toggle feature flags.
                </p>
              </div>
              <button
                onClick={handleCreateClick}
                className="btn-gold btn-gold-hover inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold"
              >
                <ShieldPlus className="h-4 w-4" /> Create Custom Role
              </button>
            </div>

            {/* Stats overview */}
            {!isLoading && !isError && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                  icon={<Shield className="h-5 w-5" />}
                  label="Total Roles Registered"
                  value={stats.total}
                  accent
                />
                <StatCard
                  icon={<ShieldAlert className="h-5 w-5" />}
                  label="System Core Roles"
                  value={stats.systemCount}
                />
                <StatCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  label="Custom Defined Roles"
                  value={stats.customCount}
                />
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  label="Total Mapped Accounts"
                  value={stats.totalUsers}
                />
              </div>
            )}
          </>
        )}

        {isFormOpen ? (
          <div className="glass-strong rounded-3xl p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
            <RoleForm
              editingRole={editingRole}
              onClose={() => {
                setIsFormOpen(false);
                setEditingRole(null);
              }}
              onSubmit={(data) => {
                if (editingRole) {
                  updateRole(
                    { id: editingRole.id, body: data },
                    { onSuccess: () => setIsFormOpen(false) }
                  );
                } else {
                  createRole(data as any, {
                    onSuccess: () => setIsFormOpen(false),
                  });
                }
              }}
              isPending={editingRole ? isUpdating : isCreating}
              error={editingRole ? updateRoleError : createRoleError}
            />
          </div>
        ) : (
          <div className="glass-strong relative overflow-hidden rounded-3xl p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-sm font-semibold text-foreground/90 uppercase tracking-wider">
                Registered Role Clusters
              </h2>
              {!isLoading && !isError && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {stats.total} {stats.total === 1 ? "entry" : "entries"}
                </span>
              )}
            </div>

            {isLoading && (
              <div className="space-y-4 py-6">
                <div className="h-16 w-full animate-pulse rounded-2xl bg-white/[0.02]" />
                <div className="h-16 w-full animate-pulse rounded-2xl bg-white/[0.02]" />
                <div className="h-16 w-full animate-pulse rounded-2xl bg-white/[0.02]" />
              </div>
            )}

            {isError && (
              <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>
                  Failed to query systemic role clusters. Please verify your
                  permission boundaries.
                </span>
              </div>
            )}

            {!isLoading && !isError && (
              <RolesList
                roles={roles}
                onEdit={handleEditClick}
                onDelete={deleteRole}
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}