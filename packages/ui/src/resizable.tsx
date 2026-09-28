import * as React from "react";
import { cn } from "./cn";

export interface ResizableProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Percentage of the container given to the first pane. */
  size: number;
  onSizeChange: (size: number) => void;
  min?: number;
  max?: number;
  direction?: "horizontal" | "vertical";
  /** Names the divider: "Resize the message list". */
  label: string;
  children: [React.ReactNode, React.ReactNode];
  /** How far one arrow press moves it, in percentage points. */
  step?: number;
}

/**
 * Two panes with a divider you can drag.
 *
 * The divider is a `separator` with `aria-valuenow`, focusable, and moved by the arrow keys -
 * a drag handle that only responds to a pointer is a layout nobody using a keyboard can
 * change, and on these consoles the split between list and detail is a real preference.
 *
 * Pointer events rather than mouse events, so a stylus and a touch drag work, and with
 * `setPointerCapture` so the drag survives the pointer leaving the handle - which it always
 * does, because the handle is four pixels wide.
 */
const Resizable = React.forwardRef<HTMLDivElement, ResizableProps>(
  (
    {
      size,
      onSizeChange,
      min = 20,
      max = 80,
      direction = "horizontal",
      label,
      children,
      step = 2,
      className,
      ...props
    },
    ref,
  ) => {
    const container = React.useRef<HTMLDivElement | null>(null);
    const horizontal = direction === "horizontal";
    const clamp = (value: number) => Math.min(max, Math.max(min, value));

    function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const box = container.current?.getBoundingClientRect();
      if (!box) return;
      const fraction = horizontal
        ? (event.clientX - box.left) / box.width
        : (event.clientY - box.top) / box.height;
      onSizeChange(clamp(fraction * 100));
    }

    return (
      <div
        ref={(node) => {
          container.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn("flex", horizontal ? "flex-row" : "flex-col", className)}
        {...props}
      >
        <div style={{ flexBasis: `${size}%` }} className="min-h-0 min-w-0 overflow-hidden">
          {children[0]}
        </div>

        <div
          role="separator"
          aria-label={label}
          aria-orientation={horizontal ? "vertical" : "horizontal"}
          aria-valuenow={Math.round(size)}
          aria-valuemin={min}
          aria-valuemax={max}
          tabIndex={0}
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
          onKeyDown={(event) => {
            const back = horizontal ? "ArrowLeft" : "ArrowUp";
            const forward = horizontal ? "ArrowRight" : "ArrowDown";
            if (event.key === back) {
              event.preventDefault();
              onSizeChange(clamp(size - step));
            } else if (event.key === forward) {
              event.preventDefault();
              onSizeChange(clamp(size + step));
            } else if (event.key === "Home") {
              event.preventDefault();
              onSizeChange(min);
            } else if (event.key === "End") {
              event.preventDefault();
              onSizeChange(max);
            }
          }}
          className={cn(
            "group relative shrink-0 bg-border transition-colors hover:bg-primary focus-visible:outline-none focus-visible:bg-primary",
            horizontal ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
          )}
        >
          {/* A one-pixel line is not a pointer target. This widens the grabbable area to 9px
              without widening the line, which is what every editor does and nobody notices. */}
          <span
            aria-hidden
            className={cn(
              "absolute",
              horizontal ? "inset-y-0 -left-1 -right-1" : "inset-x-0 -top-1 -bottom-1",
            )}
          />
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children[1]}</div>
      </div>
    );
  },
);
Resizable.displayName = "Resizable";

export { Resizable };
