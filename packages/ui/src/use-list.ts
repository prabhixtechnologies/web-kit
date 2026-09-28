import * as React from "react";
import { useUrlNumber, useUrlString } from "./use-url-state";

/*
  The list engine.

  Every list view in these products re-implements the same five things, and each one gets a
  different subset of them right: a search box, some filters, a sort, paging, and a selection.
  OneOps' work orders debounce search but lose it on refresh; Mailroom filters without sorting;
  MobiStack's catalogue sorts but throws the sort away when you open an item and come back.

  This is the shared version, and it is headless - it returns state and the rows, and the view
  decides what a row looks like. Everything that describes what you are looking at goes in the
  URL, so refresh, back, and sending someone a link all work. Selection does not: it is about
  what you are about to do, not what you are looking at, and pasting someone a link that
  pre-selects forty rows for deletion is a trap.
*/

export type SortDirection = "asc" | "desc";

export interface ListSort {
  column: string;
  direction: SortDirection;
}

export interface UseListOptions<T> {
  rows: T[];
  /** Stable identity for a row. Selection survives re-sorting and re-filtering because of it. */
  getRowId: (row: T) => string;
  /**
   * The text a search matches against. Joined and lower-cased once per row per keystroke;
   * if a list is big enough for that to hurt, it is big enough to search on the server.
   */
  getSearchText?: (row: T) => string;
  /** Column id to comparable value. A column with no accessor is not sortable. */
  sortAccessors?: Record<string, (row: T) => string | number | Date | null | undefined>;
  /** Filter id to a predicate over the row and the chosen values. */
  filters?: Record<string, (row: T, selected: Set<string>) => boolean>;
  pageSize?: number;
  defaultSort?: ListSort;
  /** Distinguishes two lists on one page, so their query keys do not collide. */
  urlPrefix?: string;
}

export interface UseListResult<T> {
  /** The rows for the current page, after search, filters and sort. */
  rows: T[];
  /** Everything that survived search and filters, across all pages. Selection acts on this. */
  matched: T[];
  search: string;
  setSearch: (value: string) => void;
  sort: ListSort | null;
  /** Click a header: ascending, then descending, then unsorted. */
  toggleSort: (column: string) => void;
  filterValues: Record<string, Set<string>>;
  setFilter: (id: string, values: Set<string>) => void;
  clearFilters: () => void;
  /** How many filter values are active, for the "Filters (3)" badge and the clear button. */
  activeFilterCount: number;
  page: number;
  setPage: (page: number) => void;
  pageCount: number;
  selected: Set<string>;
  toggleRow: (id: string, checked?: boolean) => void;
  /** Shift-click: from the last row touched to this one, taking this one's new state. */
  selectRange: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  /** True when every matched row is selected, "indeterminate" when only some are. */
  allSelected: boolean | "indeterminate";
  /** True when the list is empty because of a search or filter rather than because there is
   *  nothing here. The two need different empty states and are constantly conflated. */
  emptyBecauseFiltered: boolean;
}

