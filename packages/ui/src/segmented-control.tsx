import * as React from "react";
import { cn } from "./cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Needed when the label is an icon, so the control still has a name. */
  srLabel?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Names the group: "View", "Date range". */
  label: string;
  size?: "sm" | "default";
}

/**
 * A short, exclusive choice where every option is worth seeing at once.
 *
 * Deliberately not `Tabs`: tabs switch between panels and carry `aria-controls` to say which,
 * and using them for a filter tells a screen reader there is a panel that does not exist. This
 * is a radio group, which is what "pick one of these" actually is, and it gets the radio group
 * keyboard contract for free - arrows move *and* select, tab leaves the group.
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  label,
  size = "default",
  className,
  ...props
}: SegmentedControlProps<T>) {
  const refs = React.useRef(new Map<T, HTMLButtonElement | null>());

  function move(direction: 1 | -1) {
    const usable = options.filter((option) => !option.disabled);
    const at = usable.findIndex((option) => option.value === value);
    // Wraps, which is what a radio group does and what the arrow keys are for.
    const next = usable[(at + direction + usable.length) % usable.length];
    if (!next) return;
    onValueChange(next.value);
    refs.current.get(next.value)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted p-1",
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        }
      }}
      {...props}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current.set(option.value, node);
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.srLabel}
            disabled={option.disabled}
            // One stop for the whole group: tab reaches the chosen option, arrows move within.
            // A group of five filters should not cost five presses to step over.
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
              size === "sm" ? "min-h-7 px-2.5 text-xs" : "min-h-9 px-3 text-sm",
              active
                ? "bg-surface-raised text-text shadow-[var(--px-elevation-1)]"
                : "text-text-muted hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
SegmentedControl.displayName = "SegmentedControl";

export { SegmentedControl };
