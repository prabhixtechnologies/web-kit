import * as React from "react";

/*
  State that lives in the query string.

  Which filter is on, which column sorts, what was searched, which page - all of it was local
  component state across these apps, which means none of it survives a refresh, none of it can
  be sent to a colleague, and the back button does not undo it. "Look at this" currently means
  "open Orders, set status to refunded, sort by date, go to page three".

  Router-agnostic on purpose. OneOps is on react-router, marketing is on Next's app router, and
  a hook that imports either cannot live in a shared package. The History API is underneath both
  and `popstate` is how both learn about the back button, so this uses those directly. For
  query-only changes that is also the better behaviour: `history.replaceState` updates the URL
  without asking the router to re-run a loader, and typing in a search box should not.
*/

/** Fired after this hook writes, so that two hooks on one page stay in step. */
const CHANGED = "px-url-state";

function currentParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/**
 * The query string as a string, which is what `useSyncExternalStore` needs: it compares
 * snapshots by identity, and a fresh `URLSearchParams` every call would loop forever.
 */
function snapshot() {
  return typeof window === "undefined" ? "" : window.location.search;
}

const serverSnapshot = () => "";

export interface UrlStateOptions<T> {
  /** Turn the value into a query-string value, or null to drop the key entirely. */
  serialise: (value: T) => string | null;
  parse: (raw: string | null) => T;
  /**
   * `replace` for anything that changes as you type or click within a view - a search box, a
   * sort. `push` for something you would expect the back button to undo, which in practice is
   * only paging.
   */
  history?: "replace" | "push";
}

/**
 * One value, kept in the query string.
 *
 * The key is removed rather than written empty when `serialise` returns null, so a default
 * view has a clean URL and two people on the same view have the same link.
 */
export function useUrlState<T>(
  key: string,
  { serialise, parse, history = "replace" }: UrlStateOptions<T>,
): [T, (value: T) => void] {
  const search = React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const value = React.useMemo(
    () => parse(new URLSearchParams(search).get(key)),
    // `parse` is usually an inline arrow, so depending on it would re-parse every render.
    // The search string and the key are what actually determine the answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, key],
  );

  const set = React.useCallback(
    (next: T) => {
      const params = currentParams();
      const raw = serialise(next);
      if (raw === null || raw === "") params.delete(key);
      else params.set(key, raw);

      const query = params.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      if (history === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
      window.dispatchEvent(new Event(CHANGED));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, history],
  );

  return [value, set];
}

/** A string in the query string, absent when it equals the default. */
export function useUrlString(key: string, fallback = "", history?: "replace" | "push") {
  return useUrlState<string>(key, {
    parse: (raw) => raw ?? fallback,
    serialise: (value) => (value === fallback ? null : value),
    history,
  });
}

/** A number, falling back when the query string holds something that is not one. */
export function useUrlNumber(key: string, fallback: number, history?: "replace" | "push") {
  return useUrlState<number>(key, {
    parse: (raw) => {
      const parsed = Number(raw);
      return raw !== null && Number.isFinite(parsed) ? parsed : fallback;
    },
    serialise: (value) => (value === fallback ? null : String(value)),
    history,
  });
}

/** A set of values under one key, comma-separated: `?status=open,paid`. */
export function useUrlSet(key: string, history?: "replace" | "push") {
  const [raw, setRaw] = useUrlState<string>(key, {
    parse: (value) => value ?? "",
    serialise: (value) => (value === "" ? null : value),
    history,
  });

  const value = React.useMemo(
    () => new Set(raw ? raw.split(",").filter(Boolean) : []),
    [raw],
  );

  const set = React.useCallback(
    (next: Set<string>) => {
      // Sorted, so that picking the same two filters in a different order produces the same
      // URL. Two links to the same view should be the same link.
      setRaw([...next].sort().join(","));
    },
    [setRaw],
  );

  return [value, set] as const;
}

/** An on/off flag, present in the URL only when on. */
export function useUrlFlag(key: string, history?: "replace" | "push") {
  return useUrlState<boolean>(key, {
    parse: (raw) => raw === "1" || raw === "true",
    serialise: (value) => (value ? "1" : null),
    history,
  });
}
