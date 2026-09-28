import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { RowActions, RowActionsTrigger, type RowAction } from "./actions";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { cn } from "./cn";
import { EmptyState, ErrorState, NoResultsState } from "./empty-state";
import { Skeleton } from "./skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

/*
  One table for every list in the portfolio.

  There were three: MobiStack's `DataTable`, OneOps' `ResponsiveTable`, and a hand-rolled
  `<table>` in Mailroom, each owning a different subset of the four states a list can be in and
  none of them sortable or selectable. The shape here is MobiStack's, which was the best of the
  three, rebuilt on this package's tokens and with the parts it lacked: sorting, selection, a
  sticky header, and columns that can drop out on a narrow screen instead of forcing a sideways
  scroll.

  What it deliberately does not do is fetch, filter or page. Those belong to the surface, which
  knows whether its data is a cursor, a page number or an array already in memory. This renders
  what it is given and reports what the person did.
*/

export interface Column<T> {
  /** Stable key. Also the value `sort` reports, so it must match whatever the caller sorts on. */
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** A CSS width. Worth setting on narrow columns so the layout does not shift as data loads. */
  width?: string;
  /**
   * Makes the header a sort control. The caller still does the sorting — this only reports the
   * intent through `onSortChange`.
   */
  sortable?: boolean;
  /**
   * Hides the column below the given breakpoint. The data does not disappear with it: anything
   * hidden this way must also be reachable, which in practice means it is in the row's expanded
   * detail or its action menu. A column that is the only home for a value has no business being
   * droppable.
   */
  hideBelow?: "sm" | "md" | "lg";
  /** Drops the column entirely. For permissions: a cost price a viewer may not see. */
  hidden?: boolean;
  /** Overrides the cell's default vertical padding, for a column of avatars or inputs. */
  className?: string;
}

export type SortDirection = "asc" | "desc";
export interface SortState {
  key: string;
  direction: SortDirection;
}

const HIDE_BELOW: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

export interface DataTableProps<T> {
  columns: Column<T>[];
  /** `undefined` means "not loaded yet", which is not the same as an empty array. */
  rows: T[] | undefined;
  rowKey: (row: T) => string;

  loading?: boolean;
  /** A refetch in flight over rows already on screen. Dims the body without replacing it. */
  refreshing?: boolean;
  error?: string | null;
  onRetry?: () => void;

  /** Makes rows activatable by click, Enter and Space. */
  onRowClick?: (row: T) => void;
  /** Marks a row as current: the one open in a detail pane beside the list. */
  isRowActive?: (row: T) => boolean;

  /**
   * The row's verbs. Right-click, long-press, Shift+F10 and a visible button all open the same
   * list — see `RowActions`. Return an empty array for a row with no actions.
   */
  rowActions?: (row: T) => RowAction[];
  /** Names the record for the menu heading and screen readers: "Invoice INV-1043". */
  rowLabel?: (row: T) => string;

  /** Adds the checkbox column. Controlled: the caller owns the set. */
  selection?: {
    selected: ReadonlySet<string>;
    onChange: (selected: Set<string>) => void;
    /** Excludes a row from selection — a settled invoice that cannot be bulk-voided. */
    isSelectable?: (row: T) => boolean;
  };

  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;

  /** Keeps the header visible while the body scrolls. Needs a height on the scroll container. */
  stickyHeader?: boolean;

  /** Copy for the zero-row state. */
  empty?: { icon?: React.ReactNode; title: React.ReactNode; hint?: React.ReactNode; action?: React.ReactNode };
  /**
   * Set when a filter is active. Switches the zero-row state from "nothing here yet" to "nothing
   * matches", which are different situations needing different words and different buttons.
   */
  filtered?: { query?: string; onClear?: () => void };

  /** Match the page size, so the body does not change height when the real rows arrive. */
  skeletonRows?: number;
  /** Describes the table for screen readers when no visible heading does. */
  caption?: React.ReactNode;
  className?: string;
}

/** The header cell for a sortable column: a button, because it does something when pressed. */
function SortableHeader({
  column,
  sort,
  onSortChange,
}: {
  column: Column<unknown>;
  sort: SortState | null | undefined;
  onSortChange: (sort: SortState) => void;
}) {
  const active = sort?.key === column.key;
  const direction: SortDirection = active && sort ? sort.direction : "asc";
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <Button
      variant="ghost"
      size="xs"
      // Toggles only on the active column. Clicking a different column starts it ascending
      // rather than inheriting the last column's direction, which is otherwise a common way to
      // get a descending sort nobody asked for.
      onClick={() => onSortChange({ key: column.key, direction: active && direction === "asc" ? "desc" : "asc" })}
      className={cn("-mx-2 h-auto gap-1 py-1 font-medium text-text-muted hover:text-text", active && "text-text")}
    >
      {column.header}
      <Icon aria-hidden="true" className={cn("size-3.5", !active && "opacity-50")} />
    </Button>
  );
}

