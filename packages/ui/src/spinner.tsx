import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "./cn";

const spinnerVariants = cva("animate-spin rounded-full border-current border-r-transparent", {
  variants: {
    size: {
      sm: "size-4 border-2",
      default: "size-6 border-2",
      lg: "size-10 border-[3px]",
    },
  },
  defaultVariants: { size: "default" },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /**
   * What is being waited for. Announced politely, so a screen reader says "Loading orders"
   * rather than nothing at all - a spinner with no text is invisible to anyone not looking
   * at it.
   */
  label?: string;
}

/**
 * Prefer `Skeleton` where the shape of the result is known: it tells the reader what is coming
 * and does not move the page when it arrives. A spinner is for the cases where it is not - a
 * button mid-submit, a dialog waiting on one call.
 */
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, label = "Loading", ...props }, ref) => (
    <div ref={ref} role="status" className={cn("inline-flex items-center gap-2", className)} {...props}>
      {/* `motion-reduce` swaps the spin for a pulse: a rotating element is exactly what
          prefers-reduced-motion exists for, and removing the animation entirely would leave
          a static ring that reads as a decoration rather than as waiting. */}
      <span
        aria-hidden
        className={cn(spinnerVariants({ size }), "motion-reduce:animate-pulse motion-reduce:border-r-current")}
      />
      <span className="sr-only">{label}</span>
    </div>
  ),
);
Spinner.displayName = "Spinner";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100. Omit for an indeterminate bar, which is honest about not knowing. */
  value?: number;
  label: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, label, ...props }, ref) => {
    const determinate = typeof value === "number";
    const clamped = determinate ? Math.min(100, Math.max(0, value)) : undefined;
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-label={label}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        aria-valuenow={clamped}
        aria-valuetext={determinate ? `${Math.round(clamped!)}%` : undefined}
        className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-300",
            !determinate && "w-1/3 animate-pulse",
          )}
          style={determinate ? { width: `${clamped}%` } : undefined}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Spinner, Progress, spinnerVariants };
