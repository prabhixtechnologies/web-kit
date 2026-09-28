import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "./cn";

export interface Step {
  id: string;
  label: string;
  /** One line under the label. Skip it on a horizontal stepper with more than four steps. */
  description?: string;
}

export interface StepperProps extends React.HTMLAttributes<HTMLElement> {
  steps: Step[];
  /** Index of the step being worked on. Everything before it counts as done. */
  current: number;
  orientation?: "horizontal" | "vertical";
  /** Names the sequence: "Checkout", "Set up your workspace". */
  label: string;
  /** Jump back to a finished step. Omit to make the sequence one-way. */
  onStepSelect?: (index: number) => void;
}

/**
 * Where you are in a sequence, and how much is left.
 *
 * An ordered list, because it is one, and because that is what makes the count available
 * without sight: a screen reader says "list, 4 items" and each step carries its own state in
 * words rather than in a tick and a colour. Two people cannot see the difference between the
 * green circle and the grey one.
 */
const Stepper = React.forwardRef<HTMLElement, StepperProps>(
  ({ steps, current, orientation = "horizontal", label, onStepSelect, className, ...props }, ref) => {
    const vertical = orientation === "vertical";
    return (
      <nav ref={ref} aria-label={label} className={className} {...props}>
        <ol className={cn("flex", vertical ? "flex-col gap-1" : "items-start gap-2")}>
          {steps.map((step, index) => {
            const done = index < current;
            const active = index === current;
            const reachable = done && Boolean(onStepSelect);
            const state = done ? "Completed" : active ? "Current step" : "Not started";

            const marker = (
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-text-faint",
                )}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </span>
            );

            const body = (
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    active ? "text-text" : done ? "text-text-muted" : "text-text-faint",
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="block text-xs text-text-muted">{step.description}</span>
                )}
                <span className="sr-only">{state}</span>
              </span>
            );

            return (
              <li
                key={step.id}
                aria-current={active ? "step" : undefined}
                className={cn("flex min-w-0", vertical ? "gap-3" : "flex-1 items-start gap-2")}
              >
                {reachable ? (
                  <button
                    type="button"
                    onClick={() => onStepSelect?.(index)}
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-lg p-1 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {marker}
                    {body}
                  </button>
                ) : (
                  <span className="flex min-w-0 flex-1 items-start gap-3 p-1">
                    {marker}
                    {body}
                  </span>
                )}
                {/* The connector is drawn per step rather than as a separate list item: a
                    decorative <li> between the real ones would make a four-step sequence
                    announce itself as seven. */}
                {index < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      vertical
                        ? "ml-3.5 w-px flex-1 self-stretch"
                        : "mt-4 h-px min-w-4 flex-1",
                      done ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  },
);
Stepper.displayName = "Stepper";

export { Stepper };
