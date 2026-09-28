import * as React from "react";
import { cn } from "./cn";

/**
 * Whether this machine labels the command key Cmd or Ctrl.
 *
 * Read once, lazily, and never from `navigator.platform`, which is deprecated and lies on iPadOS.
 * `userAgentData.platform` is the supported reading; the userAgent fallback covers Firefox and
 * Safari, which do not implement it yet.
 */
function isApple() {
  if (typeof navigator === "undefined") return false;
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const platform = data?.platform ?? navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

const SYMBOLS: Record<string, { mac: string; other: string }> = {
  mod: { mac: "\u2318", other: "Ctrl" },
  meta: { mac: "\u2318", other: "Win" },
  cmd: { mac: "\u2318", other: "Ctrl" },
  ctrl: { mac: "\u2303", other: "Ctrl" },
  alt: { mac: "\u2325", other: "Alt" },
  option: { mac: "\u2325", other: "Alt" },
  shift: { mac: "\u21e7", other: "Shift" },
  enter: { mac: "\u21a9", other: "Enter" },
  escape: { mac: "Esc", other: "Esc" },
  esc: { mac: "Esc", other: "Esc" },
  backspace: { mac: "\u232b", other: "Backspace" },
  tab: { mac: "\u21e5", other: "Tab" },
  up: { mac: "\u2191", other: "\u2191" },
  down: { mac: "\u2193", other: "\u2193" },
  left: { mac: "\u2190", other: "\u2190" },
  right: { mac: "\u2192", other: "\u2192" },
};

/** The name a reader would say out loud, for the label a screen reader announces. */
const SPOKEN: Record<string, string> = {
  mod: "Command",
  meta: "Command",
  cmd: "Command",
  ctrl: "Control",
  alt: "Alt",
  option: "Option",
  shift: "Shift",
  enter: "Enter",
  escape: "Escape",
  esc: "Escape",
  backspace: "Backspace",
  tab: "Tab",
  up: "Up arrow",
  down: "Down arrow",
  left: "Left arrow",
  right: "Right arrow",
};

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * The chord, as key names: `["mod", "k"]`. `mod` resolves to Command on Apple hardware and
   * Control everywhere else, which is the one thing a hand-written `<kbd>Ctrl</kbd>` always
   * gets wrong on half the machines that read it.
   */
  keys: string[];
}

/**
 * A rendered keyboard shortcut.
 *
 * The glyphs are decoration: a screen reader saying "up arrow black" for U+2318 helps nobody, so
 * the visible symbols are hidden from the accessibility tree and a spoken label sits beside them.
 */
const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, keys, ...props }, ref) => {
  // Not useMemo: the answer cannot change for the life of the page, but it must not be read
  // during the server render, where it would bake one platform's glyphs into the HTML.
  const [apple, setApple] = React.useState(false);
  React.useEffect(() => setApple(isApple()), []);

  const spoken = keys
    .map((key) => SPOKEN[key.toLowerCase()] ?? key.toUpperCase())
    .join(" plus ");

  return (
    <span ref={ref} className={cn("inline-flex items-center gap-1", className)} {...props}>
      <span className="sr-only">{spoken}</span>
      {keys.map((key, index) => {
        const symbol = SYMBOLS[key.toLowerCase()];
        return (
          <kbd
            key={`${key}-${index}`}
            aria-hidden
            className="inline-flex min-w-5 items-center justify-center rounded border border-border bg-surface-muted px-1 font-sans text-[11px] font-medium leading-5 text-text-muted"
          >
            {symbol ? (apple ? symbol.mac : symbol.other) : key.toUpperCase()}
          </kbd>
        );
      })}
    </span>
  );
});
Kbd.displayName = "Kbd";

export { Kbd, isApple };
