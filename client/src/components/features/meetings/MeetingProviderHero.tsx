import type { ReactNode } from "react";
import type { Provider } from "../integrations/providers";
import { AnimatedEye } from "../integrations/components/AnimatedEye";
import { StatusBadge } from "../integrations/components/StatusBadge";

export function MeetingProviderHero({
  provider,
  step,
  actions,
}: {
  provider: Provider;
  step: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-6 md:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${provider.brand}, transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #E8C86A, transparent 70%)" }}
        />
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <AnimatedEye status={provider.status} size={96} glyph={provider.glyph} />
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
                AI Eye · {provider.category}
              </div>
              <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight md:text-[32px]">
                {provider.name}
              </h1>
              <p className="mt-1 max-w-xl text-[13.5px] text-muted-foreground">{provider.tagline}</p>
              <div className="mt-3">
                <StatusBadge status={provider.status} />
              </div>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}