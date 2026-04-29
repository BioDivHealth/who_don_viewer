import { cn } from "@/lib/utils";

interface BannerProps {
  className?: string;
  compact?: boolean;
}

export function Banner({ className, compact = false }: BannerProps): JSX.Element {
  return (
    <p
      className={cn(
        "label inline-flex rounded-sm border border-warn/35 bg-warn/10 text-warn",
        compact ? "px-2 py-1 normal-case tracking-normal" : "mx-auto px-3 py-2",
        className,
      )}
    >
      Row counts are WHO DON event records, not case counts.
    </p>
  );
}
