import type { SVGProps } from "react";

/**
 * AIAN Logo — an abstract mark suggesting an eye, a neural node,
 * and an infinite orbit of knowledge. Works monochrome or with gold gradient.
 */
export function AianMark({
  className,
  gradient = true,
  ...props
}: SVGProps<SVGSVGElement> & { gradient?: boolean }) {
  const id = "aian-gold";
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8C86A" />
          <stop offset="55%" stopColor="#C9982B" />
          <stop offset="100%" stopColor="#8A6416" />
        </linearGradient>
      </defs>
      {/* Outer almond — vision */}
      <path
        d="M20 6c8.5 0 14 6.4 14 14s-5.5 14-14 14S6 27.6 6 20 11.5 6 20 6Z"
        stroke={gradient ? `url(#${id})` : "currentColor"}
        strokeWidth="1.6"
        opacity="0.65"
      />
      {/* Inner lens */}
      <path
        d="M20 11.5c6.5 0 10.5 4.5 10.5 8.5S26.5 28.5 20 28.5 9.5 24 9.5 20 13.5 11.5 20 11.5Z"
        stroke={gradient ? `url(#${id})` : "currentColor"}
        strokeWidth="1.4"
      />
      {/* Neural core */}
      <circle cx="20" cy="20" r="3.4" fill={gradient ? `url(#${id})` : "currentColor"} />
      {/* Orbit nodes */}
      <circle cx="20" cy="6" r="1.4" fill={gradient ? `url(#${id})` : "currentColor"} />
      <circle cx="34" cy="20" r="1.4" fill={gradient ? `url(#${id})` : "currentColor"} />
      <circle cx="20" cy="34" r="1.4" fill={gradient ? `url(#${id})` : "currentColor"} />
      <circle cx="6" cy="20" r="1.4" fill={gradient ? `url(#${id})` : "currentColor"} />
    </svg>
  );
}

export function AianLogo({ className }: { className?: string }) {
  return (
    <div className={"flex items-center gap-2.5 " + (className ?? "")}>
      <AianMark className="h-7 w-7" />
      <span className="font-display text-[17px] font-semibold tracking-[0.18em] text-foreground">
        AIAN
      </span>
    </div>
  );
}
