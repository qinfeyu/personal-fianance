import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "income" | "expense" | "secondary" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    income: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    expense: "bg-red-500/20 text-red-300 border-red-500/30",
    secondary: "bg-white/10 text-foreground/80 border-white/10",
    outline: "border border-white/20 text-foreground/80",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
