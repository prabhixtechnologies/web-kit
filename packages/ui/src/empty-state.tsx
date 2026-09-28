import { AlertTriangle, Inbox, RotateCcw, SearchX } from "lucide-react";
import * as React from "react";
import { Button } from "./button";
import { cn } from "./cn";

/*
  The three things a list can be when it has no rows, kept apart because they need different
  words and different buttons.

  Mailroom already had the best version of this in the portfolio and it is where the shape comes
  from. What it did not have, and what the other apps mostly lacked entirely, is the distinction
  below: "you have no invoices yet" and "no invoices match ACME" are not the same screen, and
  offering "Create invoice" to someone whose filter is too narrow is unhelpful.
*/

// `title` is omitted from the div's own attributes and redeclared below. The HTML attribute is a
// tooltip string, and this one is a heading that takes nodes — leaving both in scope makes the
// prop `string` and silently rejects `<>No invoices for <b>ACME</b></>`.
export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Defaults to an inbox tray. Pass `null` to drop it in a tight space such as a small card. */
  icon?: React.ReactNode | null;
  /**
   * What is missing, as a statement about this list: "No invoices yet". Not "Empty", which
   * tells someone who has just arrived nothing about where they are.
   */
  title: React.ReactNode;
  /** One sentence on how the list fills up. This is the part people act on. */
  hint?: React.ReactNode;
  /** The action that ends the empty state. Usually one button. */
  action?: React.ReactNode;
  /** Removes the vertical padding, for a state inside a card rather than a page. */
  compact?: boolean;
}

/**
 * A list with nothing in it yet.
 *
 * Centred and generously spaced on purpose: an empty list is the one moment the interface has
 * the person's whole attention and nothing competing for it, so it is the cheapest place to
 * explain what the screen is for.
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, hint, action, compact = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "px-4 py-8" : "px-6 py-16",
        className,
      )}
      {...props}
    >
      {icon !== null && (
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-accent-subtle text-accent-subtle-ink"
        >
          {icon ?? <Inbox className="size-6" />}
        </span>
      )}
      <div className="space-y-1">
        <p className="font-semibold text-text">{title}</p>
        {/* Capped, because a centred paragraph wider than about sixty characters is read as a
            wall rather than a sentence. */}
        {hint && <p className="mx-auto max-w-sm text-sm text-text-muted">{hint}</p>}
      </div>
      {action && <div className="flex flex-wrap justify-center gap-2 pt-1">{action}</div>}
    </div>
  ),
);
EmptyState.displayName = "EmptyState";

export interface NoResultsStateProps extends Omit<EmptyStateProps, "title" | "icon"> {
  /** Echoed back so it is obvious which term or filter produced nothing. */
  query?: string;
  /** Clears the filters. Almost always the only useful action here. */
  onClear?: () => void;
  clearLabel?: string;
  title?: React.ReactNode;
}

/**
 * A list that has rows, none of which match the current filter.
 *
 * Distinct from `EmptyState` because the remedy is different and so is the emotional read. The
 * query is quoted back for a practical reason: the commonest cause of no results is a filter
 * set on another screen and forgotten, and naming it is what makes that visible.
 */
const NoResultsState = React.forwardRef<HTMLDivElement, NoResultsStateProps>(
  ({ query, onClear, clearLabel = "Clear filters", title, hint, action, ...props }, ref) => (
    <EmptyState
      ref={ref}
      icon={<SearchX className="size-6" />}
      title={title ?? (query ? `No matches for "${query}"` : "No matches")}
      hint={hint ?? "Try a shorter term, or clear the filters to see everything."}
      action={
        action ?? (onClear && (
          <Button variant="outline" onClick={onClear}>
            {clearLabel}
          </Button>
        ))
      }
      {...props}
    />
  ),
);
NoResultsState.displayName = "NoResultsState";

export interface ErrorStateProps extends Omit<EmptyStateProps, "title" | "icon"> {
  title?: React.ReactNode;
  /**
   * What the server said. Shown verbatim rather than replaced with "Something went wrong",
   * because the specific message is the only thing that makes the difference between a person
   * retrying pointlessly and knowing they are offline or lack a permission.
   */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Disables the retry button while a refetch is in flight. */
  retrying?: boolean;
}

/**
 * A list that could not be loaded.
 *
 * `role="alert"` so it is announced: a person using a screen reader who triggered a load and
 * got silence has no way to tell a failure from a slow response.
 */
const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ className, title, message, onRetry, retryLabel = "Try again", retrying = false, hint, action, ...props }, ref) => (
    <EmptyState
      ref={ref}
      role="alert"
      className={cn("[&>span]:bg-danger-subtle [&>span]:text-danger-subtle-ink", className)}
      icon={<AlertTriangle className="size-6" />}
      title={title ?? "Could not load this"}
      hint={hint ?? message}
      action={
        action ?? (onRetry && (
          <Button variant="outline" onClick={onRetry} disabled={retrying}>
            <RotateCcw />
            {retrying ? "Retrying…" : retryLabel}
          </Button>
        ))
      }
      {...props}
    />
  ),
);
ErrorState.displayName = "ErrorState";

export { EmptyState, NoResultsState, ErrorState };
