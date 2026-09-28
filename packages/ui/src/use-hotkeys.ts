import * as React from "react";

/*
  Keyboard shortcuts, and the one rule that makes them safe: never fire while someone is typing.

  Every app here that grew a shortcut grew its own listener, and none of them checked. Press "n"
  in a search box in OneOps and it opens a new work order and throws the letter away. That is
  why single-key shortcuts get removed instead of fixed - the guard is the hard part, not the
  binding, so it belongs in one place.
*/

/**
 * A shortcut string: `mod+k`, `shift+?`, `g then i`, or just `n`.
 *
 * `mod` is Command on Apple platforms and Control everywhere else, which is the only reason
 * that word exists - `ctrl+k` on a Mac is a real and different chord (delete to end of line).
 */
export type Hotkey = string;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  // Checkboxes, radios and buttons rendered as inputs accept a keystroke without consuming
  // text, so a shortcut over one of those is not stealing anything.
  const type = (target as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "reset", "range", "color"].includes(type);
}

function matches(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+").map((part) => part.trim());
  const key = parts.pop() ?? "";
  const wanted = new Set(parts);
  const mod = event.metaKey || event.ctrlKey;

  if (wanted.has("mod") !== mod) return false;
  if (wanted.has("shift") !== event.shiftKey) return false;
  if (wanted.has("alt") !== event.altKey) return false;

  // `event.key` rather than `code`, so that a shortcut written as a letter still fires on a
  // Dvorak or AZERTY layout where that letter is under a different physical key.
  const pressed = event.key.toLowerCase();
  if (pressed === key) return true;
  // `?` requires shift on most layouts, and asking callers to write `shift+/` for "the help
  // key" is asking them to know the layout.
  if (key === "?" && pressed === "?") return true;
  return false;
}

export interface HotkeyOptions {
  /**
   * Off by default. A shortcut that fires while someone is mid-sentence in a note field is
   * worse than no shortcut. Turn it on only for chords with a modifier, where the keystroke
   * was never going to become text - mod+s on a form, mod+enter to send.
   */
  enableInInputs?: boolean;
  /** Suppress the shortcut without unbinding it - a disabled action, a closed panel. */
  enabled?: boolean;
  /** Default true. Turn it off for a shortcut that should also reach the browser. */
  preventDefault?: boolean;
}

/**
 * Binds one shortcut for as long as the component is mounted.
 *
 * Listens on the document in the bubble phase, so anything that handles the key itself and
 * calls `stopPropagation` - an open dialog, a combobox - wins, which is the behaviour you want.
 */
export function useHotkey(
  combo: Hotkey | Hotkey[],
  handler: (event: KeyboardEvent) => void,
  { enableInInputs = false, enabled = true, preventDefault = true }: HotkeyOptions = {},
) {
  // Kept in a ref so that an inline arrow - which is every call site - does not rebind the
  // listener on every render.
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;

  const combos = React.useMemo(() => (Array.isArray(combo) ? combo : [combo]), [combo]);
  const key = combos.join("|");

  React.useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      // A dead key mid-composition is part of a character being typed, not a shortcut.
      if (event.isComposing) return;
      if (!enableInInputs && isTypingTarget(event.target)) return;
      if (!key.split("|").some((one) => matches(event, one))) return;
      if (preventDefault) event.preventDefault();
      handlerRef.current(event);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, enabled, enableInInputs, preventDefault]);
}

/**
 * Two-key sequences: `g` then `i` for inbox, the Gmail convention.
 *
 * Distinct from `useHotkey` because a sequence needs a timeout and a pending-prefix state, and
 * folding that into the chord matcher makes both harder to read.
 */
export function useKeySequence(
  sequence: [string, string],
  handler: () => void,
  { enabled = true, timeout = 1200 }: { enabled?: boolean; timeout?: number } = {},
) {
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;
  const [first, second] = sequence;

  React.useEffect(() => {
    if (!enabled) return;
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function disarm() {
      armed = false;
      if (timer) clearTimeout(timer);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || isTypingTarget(event.target)) return;
      // A sequence is unmodified by definition; mod+g is the browser's find-next.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const pressed = event.key.toLowerCase();

      if (armed) {
        disarm();
        if (pressed === second.toLowerCase()) {
          event.preventDefault();
          handlerRef.current();
        }
        // Any other key ends the sequence rather than being swallowed, so `g` then a stray
        // keystroke does not eat the next real shortcut.
        return;
      }
      if (pressed === first.toLowerCase()) {
        armed = true;
        timer = setTimeout(disarm, timeout);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      disarm();
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [first, second, enabled, timeout]);
}
