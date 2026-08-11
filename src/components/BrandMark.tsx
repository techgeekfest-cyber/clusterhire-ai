import { cn } from "@/lib/utils";

/**
 * ClusterHire mark — three connected candidate nodes forming a cluster
 * around a filled "selected" hire node. Works at 16px and at 64px.
 */
export function BrandMark({ className, title = "ClusterHire" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={cn("h-8 w-8", className)}
      fill="none"
    >
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="8.25" className="fill-surface-2 stroke-border" strokeWidth="1.5" />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
        <path d="M10 11.5 L20.5 8.5" />
        <path d="M10 11.5 L19 17" />
        <path d="M10 11.5 L12 22" />
        <path d="M19 17 L12 22" />
        <path d="M19 17 L20.5 8.5" />
      </g>
      <circle cx="20.5" cy="8.5" r="2.1" fill="currentColor" opacity="0.6" />
      <circle cx="10" cy="11.5" r="2.1" fill="currentColor" opacity="0.6" />
      <circle cx="12" cy="22" r="2.1" fill="currentColor" opacity="0.6" />
      <circle cx="19" cy="17" r="3.4" className="fill-signal" />
    </svg>
  );
}

export function BrandLockup({
  className,
  markClassName,
  subtitle,
}: {
  className?: string;
  markClassName?: string;
  subtitle?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandMark className={cn("h-8 w-8 shrink-0 text-foreground", markClassName)} />
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] font-semibold tracking-tight text-foreground">
          ClusterHire
        </span>
        {subtitle && <span className="block eyebrow leading-tight">{subtitle}</span>}
      </span>
    </span>
  );
}
