import * as React from "react";
import { cn } from "./cn";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        // Height and horizontal padding from the density tokens, so a compact console gets a
        // compact field. `h-` rather than `min-h-`: an input is a single line and a growing
        // one would be a textarea.
        "flex h-[var(--px-density-control)] w-full rounded-md border border-border bg-surface px-[var(--px-density-pad-x)] py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