function compare(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  // Blanks last in ascending order. A column of dates where the empty ones sort first is a
  // column where the useful rows are on page four.
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  // Locale-aware and numeric, so "Bay 2" comes before "Bay 10".
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function useList<T>({
  rows,
  getRowId,
  getSearchText,
  sortAccessors,
  filters,
  pageSize = 25,
  defaultSort,
  urlPrefix = "",
}: UseListOptions<T>): UseListResult<T> {
  const key = (name: string) => (urlPrefix ? `${urlPrefix}_${name}` : name);

  const [search, setSearchRaw] = useUrlString(key("q"));
  const [sortRaw, setSortRaw] = useUrlString(
    key("sort"),
    defaultSort ? `${defaultSort.column}:${defaultSort.direction}` : "",
  );
  const [page, setPageRaw] = useUrlNumber(key("page"), 1, "push");

  const sort = React.useMemo<ListSort | null>(() => {
    if (!sortRaw) return null;
    const [column, direction] = sortRaw.split(":");
    if (!column || !sortAccessors?.[column]) return null;
    return { column, direction: direction === "desc" ? "desc" : "asc" };
  }, [sortRaw, sortAccessors]);

  const filterIds = React.useMemo(() => Object.keys(filters ?? {}), [filters]);

  // One `useUrlSet` per filter would be a hook in a loop. Reading the whole query string once
  // and splitting it here is the same thing without the rule violation.
  const [filterBlob, setFilterBlob] = useUrlString(key("f"));
  const filterValues = React.useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const id of filterIds) out[id] = new Set<string>();
    for (const chunk of filterBlob ? filterBlob.split(";") : []) {
      const [id, values] = chunk.split(":");
      if (id && out[id]) out[id] = new Set(values ? values.split(",").filter(Boolean) : []);
    }
    return out;
  }, [filterBlob, filterIds]);

  const writeFilters = React.useCallback(
    (next: Record<string, Set<string>>) => {
      setFilterBlob(
        Object.entries(next)
          .filter(([, values]) => values.size > 0)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, values]) => `${id}:${[...values].sort().join(",")}`)
          .join(";"),
      );
    },
    [setFilterBlob],
  );

  const matched = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && getSearchText && !getSearchText(row).toLowerCase().includes(needle)) {
        return false;
      }
      for (const id of filterIds) {
        const selectedValues = filterValues[id];
        // An empty filter means "no opinion", not "match nothing". Getting this backwards is
        // why a fresh list sometimes renders as zero rows.
        if (selectedValues && selectedValues.size > 0 && !filters?.[id]?.(row, selectedValues)) {
          return false;
        }
      }
      return true;
    });
  }, [rows, search, getSearchText, filters, filterIds, filterValues]);

  const sorted = React.useMemo(() => {
    if (!sort || !sortAccessors?.[sort.column]) return matched;
    const accessor = sortAccessors[sort.column];
    const sign = sort.direction === "desc" ? -1 : 1;
    // Copied before sorting: `matched` is memoised and sorting it in place would mutate a
    // value React believes has not changed.
    return [...matched].sort((a, b) => sign * compare(accessor(a), accessor(b)));
  }, [matched, sort, sortAccessors]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Clamped on read rather than corrected in an effect. Filtering a five-page list down to one
  // page while you are on page four should show you page one, not an empty table and then a
  // second render.
  const safePage = Math.min(Math.max(1, page), pageCount);
  const paged = React.useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  );

  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const lastTouched = React.useRef<string | null>(null);

  const setSearch = React.useCallback(
    (value: string) => {
      setSearchRaw(value);
      // Searching from page four and landing on an empty page four is the single most common
      // way a working search looks broken.
      setPageRaw(1);
    },
    [setSearchRaw, setPageRaw],
  );

  const toggleSort = React.useCallback(
    (column: string) => {
      if (!sortAccessors?.[column]) return;
      if (sort?.column !== column) setSortRaw(`${column}:asc`);
      else if (sort.direction === "asc") setSortRaw(`${column}:desc`);
      // Third click clears it, so there is a way back to the list's own order without a reload.
      else setSortRaw("");
      setPageRaw(1);
    },
    [sort, sortAccessors, setSortRaw, setPageRaw],
  );

  const setFilter = React.useCallback(
    (id: string, values: Set<string>) => {
      writeFilters({ ...filterValues, [id]: values });
      setPageRaw(1);
    },
    [filterValues, writeFilters, setPageRaw],
  );

  const clearFilters = React.useCallback(() => {
    setFilterBlob("");
    setPageRaw(1);
  }, [setFilterBlob, setPageRaw]);

  const toggleRow = React.useCallback((id: string, checked?: boolean) => {
    lastTouched.current = id;
    setSelected((previous) => {
      const next = new Set(previous);
      const on = checked ?? !next.has(id);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectRange = React.useCallback(
    (id: string) => {
      const ids = paged.map(getRowId);
      const to = ids.indexOf(id);
      const from = lastTouched.current ? ids.indexOf(lastTouched.current) : -1;
      // No anchor on this page, so there is no range to speak of - treat it as a plain click
      // rather than silently selecting from the top.
      if (to === -1 || from === -1) {
        toggleRow(id);
        return;
      }
      const [start, end] = from < to ? [from, to] : [to, from];
      setSelected((previous) => {
        const next = new Set(previous);
        // The range takes the state the clicked row is moving to, which is what every file
        // manager does and what shift-clicking to *deselect* a block depends on.
        const on = !previous.has(id);
        for (const rowId of ids.slice(start, end + 1)) {
          if (on) next.add(rowId);
          else next.delete(rowId);
        }
        return next;
      });
      lastTouched.current = id;
    },
    [paged, getRowId, toggleRow],
  );

  const matchedIds = React.useMemo(() => matched.map(getRowId), [matched, getRowId]);

  const allSelected = React.useMemo<boolean | "indeterminate">(() => {
    if (matchedIds.length === 0 || selected.size === 0) return false;
    const hits = matchedIds.filter((id) => selected.has(id)).length;
    if (hits === 0) return false;
    return hits === matchedIds.length ? true : "indeterminate";
  }, [matchedIds, selected]);

  const toggleAll = React.useCallback(() => {
    setSelected((previous) => {
      const everything = matchedIds.every((id) => previous.has(id));
      // Across every matched row, not just the visible page. "Select all" that quietly means
      // "select these twenty-five" is how the wrong things get deleted.
      return everything ? new Set() : new Set(matchedIds);
    });
  }, [matchedIds]);

  const clearSelection = React.useCallback(() => setSelected(new Set()), []);

  const activeFilterCount = React.useMemo(
    () => Object.values(filterValues).reduce((total, values) => total + values.size, 0),
    [filterValues],
  );

  return {
    rows: paged,
    matched,
    search,
    setSearch,
    sort,
    toggleSort,
    filterValues,
    setFilter,
    clearFilters,
    activeFilterCount,
    page: safePage,
    setPage: setPageRaw,
    pageCount,
    selected,
    toggleRow,
    selectRange,
    toggleAll,
    clearSelection,
    allSelected,
    emptyBecauseFiltered:
      matched.length === 0 && rows.length > 0 && (search.trim() !== "" || activeFilterCount > 0),
  };
}
