"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  User,
  Building2,
  ShieldCheck,
  ShieldX,
  Mail,
  Calendar,
  AlertCircle,
  Trash2,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { Member } from "@/types/members";
import { Permission } from "@/types/roles";
import { RoleBadge } from "./RoleBadge";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { useRoleDetails, useAllPermissions, useRoles } from "@/hooks/use-roles";
import { useChangeRole, useChangeStatus, useRemoveMember } from "@/hooks/use-members";

interface MemberDetailsSheetProps {
  member: Member | null;
  organizationId: string;
  onClose: () => void;
}

function categoryLabel(key: string): string {
  const category = key.split(".")[0];
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function groupByCategory(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, p) => {
    const cat = categoryLabel(p.key);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);
}

export function MemberDetailsSheet({ member, organizationId, onClose }: MemberDetailsSheetProps) {
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  const { data: roleDetails, isLoading: roleLoading, isError: roleError } = useRoleDetails(
    member?.role.id ?? null,
  );
  const { data: allPermissions, isLoading: permsLoading, isError: permsError } = useAllPermissions();
  const { roles } = useRoles();

  const { mutate: changeRole, isPending: isChangingRole } = useChangeRole(organizationId);
  const { mutate: changeStatus, isPending: isChangingStatus } = useChangeStatus(organizationId);
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember(organizationId);

  const grantedPermissions = useMemo(
    () => (roleDetails?.permissions ?? []).map((rp) => rp.permission),
    [roleDetails],
  );

  const limitPermissions = useMemo(() => {
    if (!allPermissions) return [];
    const grantedIds = new Set(grantedPermissions.map((p) => p.id));
    return allPermissions.filter((p) => !grantedIds.has(p.id));
  }, [allPermissions, grantedPermissions]);

  const grantedGrouped = useMemo(() => groupByCategory(grantedPermissions), [grantedPermissions]);
  const limitsGrouped = useMemo(() => groupByCategory(limitPermissions), [limitPermissions]);

  const accessDataUnavailable = roleError || permsError;

  if (!member) return null;

  const isPending = member.memberStatus === "invited";
  const isDeactivated = member.memberStatus === "deactivated";

  return (
    <>
      <Sheet open={!!member} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-xl glass-strong border-l border-white/5 p-0 flex flex-col gap-0 shadow-2xl">
          <SheetHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/10 to-gold-deep/10 border border-gold/20 flex items-center justify-center shadow-lg shrink-0 text-[15px] font-bold text-gold uppercase">
                {member.fullName.charAt(0)}
              </div>
              <div className="flex flex-col flex-1 gap-1 min-w-0">
                <SheetTitle className="text-xl font-display tracking-tight text-foreground break-words">
                  {member.fullName}
                </SheetTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <RoleBadge roleKey={member.role.key} roleName={member.role.name} />
                  <span className="text-xs text-muted-foreground">
                    Member ID: {member.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 w-full overflow-hidden">
            <div className="p-6 space-y-8 w-full max-w-full">
              {/* Account Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <User className="w-4 h-4 text-gold shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Account Details
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Email
                    </p>
                    <p className="text-sm text-foreground break-all">
                      {isPending ? "Not set" : member.email}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" /> Organization
                    </p>
                    <p className="text-sm text-foreground">{organizationId ? "Current Organization" : "Not set"}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Joined
                    </p>
                    <p className="text-sm text-foreground">
                      {member.joinedAt ? format(new Date(member.joinedAt), "MMM d, yyyy") : "Not set"}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                      Status
                    </p>
                    <p className="text-sm text-foreground capitalize">{member.memberStatus}</p>
                  </div>
                </div>
              </div>

              {accessDataUnavailable ? (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
                  <AlertCircle className="w-6 h-6 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Access details unavailable.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    You may not have permission to view role details.
                  </p>
                </div>
              ) : (
                <>
                  {/* System Access */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        System Access
                      </h3>
                    </div>
                    {roleLoading || permsLoading ? (
                      <Skeleton className="h-24 w-full rounded-2xl" />
                    ) : Object.keys(grantedGrouped).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No permissions granted.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(grantedGrouped).map(([category, perms]) => (
                          <div key={category} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              {category}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {perms.map((p) => (
                                <Badge
                                  key={p.id}
                                  variant="outline"
                                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] font-normal"
                                >
                                  {p.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Access Limits */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <ShieldX className="w-4 h-4 text-muted-foreground shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Access Limits
                      </h3>
                    </div>
                    {roleLoading || permsLoading ? (
                      <Skeleton className="h-24 w-full rounded-2xl" />
                    ) : Object.keys(limitsGrouped).length === 0 ? (
                      <p className="text-sm text-muted-foreground">This role has full access to everything.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(limitsGrouped).map(([category, perms]) => (
                          <div key={category} className="p-3 rounded-xl bg-white/[0.01] border border-white/5">
                            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                              {category}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {perms.map((p) => (
                                <Badge
                                  key={p.id}
                                  variant="outline"
                                  className="bg-white/[0.02] text-muted-foreground/60 border-white/10 text-[11px] font-normal"
                                >
                                  {p.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Actions
                  </h3>
                </div>

                {changingRole ? (
                  <div className="flex items-center gap-2">
                    <Select
                      defaultValue={member.role.id}
                      onValueChange={(roleId) => {
                        changeRole(
                          { memberId: member.id, payload: { roleId } },
                          { onSuccess: () => setChangingRole(false) },
                        );
                      }}
                    >
                      <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-sm">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChangingRole(false)}
                      disabled={isChangingRole}
                      className="border-white/10 bg-white/5 hover:bg-white/10 text-foreground"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setChangingRole(true)}
                    className="w-full justify-start border-white/10 bg-white/5 hover:bg-white/10 text-foreground"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" /> Change Role
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setConfirmDeactivate(true)}
                  className="w-full justify-start border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400"
                >
                  {isDeactivated ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Reactivate Member
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" /> Deactivate Member
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setConfirmRemove(true)}
                  className="w-full justify-start border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove Member
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        isPending={isChangingStatus}
        title={isDeactivated ? "Reactivate Member" : "Deactivate Member"}
        description={
          isDeactivated
            ? `"${member.fullName}" will regain access to the organization.`
            : `"${member.fullName}" will lose access to the organization until reactivated.`
        }
        confirmLabel={isDeactivated ? "Reactivate" : "Deactivate"}
        onConfirm={() =>
          changeStatus(
            {
              memberId: member.id,
              payload: { memberStatus: isDeactivated ? "active" : "deactivated" },
            },
            { onSuccess: () => setConfirmDeactivate(false) },
          )
        }
      />

      <ConfirmActionDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        isPending={isRemoving}
        title="Remove Member"
        description={`"${member.fullName}" will be permanently removed from the organization. This cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={() =>
          removeMember(member.id, {
            onSuccess: () => {
              setConfirmRemove(false);
              onClose();
            },
          })
        }
      />
    </>
  );
}