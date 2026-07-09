import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
  arrow?: boolean;
}

export function AuthPrimaryButton({
  loading,
  children,
  arrow = true,
  className,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      disabled={loading || disabled}
      className={cn(
        "btn-gold btn-gold-hover group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 text-[15px] font-semibold tracking-tight disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      {...rest}
    >
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden
      />
      {loading ? (
        <motion.span
          key="l"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="inline-flex items-center gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Just a moment…
        </motion.span>
      ) : (
        <span className="inline-flex items-center gap-2">
          {children}
          {arrow && (
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          )}
        </span>
      )}
    </button>
  );
}

export function AuthSocialButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "group inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-[14px] font-medium text-foreground transition-all hover:border-white/20 hover:bg-white/[0.06] hover:-translate-y-[1px]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function AuthDivider({ label = "or continue with" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
    </div>
  );
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.6C16.9 3.3 14.7 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12S6.7 21.7 12 21.7c6.9 0 9.5-4.8 9.5-7.4 0-.5 0-.9-.1-1.3H12z"/>
      <path fill="#34A853" d="M3.5 7.6l3.2 2.3C7.5 8 9.6 6.4 12 6.4c1.9 0 3.1.8 3.9 1.5l2.6-2.6C16.9 3.3 14.7 2.3 12 2.3 8.2 2.3 4.9 4.4 3.5 7.6z" opacity=".01"/>
    </svg>
  );
}

export function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
