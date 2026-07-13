"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, Info } from "lucide-react";
import { Role, CreateRoleBody } from "@/types/roles";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {rolesApi} from "@/api/roles/index";

interface RoleFormProps {
  editingRole: Role | null;
  onClose: () => void;
  onSubmit: (data: CreateRoleBody) => void;
  isPending: boolean;
}

export function RoleForm({ editingRole, onClose, onSubmit, isPending }: RoleFormProps) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<{ id: string; key: string; name: string; description?: string }[]>([]);
  useEffect(() => {
    if (editingRole) {
      setName(editingRole.name);
      setKey(editingRole.key);
      setDescription(editingRole.description || "");
      const pIds = editingRole.permissions?.map(p => p.permissionId) || [];
      setSelectedPermissionIds(pIds);
    }
  }, [editingRole]);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await rolesApi.getAllPermissions();
        setPermissions(response.data as any);
      } catch (error) {
        console.error("Error fetching permissions:", error);
      }
    };

    fetchPermissions();
  }, []);

  const togglePermission = (id: string) => {
    setSelectedPermissionIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!editingRole && !key)) return;

    onSubmit({
      name,
      key: editingRole ? undefined : key,
      description,
      permissionIds: selectedPermissionIds
    } as any);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-xl border border-white/5 bg-white/[0.02]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">
              {editingRole ? "Configure Security Mapping" : "Instantiate New Operational Role"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingRole ? `Modifying identity configuration parameters for token [ ${editingRole.key} ]` : "Setup global scope access variables and keys."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Display Descriptor Name
          </label>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Senior Systems Officer"
            className="h-11 rounded-xl border-white/10 bg-white/[0.01] focus-visible:ring-[color:var(--gold-soft)]/30"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
            Immutable Identity Key {!editingRole && <span className="text-[10px] text-[color:var(--gold-soft)] font-normal lowercase">(auto-formatting)</span>}
          </label>
          <Input
            type="text"
            required
            disabled={!!editingRole}
            value={key}
            onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
            placeholder="e.g., senior_systems_officer"
            className="h-11 rounded-xl border-white/10 bg-white/[0.01] font-mono disabled:opacity-30 focus-visible:ring-[color:var(--gold-soft)]/30"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Operational Purpose Boundary Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context regarding the scope of deployment and restrictions governing this account identity..."
            className="min-h-[75px] rounded-xl border-white/10 bg-white/[0.01] resize-none focus-visible:ring-[color:var(--gold-soft)]/30"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          <span>Cryptographic Permission Directives</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {permissions.map((perm) => {
            const isChecked = selectedPermissionIds.includes(perm.id);
            return (
              <div 
                key={perm.id}
                onClick={() => togglePermission(perm.id)}
                className={`group flex items-start gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  isChecked 
                    ? "bg-[#C9982B]/3 border-[#C9982B]/25 text-foreground shadow-[0_4px_20px_-5px_rgba(201,152,43,0.05)]" 
                    : "border-white/5 bg-white/[0.01] hover:bg-white/[0.02] text-muted-foreground"
                }`}
              >
                <Checkbox 
                  checked={isChecked}
                  onCheckedChange={() => togglePermission(perm.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 border-white/20 data-[state=checked]:bg-gold-gradient data-[state=checked]:border-transparent data-[state=checked]:text-[#17130A]"
                />
                <div className="space-y-0.5 select-none">
                  <div className={cn("text-[13.5px] font-medium transition-colors", isChecked && "text-foreground")}>
                    {perm.name}
                  </div>
                  <div className="text-[11px] opacity-60 leading-normal font-sans">
                    {perm.description || "No description provided for this permission."}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-[color:var(--gold-soft)]" />
        <span>Saving or restructuring these keys updates authentication sessions globally for accounts currently locked to this tier.</span>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="w-full sm:w-32 h-11 rounded-xl border-white/10 text-muted-foreground hover:bg-white/5"
        >
          Abort
        </Button>
        <button
          type="submit"
          disabled={isPending}
          className="btn-gold btn-gold-hover w-full sm:w-48 h-11 inline-flex items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          {isPending ? "Syncing Clusters..." : editingRole ? "Commit Mutation" : "Deploy Identity Tier"}
        </button>
      </div>
    </form>
  );
}