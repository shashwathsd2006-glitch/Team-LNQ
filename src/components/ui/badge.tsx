import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent text-background",
        secondary: "border-border bg-surface-2 text-muted",
        outline: "border-border text-muted",
        accent: "border-accent/20 bg-accent-soft text-accent",
        success: "border-green/20 bg-green-soft text-green",
        warning: "border-amber/20 bg-amber-soft text-amber",
        danger: "border-red/20 bg-red-soft text-red",
        violet: "border-violet/25 bg-violet/10 text-violet",
        subtle: "border-border/60 bg-surface text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
