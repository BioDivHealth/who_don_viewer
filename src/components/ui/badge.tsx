import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <span
      className={cn(
        "label inline-flex items-center rounded-sm border border-rule bg-paper-2 px-1.5 py-0.5 text-[10px] leading-none text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
