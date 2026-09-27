import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "./cn";
import type { TagTone } from "./tags";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-surface-muted text-text",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border-strong text-text",
        success: "border-transparent bg-success-subtle text-success-subtle-ink",
        warning: "border-transparent bg-warning-subtle text-warning-subtle-ink",
        // A tint reads its three values from `--tag-*`, which `tone` sets. Kept separate
        // from the status variants because a category is not a state: a red label means
        // "the user called this red", a destructive badge means "this is dangerous".
        tint: "border-[var(--tag-border)] bg-[var(--tag-bg)] text-[var(--tag-ink)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Selects one of the fifteen generated swatches. Implies `variant="tint"`. */
  tone?: TagTone;
}

/**
 * Renders a `span`. It used to render a `div`, which is invalid inside the paragraphs and
 * table cells it is normally placed in, and which browsers recover from by splitting the
 * surrounding element.
 */
function Badge({ className, variant, tone, style, ...props }: BadgeProps) {
  const tinted = tone ? "tint" : variant;
  return (
    <span
      className={cn(badgeVariants({ variant: tinted }), className)}
      style={
        tone
          ? ({
              "--tag-bg": `var(--px-tag-${tone}-bg)`,
              "--tag-ink": `var(--px-tag-${tone}-ink)`,
              "--tag-border": `var(--px-tag-${tone}-border)`,
              ...style,
            } as React.CSSProperties)
          : style
      }
      {...props}
    />
  );
}

export { Badge, badgeVariants };
