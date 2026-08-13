"use client";

import { motion, AnimatePresence } from "motion/react";
import { Shield, ShieldAlert, MoreVertical, Edit3, Trash2, Users, KeyRound } from "lucide-react";
import { Role } from "@/types/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface RolesListProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (id: string) => void;
}

export function RolesList({ roles, onEdit, onDelete }: RolesListProps) {
  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-16 text-center">
        <Shield className="h-9 w-9 text-muted-foreground mb-4" />
        <h3 className="font-display text-base font-semibold">No Roles Map Detected</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          No custom positions are registered for this node yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <AnimatePresence initial={false}>
        {roles.map((role) => {
          const isSystem = role.isSystemRole;
          const userCount = role.users?.length || 0;
          // Defensive: permissions may or may not be populated at list-level depending on API shape
          const permList = (role as any).permissions as Array<{ id?: string; permissionId?: string; name?: string; key?: string }> | undefined;
          const permCount = permList?.length || 0;
          const visiblePerms = permList?.slice(0, 3) || [];
          const extraPermCount = Math.max(permCount - visiblePerms.length, 0);

          return (
            <motion.div
              key={role.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="group flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.01] p-4.5 transition-all hover:bg-white/[0.025] hover:border-white/10"
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[14px] transition-transform group-hover:scale-105",
                  isSystem 
                    ? "bg-gold-gradient text-[#17130A]" 
                    : "bg-white/[0.04] border border-white/10 text-muted-foreground"
                )}>
                  {isSystem ? <ShieldAlert className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                </div>

                <div className="min-w-0 space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-medium text-[15px] text-foreground">{role.name}</span>
                    <Badge variant="outline" className="font-mono text-[10px] tracking-wide text-muted-foreground bg-white/[0.02] border-white/10 rounded px-1.5 py-0">
                      {role.key}
                    </Badge>
                    {isSystem && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#E8C86A] bg-[#C9982B]/10 px-2 py-0.5 rounded-full border border-[#C9982B]/20">
                        System Core
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground/90 line-clamp-1 max-w-2xl">
                    {role.description || "System assigned root access role."}
                  </p>

                  {/* Permission chips - only render if we actually have permission data */}
                  {permCount > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <KeyRound className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      {visiblePerms.map((perm, idx) => (
                        <span
                          key={perm.id || perm.permissionId || idx}
                          className="text-[10.5px] font-medium text-muted-foreground/80 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-0.5"
                        >
                          {perm.name || perm.key || "permission"}
                        </span>
                      ))}
                      {extraPermCount > 0 && (
                        <span className="text-[10.5px] font-medium text-[color:var(--gold-soft)] bg-[#C9982B]/[0.06] border border-[#C9982B]/15 rounded-md px-2 py-0.5">
                          +{extraPermCount} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground/60 pt-0.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>{userCount} {userCount === 1 ? 'user account' : 'user accounts'} mapped</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-white/5 pt-3 sm:border-0 sm:pt-0 shrink-0">
                {!isSystem ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 border-white/10 bg-[color:var(--popover)] text-popover-foreground">
                      <DropdownMenuItem onClick={() => onEdit(role)} className="cursor-pointer gap-2">
                        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" /> Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="border-white/5" />
                      <DropdownMenuItem 
                        onClick={() => onDelete(role.id)} 
                        disabled={userCount > 0}
                        className={cn(
                          "cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive",
                          userCount > 0 && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Terminate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-[11px] font-mono opacity-25 select-none pr-2">Immutable</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}