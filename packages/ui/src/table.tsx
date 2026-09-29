import * as React from "react";
import { cn } from "./cn";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn(
          // A table is the densest body copy in these consoles, so it is where the density
          // type role earns its place: 15px comfortable, 14px compact.
          "w-full caption-bottom text-[length:var(--px-density-body-size)] leading-[var(--px-density-body-line-height)]",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />,
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    // `h-` on a tr is a floor, not a cap — a wrapping cell still grows the row. It is here so
    // that a row of short single-line cells lands on the density row height instead of
    // collapsing to whatever the padding happens to add up to.
    <tr ref={ref} className={cn("h-[var(--px-density-row)] border-b border-border transition-colors hover:bg-surface-muted/50 data-[state=selected]:bg-surface-muted", className)} {...props} />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("h-[var(--px-density-row)] px-[var(--px-density-pad-x)] text-left align-middle font-medium text-text-muted [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-[var(--px-density-pad-x)] py-[var(--px-density-pad-y)] align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
