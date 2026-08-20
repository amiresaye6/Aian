"use client";

import { useState } from "react";
import { AlertOctagon, Trash2, X, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { useRouter } from "next/navigation";

interface DangerZoneProps {
  organizationName: string;
}

export function DangerZone({ organizationName }: DangerZoneProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();

  const { deleteOrganization, isDeleting, deleteOrganizationError } = useSettings();

  const serverErrorMessage =
    (deleteOrganizationError as any)?.response?.data?.message ||
    (deleteOrganizationError as any)?.message;

  const canConfirm = confirmText.trim() === organizationName;

  const handleDelete = () => {
    if (!canConfirm) return;
    deleteOrganization(undefined, {
      onSuccess: () => {
        router.push("/login");
      },
    });
  };

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl border border-destructive/20 p-7">
      <div className="flex items-center gap-2 mb-5">
        <AlertOctagon className="h-4 w-4 text-destructive" />
        <h2 className="font-display text-sm font-semibold text-destructive uppercase tracking-wider">
          Danger Zone
        </h2>
      </div>

      {!isConfirmOpen ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-destructive/15 bg-destructive/[0.03] p-4.5">
          <div>
            <div className="text-[13.5px] font-medium text-foreground">
              Delete this organization
            </div>
            <p className="text-[13px] text-muted-foreground/90 mt-1 max-w-xl">
              Permanently deletes all knowledge, connections, roles, and members
              tied to this organization. This action cannot be undone.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsConfirmOpen(true)}
            className="w-full sm:w-auto h-11 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Organization
          </Button>
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-destructive/25 bg-destructive/[0.04] p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="text-[14px] font-semibold text-foreground">
                  This will permanently delete &quot;{organizationName}&quot;
                </div>
                <p className="text-[13px] text-muted-foreground/90 mt-1">
                  All members, roles, connections, and knowledge data will be
                  removed. Type the organization name below to confirm.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsConfirmOpen(false);
                setConfirmText("");
              }}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {serverErrorMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{serverErrorMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Type &quot;{organizationName}&quot; to confirm
            </label>
            <Input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={organizationName}
              className="h-11 rounded-xl border-destructive/30 bg-white/[0.03] placeholder:text-muted-foreground/30 focus:border-destructive/50 focus-visible:ring-destructive/20 transition-all"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setConfirmText("");
              }}
              className="w-full sm:w-32 h-11 rounded-xl border-white/10 text-muted-foreground hover:bg-white/5"
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={!canConfirm || isDeleting}
              onClick={handleDelete}
              className="w-full sm:w-56 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-destructive text-destructive-foreground text-[14px] font-semibold transition-all hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}