import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "pill";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantMap: Record<ButtonVariant, string> = {
  default: "bg-accent text-paper hover:bg-accent-hover",
  outline: "border border-rule bg-paper text-ink hover:bg-paper-2",
  ghost: "bg-transparent text-ink-muted hover:bg-paper-2 hover:text-ink",
  pill: "rounded-full border border-rule bg-paper text-ink hover:bg-paper-2",
};

export function Button({ className, variant = "default", ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:pointer-events-none disabled:opacity-50",
        variantMap[variant],
        className,
      )}
      {...props}
    />
  );
}
