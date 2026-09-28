import { Check, Copy } from "lucide-react";
import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { cn } from "./cn";

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  /** What was copied, for the tooltip and the announcement: "Copy order number". */
  label: string;
  /** Show the label beside the icon rather than only to a screen reader. */
  showLabel?: boolean;
}

/**
 * Copy, with the confirmation attached to the button rather than to a toast.
 *
 * The row menus across the apps copy through a toast, which is right there - the pointer is in
 * a menu that is about to close, so the feedback has to appear somewhere else. Here the button
 * stays under the pointer, so it can say so itself, and a toast for every field someone copies
 * out of a detail pane would be a stream of them.
 *
 * The state is announced as well as drawn. A tick that only changes colour is invisible to a
 * screen reader and to anyone who does not distinguish the two greens.
 */
const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  ({ value, label, showLabel = false, className, variant = "ghost", size, ...props }, ref) => {
    const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");
    const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    React.useEffect(() => () => clearTimeout(timer.current), []);

    async function copy() {
      clearTimeout(timer.current);
      try {
        await navigator.clipboard.writeText(value);
        setState("copied");
      } catch {
        // Denied permission, or an insecure origin. Saying so beats a tick that means nothing.
        setState("failed");
      }
      timer.current = setTimeout(() => setState("idle"), 2000);
    }

    const message =
      state === "copied" ? "Copied" : state === "failed" ? "Could not copy" : label;

    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size ?? (showLabel ? "sm" : "icon-sm")}
        onClick={() => void copy()}
        aria-label={showLabel ? undefined : message}
        title={showLabel ? undefined : message}
        className={cn(state === "failed" && "text-destructive", className)}
        {...props}
      >
        {state === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
        {showLabel && message}
        {/* Politely, not assertively: copying is something the reader just asked for, so it
            does not need to interrupt whatever is being read. */}
        <span aria-live="polite" className="sr-only">
          {state === "idle" ? "" : message}
        </span>
      </Button>
    );
  },
);
CopyButton.displayName = "CopyButton";

export { CopyButton };
