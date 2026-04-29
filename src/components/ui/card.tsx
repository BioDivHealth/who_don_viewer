import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardVariant = "default" | "flush";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantMap: Record<CardVariant, string> = {
  default: "border border-rule bg-paper",
  flush: "border-t border-rule bg-transparent",
};

export function Card({ className, variant = "default", ...props }: CardProps): JSX.Element {
  return <div className={cn("rounded-none p-4 shadow-none", variantMap[variant], className)} {...props} />;
}
