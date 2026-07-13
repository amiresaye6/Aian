import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  hint?: ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, FieldProps>(function AuthField(
  { label, icon, hint, className, type = "text", id, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const fieldId = id ?? label.replace(/\s+/g, "-").toLowerCase();
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="group/field">
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-[12px] font-medium tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <div
        className={cn(
          "relative flex items-center rounded-2xl border border-black/10 bg-black/[0.035] transition-all duration-300",
          "focus-within:border-[color:var(--gold-soft)]/60 focus-within:bg-black/[0.05]",
          "focus-within:shadow-[0_0_0_4px_rgba(232,200,106,0.12),0_10px_30px_-15px_rgba(201,152,43,0.5)]",
        )}
      >
        {icon && (
          <div className="pointer-events-none flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors group-focus-within/field:text-[color:var(--gold-soft)]">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={fieldId}
          type={inputType}
          className={cn(
            "peer h-11 w-full bg-transparent pr-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60",
            icon ? "pl-0" : "pl-4",
            isPassword && "pr-11",
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
          >
            <span className={"transition-all " + (show ? "rotate-0 scale-100" : "scale-90")}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </span>
          </button>
        )}
      </div>
      {hint && <div className="mt-1.5 text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
});