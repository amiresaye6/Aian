"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, ArrowRight, ArrowLeft, MessageSquare, Video, ListChecks, Code2, Plug } from "lucide-react";
import { OnboardingLayout } from "@/layouts/OnboardingLayout";
import { cn } from "@/lib/utils";
import { onboardingApi, type ProviderSelection, type EyeTypeKey } from "@/api/onboarding";

const EYES: {
  key: EyeTypeKey;
  label: string;
  icon: typeof MessageSquare;
  providers: { key: string; name: string; desc: string; color: string; initial: string; availableInV1: boolean }[];
}[] = [
  {
    key: "chat",
    label: "Chat Eye",
    icon: MessageSquare,
    providers: [
      { key: "slack", name: "Slack", desc: "Channels, DMs, threads and files", color: "#611f69", initial: "S", availableInV1: true },
      { key: "microsoft_teams", name: "Microsoft Teams", desc: "Meetings, chats, files", color: "#4B53BC", initial: "T", availableInV1: false },
      { key: "discord", name: "Discord", desc: "Servers, channels and DMs", color: "#5865F2", initial: "D", availableInV1: false },
    ],
  },
  {
    key: "meeting",
    label: "Meeting Eye",
    icon: Video,
    providers: [
      { key: "zoom", name: "Zoom", desc: "Meetings and recordings", color: "#2D8CFF", initial: "Z", availableInV1: true },
      { key: "google_meet", name: "Google Meet", desc: "Meetings and transcripts", color: "#00897B", initial: "G", availableInV1: false },
      { key: "microsoft_teams", name: "Microsoft Teams", desc: "Meetings, chats, files", color: "#4B53BC", initial: "T", availableInV1: false },
    ],
  },
  {
    key: "task",
    label: "Task Eye",
    icon: ListChecks,
    providers: [
      { key: "jira", name: "Jira", desc: "Issues, sprints, roadmaps", color: "#0052CC", initial: "J", availableInV1: true },
      { key: "linear", name: "Linear", desc: "Issues, cycles and projects", color: "#5E6AD2", initial: "L", availableInV1: false },
      { key: "clickup", name: "ClickUp", desc: "Tasks, docs and goals", color: "#7B68EE", initial: "C", availableInV1: false },
    ],
  },
  {
    key: "coding",
    label: "Coding Eye",
    icon: Code2,
    providers: [
      { key: "github", name: "GitHub", desc: "Repos, PRs, commits, issues", color: "#24292e", initial: "G", availableInV1: true },
      { key: "gitlab", name: "GitLab", desc: "Repos, MRs and pipelines", color: "#FC6D26", initial: "G", availableInV1: false },
      { key: "bitbucket", name: "Bitbucket", desc: "Repos and pull requests", color: "#0052CC", initial: "B", availableInV1: false },
    ],
  },
];

export default function ProvidersPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<EyeTypeKey, string | null>>({
    chat: null,
    meeting: null,
    task: null,
    coding: null,
  });
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const selectProvider = (eyeType: EyeTypeKey, providerKey: string, availableInV1: boolean) => {
    if (!availableInV1) return;
    setSelected((prev) => ({ ...prev, [eyeType]: providerKey }));
  };

  const allSelected = EYES.every((eye) => selected[eye.key]);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleContinue = async () => {
    if (!allSelected) return;
    setLoading(true);
    setGlobalError(null);
    try {
      const providers: ProviderSelection[] = EYES.map((eye) => ({
        eyeType: eye.key,
        providerKey: selected[eye.key]!,
      }));
      await onboardingApi.updateProviders({ providers });
      await onboardingApi.completeOnboarding();
      router.push("/dashboard");
    } catch (err: any) {
      const response = err?.response?.data;
      setGlobalError(response?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      eyebrow="Providers"
      title={
        <>
          Choose your <span className="text-gold-gradient">Eyes&apos; providers</span>
        </>
      }
      subtitle="Pick one provider for each Eye. You can connect them for real later."
      maxWidth="max-w-6xl"
    >
      {globalError && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
          {globalError}
        </div>
      )}

      <div className="space-y-10">
        {EYES.map((eye, eyeIdx) => (
          <motion.div
            key={eye.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * eyeIdx }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-[color:var(--gold-soft)]">
                <eye.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-[16px] font-semibold text-foreground">{eye.label}</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {eye.providers.map((provider) => {
                const isSelected = selected[eye.key] === provider.key;
                return (
                  <motion.div
                    key={provider.key}
                    whileHover={provider.availableInV1 ? { y: -2 } : undefined}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border p-5 transition-all",
                      isSelected
                        ? "border-[color:var(--gold-soft)]/30 bg-black/[0.03] dark:bg-white/[0.04]"
                        : provider.availableInV1
                          ? "border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:border-black/20 dark:hover:border-white/20"
                          : "border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.015] opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-[16px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                          style={{ background: provider.color }}
                        >
                          {provider.initial}
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold text-foreground">{provider.name}</div>
                          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {eye.label}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--success)]/30 bg-[color:var(--success)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--success)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" /> Selected
                        </span>
                      )}
                      {!provider.availableInV1 && (
                        <span className="shrink-0 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-[13px] text-muted-foreground">{provider.desc}</p>
                    <button
                      type="button"
                      onClick={() => selectProvider(eye.key, provider.key, provider.availableInV1)}
                      disabled={!provider.availableInV1}
                      className={cn(
                        "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-[13px] font-semibold transition-all",
                        isSelected
                          ? "border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-muted-foreground hover:text-foreground"
                          : provider.availableInV1
                            ? "border-[color:var(--gold-soft)]/40 bg-black/[0.03] dark:bg-white/[0.03] text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
                            : "cursor-not-allowed border-black/5 dark:border-white/5 text-muted-foreground/50",
                      )}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-4 w-4 text-[color:var(--success)]" /> Selected
                        </>
                      ) : (
                        <>
                          <Plug className="h-4 w-4" /> Select
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={() => router.push("/organization")}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-muted-foreground">{selectedCount} / {EYES.length} selected</span>
          <button
            onClick={handleContinue}
            disabled={!allSelected || loading}
            className="btn-gold btn-gold-hover group inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-[13.5px] font-semibold disabled:opacity-50"
          >
            {loading ? "Saving..." : "Finish setup"}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}