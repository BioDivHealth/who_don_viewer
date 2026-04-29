import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className }: SectionHeaderProps): JSX.Element {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="label text-[11px]">{title}</h2>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
