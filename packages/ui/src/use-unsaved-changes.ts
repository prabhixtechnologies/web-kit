import * as React from "react";

/*
  The "you have unsaved changes" guard.

  None of these apps had one. A half-filled work order, a draft reply, a part being priced -
  click a nav link and it is gone, with no warning and no way back. This is the most expensive
  small defect in the whole audit, because the cost lands entirely on the person who typed the
  most.

  Two halves, because the browser only lets us handle one of them:

  - Leaving the site or reloading is `beforeunload`. The browser shows its own wording and
    will not let us change it. It also, correctly, refuses to show anything at all unless the
    person has interacted with the page, so this cannot be used to trap anyone.
  - Navigating within the app is ours, and is the case that actually happens. The browser
    knows nothing about it, so the app has to ask before it routes.
*/

/**
 * Warns before a reload or a close while `dirty` is true.
 *
 * Only guards the browser-level exit. In-app navigation is `useNavigationGuard`.
 */
export function useBeforeUnload(dirty: boolean) {
  React.useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      // `preventDefault` is the modern signal; `returnValue` is what older browsers read. Both
      // are needed, and neither can set the message any more.
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

export interface NavigationGuard {
  /** True while the confirm dialog should be open. */
  blocked: boolean;
  /** Go anyway - runs the navigation that was intercepted. */
  proceed: () => void;
  /** Stay here. */
  cancel: () => void;
  /**
   * Wrap any navigation the guard should cover. Returns a function that either navigates
   * straight away or holds it until the dialog is answered.
   */
  guard: (navigate: () => void) => () => void;
}

/**
 * Intercepts in-app navigation while `dirty` is true.
 *
 * Router-agnostic, which is why the caller passes the navigation in rather than this hook
 * calling a router: react-router's `useBlocker` and Next's app router disagree about whether
 * blocking is even possible, and a shared package cannot depend on either.
 *
 * ```tsx
 * const { blocked, proceed, cancel, guard } = useNavigationGuard(form.formState.isDirty);
 * <Button onClick={guard(() => navigate("/orders"))}>Back to orders</Button>
 * <ConfirmDialog open={blocked} onConfirm={proceed} onCancel={cancel} />
 * ```
 */
export function useNavigationGuard(dirty: boolean): NavigationGuard {
  const [pending, setPending] = React.useState<(() => void) | null>(null);
  useBeforeUnload(dirty);

  const guard = React.useCallback(
    (navigate: () => void) => () => {
      if (!dirty) {
        navigate();
        return;
      }
      // Stored as a value inside a setter callback, because `setState` with a function
      // argument would otherwise call it instead of storing it.
      setPending(() => navigate);
    },
    [dirty],
  );

  const proceed = React.useCallback(() => {
    // Cleared before running, so a navigation that throws does not leave the dialog open over
    // a page that may already have changed.
    const navigate = pending;
    setPending(null);
    navigate?.();
  }, [pending]);

  const cancel = React.useCallback(() => setPending(null), []);

  return { blocked: pending !== null, proceed, cancel, guard };
}

/**
 * Tracks whether a plain object of form values differs from where it started.
 *
 * For forms already on react-hook-form, use `formState.isDirty` instead - it does this
 * properly. This is for the hand-rolled ones, of which there are still plenty.
 */
export function useDirtyTracker<T extends Record<string, unknown>>(
  values: T,
  initial: T,
): boolean {
  return React.useMemo(() => {
    const keys = new Set([...Object.keys(values), ...Object.keys(initial)]);
    for (const key of keys) {
      const a = values[key];
      const b = initial[key];
      // An empty string and an absent value are the same thing in a form: clearing a field
      // that was never filled is not a change worth stopping someone over.
      if ((a ?? "") !== (b ?? "")) return true;
    }
    return false;
  }, [values, initial]);
}
