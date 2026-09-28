import * as React from "react";
import { cn } from "./cn";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal" | "both";
  /**
   * Names the region when it scrolls. A scrollable box is focusable, and a focusable thing
   * with no name is announced as "group" - useless. Required for that reason.
   */
  label: string;
}

/**
 * A scrolling region, with the native scrollbar styled rather than replaced.
 *
 * Radix has a ScrollArea that draws its own bar, and this is not it. An overlay scrollbar is a
 * custom control that has to re-implement wheel, touch momentum, keyboard paging and the OS
 * setting for whether bars are always visible - and when it gets any of that wrong the page
 * simply cannot be read. `scrollbar-color` and `::-webkit-scrollbar` cover every browser these
 * apps support and leave the behaviour to the platform.
 *
 * `tabIndex={0}` because a region that scrolls must be reachable by keyboard. Browsers are
 * beginning to do this automatically; none of them did when this was written.
 */
const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = "vertical", label, ...props }, ref) => (
    <div
      ref={ref}
      tabIndex={0}
      role="region"
      aria-label={label}
      className={cn(
        "px-scroll focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
        orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
        orientation === "both" && "overflow-auto",
        className,
      )}
      {...props}
    />
  ),
);
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
