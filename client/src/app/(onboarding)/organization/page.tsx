/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Globe,
  Clock,
  Brain,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
  Network,
  Video,
  Mail,
} from "lucide-react";
import { OnboardingLayout } from "@/layouts/OnboardingLayout";
import { cn } from "@/lib/utils";
import {
  onboardingApi,
  type CreateOrganizationPayload,
} from "@/api/onboarding";

const STEPS = [
  { id: 1, label: "Identity", icon: Building2 },
  { id: 2, label: "Profile", icon: Globe },
  { id: 3, label: "Operations", icon: Clock },
  { id: 4, label: "AI Setup", icon: Brain },
  { id: 5, label: "Review", icon: Sparkles },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-[14px] text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[color:var(--gold-soft)]/40 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(232,200,106,0.08)]";

function Select({
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(inputCls, "appearance-none pr-10")}>
      {children}
    </select>
  );
}

function Toggle({
  enabled,
  onChange,
  label,
  description,
  icon: Icon,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  icon: typeof Network;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={cn(
        "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all",
        enabled
          ? "border-[color:var(--gold-soft)]/40 bg-white/[0.05]"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          enabled
            ? "bg-gold-gradient text-[#17130A]"
            : "border border-white/10 bg-white/[0.03] text-muted-foreground",
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold text-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">
          {description}
        </div>
      </div>
      <div
        className={cn(
          "relative mt-1 h-5 w-9 rounded-full transition-colors",
          enabled ? "bg-gold-gradient" : "bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-all",
            enabled ? "left-4" : "left-0.5",
          )}
        />
      </div>
    </button>
  );
}

const INDUSTRIES = [
  "Technology",
  "Manufacturing",
  "Biotech",
  "Finance",
  "Consulting",
  "E-commerce",
  "Healthcare",
  "Education",
];
const COMPANY_SIZES = ["1-10", "10-50", "50-200", "200-1000", "1000+"];
const COUNTRIES = [
  "Egypt",
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Saudi Arabia",
  "UAE",
];
const TIMEZONES = [
  "Africa/Cairo",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
];
const WORKING_DAYS = ["Sun–Thu", "Mon–Fri", "Mon–Sat", "7 days"];
const FISCAL_YEARS = ["January", "April", "July", "October"];
const CURRENCIES = ["USD", "EUR", "GBP", "EGP", "SAR"];
const TONES = [
  "Professional",
  "Friendly",
  "Concise",
  "Analytical",
  "Executive",
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

interface FutureFields {
  workingDays: string;
  fiscalYear: string;
  currency: string;
  goals: string;
  tone: string;
  knowledgeGraph: boolean;
  meetings: boolean;
  email: boolean;
}

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const [form, setForm] = useState<CreateOrganizationPayload>({
    name: "",
    slug: "",
    description: "",
    industry: INDUSTRIES[0],
    companySize: COMPANY_SIZES[0],
    country: COUNTRIES[0],
    timezone: TIMEZONES[0],
  });

  const [future, setFuture] = useState<FutureFields>({
    workingDays: WORKING_DAYS[0],
    fiscalYear: FISCAL_YEARS[0],
    currency: CURRENCIES[0],
    goals: "",
    tone: TONES[0],
    knowledgeGraph: true,
    meetings: true,
    email: false,
  });

  const update = (k: keyof CreateOrganizationPayload, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "name") next.slug = slugify(v);
      return next;
    });
  };

  const updateFuture = <K extends keyof FutureFields>(
    k: K,
    v: FutureFields[K],
  ) => {
    setFuture((f) => ({ ...f, [k]: v }));
  };

  const validateStep = (s: number) => {
    if (s === 1)
      return form.name.trim().length >= 2 && form.slug.trim().length >= 2;
    if (s === 2)
      return form.industry && form.companySize && form.country && form.timezone;
    return true;
  };

  const handleSubmit = async () => {
  setLoading(true);
  setErrors({});
  setGlobalError(null);

  try {
    await onboardingApi.createOrganization(form);

    if (logoFile) {
      await onboardingApi.uploadOrganizationLogo(logoFile);
    }

    router.push("/providers");
  } catch (err: any) {
    const response = err?.response?.data;

    console.log("ERROR:", response);

    setGlobalError(
      response?.message ??
      response?.error ??
      "Something went wrong. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step === STEPS.length) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step === 1) {
      router.back();
    } else {
      setStep(step - 1);
    }
  };

  return (
    <OnboardingLayout
      eyebrow="Create organization"
      title={
        <>
          Set up your{" "}
          <span className="text-gold-gradient">organizational brain</span>
        </>
      }
      subtitle="A few details to tailor the AI, the memory graph and the operating model."
      maxWidth="max-w-4xl"
    >
      {/* Sub-stepper */}
      <div className="mb-8 flex items-center justify-center gap-2 overflow-x-auto">
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-all",
                  active
                    ? "border-[color:var(--gold-soft)]/50 bg-black/[0.06] dark:bg-white/[0.06] text-foreground"
                    : done
                      ? "border-[color:var(--gold-soft)]/30 bg-black/[0.03] dark:bg-white/[0.03] text-[color:var(--gold-soft)]"
                      : "border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <s.icon className="h-3.5 w-3.5" />
                )}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-black/10 dark:bg-white/10" />}
            </div>
          );
        })}
      </div>

      <div className="glass-strong relative overflow-hidden rounded-3xl p-8">
        {globalError && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
            {globalError}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {step === 1 && (
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Organization name">
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Acme Inc."
                  />
                  {errors["name"] && (
                    <p className="mt-1 text-[12px] text-red-400">
                      {errors["name"][0]}
                    </p>
                  )}
                </Field>
                <Field label="Organization slug">
                  <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] focus-within:border-[color:var(--gold-soft)]/40">
                    <span className="pl-4 pr-1 text-[13px] text-muted-foreground">
                      aian.co/
                    </span>
                    <input
                      className="h-11 flex-1 bg-transparent pr-4 text-[14px] outline-none"
                      value={form.slug}
                      onChange={(e) => update("slug", slugify(e.target.value))}
                    />
                  </div>
                  {errors["slug"] && (
                    <p className="mt-1 text-[12px] text-red-400">
                      {errors["slug"][0]}
                    </p>
                  )}
                </Field>
                <div className="md:col-span-2">
                  <Field label="Description">
                    <textarea
                      rows={3}
                      className={cn(inputCls, "h-auto py-3 leading-relaxed")}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="What does your company do?"
                    />
                    {errors["description"] && (
                      <p className="mt-1 text-[12px] text-red-400">
                        {errors["description"][0]}
                      </p>
                    )}
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Organization logo">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gold-gradient text-[24px] font-bold text-[#17130A] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                        {logoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          form.name.charAt(0).toUpperCase() || "?"
                        )}
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-3 text-[13px] text-muted-foreground transition-all hover:border-white/25 hover:text-foreground">
                        <Upload className="h-4 w-4" /> Upload logo (SVG, PNG)
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.svg"
                          className="hidden"
                          onChange={handleLogoSelect}
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground/70">
                      Upload your organization logo (SVG, PNG, JPG, JPEG, or
                      WebP).
                    </p>
                  </Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Industry">
                  <Select
                    value={form.industry}
                    onChange={(e) => update("industry", e.target.value)}
                  >
                    {INDUSTRIES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Company size">
                  <Select
                    value={form.companySize}
                    onChange={(e) => update("companySize", e.target.value)}
                  >
                    {COMPANY_SIZES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Country">
                  <Select
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                  >
                    {COUNTRIES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Timezone">
                  <Select
                    value={form.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                  >
                    {TIMEZONES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Working days">
                  <Select
                    value={future.workingDays}
                    onChange={(e) =>
                      updateFuture("workingDays", e.target.value)
                    }
                  >
                    {WORKING_DAYS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Fiscal year start">
                  <Select
                    value={future.fiscalYear}
                    onChange={(e) => updateFuture("fiscalYear", e.target.value)}
                  >
                    {FISCAL_YEARS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Default currency">
                  <Select
                    value={future.currency}
                    onChange={(e) => updateFuture("currency", e.target.value)}
                  >
                    {CURRENCIES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <Field label="Primary goals for AIAN">
                  <textarea
                    rows={2}
                    className={cn(inputCls, "h-auto py-3 leading-relaxed")}
                    value={future.goals}
                    onChange={(e) => updateFuture("goals", e.target.value)}
                    placeholder="Ship faster, reduce meeting overhead, unify tribal knowledge."
                  />
                </Field>
                <Field label="Preferred AI tone">
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateFuture("tone", t)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all",
                          future.tone === t
                            ? "border-[color:var(--gold-soft)]/50 bg-gold-gradient text-[#17130A]"
                            : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid gap-3 pt-2">
                  <Toggle
                    enabled={future.knowledgeGraph}
                    onChange={(v) => updateFuture("knowledgeGraph", v)}
                    label="Enable Knowledge Graph"
                    description="Automatically link entities, decisions and projects across your organization."
                    icon={Network}
                  />
                  <Toggle
                    enabled={future.meetings}
                    onChange={(v) => updateFuture("meetings", v)}
                    label="Enable Meeting Intelligence"
                    description="Transcribe, summarize and extract action items from Zoom, Meet and Teams calls."
                    icon={Video}
                  />
                  <Toggle
                    enabled={future.email}
                    onChange={(v) => updateFuture("email", v)}
                    label="Enable Email Intelligence"
                    description="Turn key email threads into indexed memory (opt-in per user)."
                    icon={Mail}
                  />
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gold-gradient text-[24px] font-bold text-[#17130A]">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      form.name.charAt(0).toUpperCase() || "?"
                    )}
                  </div>
                  <div>
                    <div className="font-display text-[22px] font-semibold">
                      {form.name || "—"}
                    </div>
                    <div className="text-[13px] text-muted-foreground">
                      aian.co/{form.slug || "—"}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Industry", form.industry],
                    ["Company size", form.companySize],
                    ["Country", form.country],
                    ["Timezone", form.timezone],
                    ["Working days", future.workingDays],
                    ["Fiscal year", future.fiscalYear],
                    ["Currency", future.currency],
                    ["AI tone", future.tone],
                    [
                      "Knowledge Graph",
                      future.knowledgeGraph ? "Enabled" : "Off",
                    ],
                    [
                      "Meeting Intelligence",
                      future.meetings ? "Enabled" : "Off",
                    ],
                    ["Email Intelligence", future.email ? "Enabled" : "Off"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
                    >
                      <span className="text-[12px] uppercase tracking-wide text-muted-foreground">
                        {k}
                      </span>
                      <span className="text-[13.5px] font-medium text-foreground">
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground/70">
                  Note: Operations and AI Setup preferences are saved locally
                  for now and will sync once supported by the backend.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
          <button
            onClick={goBack}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="text-[12px] text-muted-foreground">
            Step {step} of {STEPS.length}
          </div>
          <button
            onClick={goNext}
            disabled={!validateStep(step) || loading}
            className="btn-gold btn-gold-hover group inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-[13.5px] font-semibold disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : step === STEPS.length
                ? "Create organization"
                : "Continue"}
            {!loading && (
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
