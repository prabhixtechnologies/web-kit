import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import * as React from "react";
import { Button } from "./button";
import { cn } from "./cn";

/*
  The banner that says something happened, or is about to.

  Every app had its own. OneOps used `.alert` classes, MobiStack a `<div className="notice">`,
  Mailroom a bordered div with an inline hex, and the marketing site nothing at all — so a
  warning looked like a different kind of object depending on which product raised it.
*/

/**
 * What the message is, not how loud it should be.
 *
 * The tone decides the colour, the icon and whether a screen reader is interrupted, and those
 * three have to agree: an error styled as a notice is announced politely, which is how a failed
 * payment gets missed.
 */
export type AlertTone = "info" | "success" | "warning" | "danger" | "neutral";

const TONES: Record<
  AlertTone,
  { box: string; icon: React.ComponentType<{ className?: string }>; live: "status" | "alert" }
> = {
  // The subtle triple — background, ink, border — rather than a hand-mixed tint. Each pair is
  // asserted at 4.5:1 on every run of the contrast gate, which an alpha tint of the status
  // colour is not: those track the status hue's own lightness and stay too close to it.
  info: { box: "bg-info-subtle text-info-subtle-ink border-info-subtle-border", icon: Info, live: "status" },
  success: {
    box: "bg-success-subtle text-success-subtle-ink border-success-subtle-border",
    icon: CheckCircle2,
    live: "status",
  },
  // `alert` for the two that mean something needs doing. It interrupts whatever a screen reader
  // is saying, which is right for a problem and wrong for a confirmation — a success message
  // announced that way talks over the thing the person was reading when it arrived.
  warning: {
    box: "bg-warning-subtle text-warning-subtle-ink border-warning-subtle-border",
    icon: AlertTriangle,
    live: "alert",
  },
  danger: {
    box: "bg-danger-subtle text-danger-subtle-ink border-danger-subtle-border",
    icon: XCircle,
    live: "alert",
  },
  neutral: { box: "bg-surface-muted text-text border-border", icon: Info, live: "status" },
};

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone;
  /** One line. The detail goes in the body, so the shape stays scannable in a stack. */
  title?: React.ReactNode;
  /**
   * Replaces the tone's icon. Pass `null` for no icon at all, which is only right where the
   * surrounding layout already carries the status — a field error under its own input, say.
   */
  icon?: React.ReactNode | null;
  /** Rendered bottom-right: "Retry", "Review permissions". Not a second way to dismiss. */
  action?: React.ReactNode;
  /** Shows a close button. The alert stays mounted; the caller decides what to do. */
  onDismiss?: () => void;
  /** Overrides the close button's accessible name. Default: "Dismiss" plus the title. */
  dismissLabel?: string;
}

/**
 * A message about the state of the thing the person is looking at.
 *
 * Colour never carries the meaning alone: every tone has an icon and the text says what
 * happened, which is WCAG 1.4.1. That is also why `icon={null}` is opt-in rather than the
 * default — removing it is a decision about a specific layout, not a style preference.
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = "info", title, icon, action, onDismiss, dismissLabel, children, ...props }, ref) => {
    const { box, icon: ToneIcon, live } = TONES[tone];
    const showIcon = icon !== null;

    return (
      <div
        ref={ref}
        role={live}
        className={cn("flex gap-3 rounded-lg border p-3 text-sm", box, className)}
        {...props}
      >
        {showIcon && (
          // Decorative: the text already says what the tone means, so announcing the icon as
          // well reads the status twice.
          <span aria-hidden="true" className="mt-0.5 shrink-0">
            {icon ?? <ToneIcon className="size-4" />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={cn("[&_a]:underline", title && "mt-1")}>{children}</div>}
          {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDismiss}
            // Named, because an unlabelled X is announced as "button" and there may be several
            // on a page. The title is included so the name says which message closes.
            aria-label={dismissLabel ?? (typeof title === "string" ? `Dismiss: ${title}` : "Dismiss")}
            className="-mr-1 -mt-1 shrink-0 text-current hover:bg-surface/20"
          >
            <X />
          </Button>
        )}
      </div>
    );
  },
);
Alert.displayName = "Alert";

/**
 * The same message, stretched across the top of a region rather than sitting inside it.
 *
 * Square corners and a single bottom border, because a banner is part of the chrome: a rounded
 * card floating at the top of a page reads as content that failed to load.
 */
const Banner = React.forwardRef<HTMLDivElement, AlertProps>(({ className, ...props }, ref) => (
  <Alert ref={ref} className={cn("rounded-none border-x-0 border-t-0 px-4", className)} {...props} />
));
Banner.displayName = "Banner";

export { Alert, Banner };