/**
 * One row.
 *
 * Split out because `RowActions` wraps its children in a context-menu trigger, and a row needs
 * that wrapper to be the `<tr>` itself — a menu triggered by a `<div>` inside a cell only opens
 * over that cell.
 */
function DataRow<T>({
  row,
  columns,
  onRowClick,
  active,
  actions,
  label,
  selection,
  rowId,
}: {
  row: T;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  active: boolean;
  actions: RowAction[];
  label: string;
  selection: DataTableProps<T>["selection"];
  rowId: string;
}) {
  const selectable = selection ? (selection.isSelectable?.(row) ?? true) : false;
  const selected = selection?.selected.has(rowId) ?? false;

  const toggle = () => {
    if (!selection || !selectable) return;
    const next = new Set(selection.selected);
    if (next.has(rowId)) next.delete(rowId);
    else next.add(rowId);
    selection.onChange(next);
  };

  const clickable = Boolean(onRowClick);
  const cells = (
    <>
      {selection && (
        <TableCell className="w-10">
          <Checkbox
            checked={selected}
            disabled={!selectable}
            onCheckedChange={toggle}
            // Stops a click on the checkbox from also opening the row, which is the single most
            // irritating bug in a selectable list.
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select ${label || "row"}`}
          />
        </TableCell>
      )}
      {columns.map((column) => (
        <TableCell
          key={column.key}
          className={cn(column.align && ALIGN[column.align], column.hideBelow && HIDE_BELOW[column.hideBelow], column.className)}
        >
          {column.cell(row)}
        </TableCell>
      ))}
      {actions.length > 0 && (
        <TableCell className="w-10 text-right">
          <RowActionsTrigger />
        </TableCell>
      )}
    </>
  );

  const tr = (
    <TableRow
      data-state={selected ? "selected" : undefined}
      // A row that opens something is a real control, so it takes focus and answers to Enter
      // and Space. Without `tabIndex` the whole list is unreachable from a keyboard, which is
      // how these tables were before.
      tabIndex={clickable ? 0 : undefined}
      aria-selected={selection ? selected : undefined}
      aria-current={active ? "true" : undefined}
      onClick={clickable ? () => onRowClick?.(row) : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              // Space scrolls the page otherwise, which moves the list out from under the person
              // who was trying to open a row in it.
              event.preventDefault();
              onRowClick?.(row);
            }
          : undefined
      }
      className={cn(
        clickable && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        active && "bg-accent-subtle",
      )}
    >
      {cells}
    </TableRow>
  );

  if (actions.length === 0) return tr;
  return (
    <RowActions actions={actions} label={label}>
      {tr}
    </RowActions>
  );
}

/**
 * A list of records, in all four of the states a list can be in.
 *
 * The states are exclusive and checked in this order: error, first load, no rows, rows. That
 * order is the point — a failed request must not render as an empty list, which is what makes
 * people believe their data is gone.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  refreshing = false,
  error = null,
  onRetry,
  onRowClick,
  isRowActive,
  rowActions,
  rowLabel,
  selection,
  sort,
  onSortChange,
  stickyHeader = false,
  empty,
  filtered,
  skeletonRows = 6,
  caption,
  className,
}: DataTableProps<T>) {
  const visible = React.useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  // Whether any row has actions, which decides whether the header reserves the trailing column.
  // Computed from the rows rather than from the presence of `rowActions`, because a callback
  // that returns an empty array for every row should not leave an empty column behind.
  const anyActions = React.useMemo(
    () => Boolean(rowActions) && (rows ?? []).some((row) => (rowActions?.(row) ?? []).length > 0),
    [rowActions, rows],
  );

  const selectableRows = React.useMemo(
    () => (rows ?? []).filter((row) => selection?.isSelectable?.(row) ?? true),
    [rows, selection],
  );
  const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selection?.selected.has(rowKey(row)));
  const someSelected = !allSelected && selectableRows.some((row) => selection?.selected.has(rowKey(row)));
  // Three states, not two. A partial selection has to render as the dash: an unchecked box says
  // nothing is selected and a checked one says everything is, and both are wrong mid-selection.
  const headerChecked: boolean | "indeterminate" = allSelected ? true : someSelected ? "indeterminate" : false;

  if (error) return <ErrorState message={error} onRetry={onRetry} retrying={loading} />;

  const head = (
    <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-surface shadow-[inset_0_-1px_0_var(--px-border)]")}>
      <TableRow>
        {selection && (
          <TableHead className="w-10">
            <Checkbox
              checked={headerChecked}
              disabled={selectableRows.length === 0}
              onCheckedChange={() => {
                if (!selection) return;
                const next = new Set(selection.selected);
                if (allSelected) for (const row of selectableRows) next.delete(rowKey(row));
                else for (const row of selectableRows) next.add(rowKey(row));
                selection.onChange(next);
              }}
              aria-label={allSelected ? "Clear selection" : "Select all rows on this page"}
            />
          </TableHead>
        )}
        {visible.map((column) => (
          <TableHead
            key={column.key}
            style={{ width: column.width }}
            className={cn(column.align && ALIGN[column.align], column.hideBelow && HIDE_BELOW[column.hideBelow])}
            // Announced by a screen reader as it enters the column, and the only way a
            // non-visual user learns the list is sorted at all.
            aria-sort={sort?.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
          >
            {column.sortable && onSortChange ? (
              <SortableHeader column={column as Column<unknown>} sort={sort} onSortChange={onSortChange} />
            ) : (
              column.header
            )}
          </TableHead>
        ))}
        {anyActions && (
          <TableHead className="w-10">
            {/* The column has no heading of its own — its cells are icon buttons that name
                themselves — but a header cell with no accessible name is announced as "blank". */}
            <span className="sr-only">Actions</span>
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );

  if (loading && !rows) {
    return (
      <div className={cn("relative w-full overflow-auto", className)}>
        {/* Announced rather than silent, so a screen reader user knows a load is under way
            instead of meeting a table that is briefly empty for no stated reason. */}
        <span role="status" className="sr-only">
          Loading…
        </span>
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          {head}
          <TableBody aria-hidden="true">
            {Array.from({ length: skeletonRows }, (_, i) => (
              <TableRow key={i}>
                {selection && (
                  <TableCell className="w-10">
                    <Skeleton className="size-4" />
                  </TableCell>
                )}
                {visible.map((column) => (
                  <TableCell key={column.key} className={cn(column.hideBelow && HIDE_BELOW[column.hideBelow])}>
                    <Skeleton className="h-4 w-full max-w-[12rem]" />
                  </TableCell>
                ))}
                {anyActions && <TableCell className="w-10" />}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!rows?.length) {
    return filtered ? (
      <NoResultsState query={filtered.query} onClear={filtered.onClear} />
    ) : (
      <EmptyState
        icon={empty?.icon}
        title={empty?.title ?? "Nothing here yet"}
        hint={empty?.hint}
        action={empty?.action}
      />
    );
  }

  return (
    <div className={cn("relative w-full overflow-auto", className)}>
      <Table className={cn(refreshing && "opacity-60 transition-opacity")}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {head}
        <TableBody>
          {rows.map((row) => {
            const id = rowKey(row);
            return (
              <DataRow
                key={id}
                rowId={id}
                row={row}
                columns={visible}
                onRowClick={onRowClick}
                active={isRowActive?.(row) ?? false}
                actions={rowActions?.(row) ?? []}
                label={rowLabel?.(row) ?? ""}
                selection={selection}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export interface TablePagerProps {
  /** Rows on screen now. */
  loaded: number;
  /** Rows there are in total. Without it, a page that stops at 25 looks like a list of 25. */
  total: number;
  hasMore: boolean;
  loadingMore?: boolean;
  onLoadMore: () => void;
  /** Plural noun for the records: "invoices", "members". */
  noun?: string;
}

/**
 * How much of a list is on screen, and a way to get the rest.
 *
 * The count is the part that matters and the reason this is not just a button. A truncated list
 * with no total is indistinguishable from a complete short one, and people act on that: they
 * conclude a record is missing and re-create it.
 */
export function TablePager({ loaded, total, hasMore, loadingMore = false, onLoadMore, noun = "rows" }: TablePagerProps) {
  if (!hasMore && loaded >= total) {
    return total > 0 ? (
      <p className="px-3 py-3 text-xs text-text-muted">
        {total} {noun}
      </p>
    ) : null;
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      {/* Polite, so the new count is read after the rows land rather than interrupting. */}
      <p aria-live="polite" className="text-xs text-text-muted">
        Showing {loaded} of {total} {noun}
      </p>
      {hasMore && (
        <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}

export interface BulkBarProps {
  count: number;
  onClear: () => void;
  /** The bulk verbs. Anything irreversible should confirm before it runs. */
  children: React.ReactNode;
  noun?: string;
}

/**
 * The bar that appears once rows are selected.
 *
 * Fixed to the bottom of the viewport rather than placed above the table, because a selection
 * made at row 80 needs its actions within reach of row 80. `role="region"` with a name so it can
 * be jumped to, since it appears without the person moving focus.
 */
export function BulkBar({ count, onClear, children, noun = "selected" }: BulkBarProps) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label={`${count} ${noun}`}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto mb-4 flex w-[min(44rem,calc(100%-2rem))] flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised p-2 pl-4 shadow-[var(--px-elevation-3)]"
    >
      <p aria-live="polite" className="mr-auto text-sm font-medium">
        {count} {noun}
      </p>
      {children}
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
