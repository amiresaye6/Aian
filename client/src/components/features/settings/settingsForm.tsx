"use client";

import { useState, useEffect } from "react";
import { Save, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Organization, UpdateOrganizationBody } from "@/types/settings";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/hooks/use-settings";

interface SettingsFormProps {
  organization: Organization;
}

export function SettingsForm({ organization }: SettingsFormProps) {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [description, setDescription] = useState(organization.description || "");
  const [industry, setIndustry] = useState(organization.industry || "");
  const [country, setCountry] = useState(organization.country || "");
  const [timezone, setTimezone] = useState(organization.timezone || "");

  const {
    updateOrganization,
    isUpdating,
    updateOrganizationError,
    updateOrganizationSuccess,
  } = useSettings();

  useEffect(() => {
    setName(organization.name);
    setSlug(organization.slug);
    setDescription(organization.description || "");
    setIndustry(organization.industry || "");
    setCountry(organization.country || "");
    setTimezone(organization.timezone || "");
  }, [organization]);

  const serverErrorMessage =
    (updateOrganizationError as any)?.response?.data?.message ||
    (updateOrganizationError as any)?.message;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    const body: UpdateOrganizationBody = {
      name,
      slug,
      description,
      industry,
      country,
      timezone,
    };

    updateOrganization(body);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverErrorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Update Failed</div>
            <div className="text-xs text-destructive/90 leading-relaxed">{serverErrorMessage}</div>
          </div>
        </div>
      )}

      {updateOrganizationSuccess && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">Organization settings saved.</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Organization Name
          </label>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Acme Corporation"
            className="h-11 rounded-xl border-white/15 bg-white/[0.03] placeholder:text-muted-foreground/40 focus:border-white/30 focus:bg-white/[0.05] focus-visible:ring-[color:var(--gold-soft)]/30 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Organization Slug
          </label>
          <Input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="e.g., acme-corp"
            className="h-11 rounded-xl border-white/15 bg-white/[0.03] placeholder:text-muted-foreground/40 font-mono focus:border-white/30 focus:bg-white/[0.05] focus-visible:ring-[color:var(--gold-soft)]/30 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Industry
          </label>
          <Input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Financial Services"
            className="h-11 rounded-xl border-white/15 bg-white/[0.03] placeholder:text-muted-foreground/40 focus:border-white/30 focus:bg-white/[0.05] focus-visible:ring-[color:var(--gold-soft)]/30 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Country
          </label>
          <Input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., Egypt"
            className="h-11 rounded-xl border-white/15 bg-white/[0.03] placeholder:text-muted-foreground/40 focus:border-white/30 focus:bg-white/[0.05] focus-visible:ring-[color:var(--gold-soft)]/30 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Timezone
          </label>
          <Input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="e.g., Africa/Cairo"
            className="h-11 rounded-xl border-white/15 bg-white/[0.03] placeholder:text-muted-foreground/40 font-mono focus:border-white/30 focus:bg-white/[0.05] focus-visible:ring-[color:var(--gold-soft)]/30 transition-all"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a short description of your organization..."
            className="min-h-[85px] rounded-xl border-white/15 bg-white/[0.03] placeholder:text-muted-foreground/40 resize-none focus:border-white/30 focus:bg-white/[0.05] focus-visible:ring-[color:var(--gold-soft)]/30 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-[color:var(--gold-soft)]" />
        <span>Changing the slug updates every link that references this organization.</span>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
        <button
          type="submit"
          disabled={isUpdating}
          className="btn-gold btn-gold-hover w-full sm:w-48 h-11 inline-flex items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isUpdating ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}