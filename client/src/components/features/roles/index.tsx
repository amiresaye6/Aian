"use client";

import { useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { useRoles } from "@/hooks/use-roles";
import { RolesList } from "./RolesList";
import { RoleForm } from "./RoleForm";
import { Role } from "@/types/roles";
import { Button } from "@/components/ui/button";
import { Shield, ShieldPlus, AlertCircle } from "lucide-react";

export default function RolesPage() {
  const { roles, isLoading, isError, createRole, isCreating, updateRole, isUpdating, deleteRole, createRoleError, updateRoleError } = useRoles();
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
            <div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6 text-[color:var(--gold-soft)]" /> Roles & Permissions
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Define access control hierarchies, create client-specific customized positions, and toggle feature flags.
              </p>
            </div>
            <button
              onClick={handleCreateClick}
              className="btn-gold btn-gold-hover inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold"
            >
              <ShieldPlus className="h-4 w-4" /> Create Custom Role
            </button>
          </div>
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
                  updateRole({ id: editingRole.id, body: data }, { onSuccess: () => setIsFormOpen(false) });
                } else {
                  createRole(data as any, { onSuccess: () => setIsFormOpen(false) });
                }
              }}
              isPending={editingRole ? isUpdating : isCreating}
              error={editingRole ? updateRoleError : createRoleError}
            />
          </div>
        ) : (
          <div className="glass-strong relative overflow-hidden rounded-3xl p-7">
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
                <span>Failed to query systemic role clusters. Please verify your permission boundaries.</span>
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