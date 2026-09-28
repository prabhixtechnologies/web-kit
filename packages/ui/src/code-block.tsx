import * as React from "react";
import { cn } from "./cn";
import { CopyButton } from "./copy-button";

export interface CodeBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  code: string;
  /** Shown in the header: a filename, a language, an endpoint. */
  title?: string;
  /** Turn off the copy button for a snippet nobody would paste. */
  copyable?: boolean;
  /** Line numbers. Off by default - they are noise on a three-line command. */
  numbered?: boolean;
}

/**
 * A block of code or a log excerpt.
 *
 * Deliberately not highlighted. Highlighting means shipping a tokeniser and a second colour
 * system that the contrast gate does not cover, and every place this is used in these apps is
 * a curl command, an API key or a stack trace - none of which a grammar would help with.
 *
 * `tabIndex={0}` on the scroller because a region that scrolls has to be reachable by keyboard;
 * without it a long line is unreadable to anyone not using a mouse.
 */
const CodeBlock = React.forwardRef<HTMLElement, CodeBlockProps>(
  ({ code, title, copyable = true, numbered = false, className, ...props }, ref) => {
    const lines = React.useMemo(() => code.replace(/\n$/, "").split("\n"), [code]);
    return (
      <figure
          ref={ref}
        className={cn("overflow-hidden rounded-xl border border-border bg-surface-muted", className)}
        {...props}
      >
        {(title || copyable) && (
          <figcaption className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
            <span className="truncate font-mono text-xs text-text-muted">{title}</span>
            {copyable && <CopyButton value={code} label={`Copy ${title ?? "code"}`} />}
          </figcaption>
        )}
        <div tabIndex={0} className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <pre className="p-3 font-mono text-xs leading-relaxed text-text">
            <code>
              {numbered
                ? lines.map((line, index) => (
                    <span key={index} className="grid grid-cols-[2.5ch_1fr] gap-3">
                      {/* Not part of the code, so it must not come along when it is copied -
                          which is the whole reason the numbers are markup and not text. */}
                      <span aria-hidden className="select-none text-right text-text-faint">
                        {index + 1}
                      </span>
                      <span>{line}</span>
                    </span>
                  ))
                : code}
            </code>
          </pre>
        </div>
      </figure>
    );
  },
);
CodeBlock.displayName = "CodeBlock";

export { CodeBlock };
