import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { BulkBar, DataTable, TablePager, type Column, type SortState } from "./data-table";

interface Invoice {
  id: string;
  number: string;
  customer: string;
  settled: boolean;
}

const rows: Invoice[] = [
  { id: "1", number: "INV-1041", customer: "Acme", settled: false },
  { id: "2", number: "INV-1042", customer: "Borealis", settled: true },
  { id: "3", number: "INV-1043", customer: "Cinder", settled: false },
];

const columns: Column<Invoice>[] = [
  { key: "number", header: "Number", cell: (r) => r.number, sortable: true },
  { key: "customer", header: "Customer", cell: (r) => r.customer },
];

const base = { columns, rowKey: (r: Invoice) => r.id, rowLabel: (r: Invoice) => `Invoice ${r.number}` };

describe("DataTable states", () => {
  /*
    The order these are checked in is the part worth protecting. A failed request rendering as an
    empty list is the single most damaging version of this component being wrong: it tells people
    their records are gone.
  */
  it("shows the error state instead of the table, even when rows are present", () => {
    render(<DataTable {...base} rows={rows} error="Network unreachable" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network unreachable");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the error state instead of the empty state", () => {
    render(<DataTable {...base} rows={[]} error="Network unreachable" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network unreachable");
    expect(screen.queryByText(/nothing here yet/i)).not.toBeInTheDocument();
  });

  it("distinguishes not-loaded-yet from loaded-and-empty", () => {
    const { rerender } = render(<DataTable {...base} rows={undefined} loading />);
    // undefined means the request has not answered, so this must not say the list is empty.
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    expect(screen.queryByText(/nothing here yet/i)).not.toBeInTheDocument();

    rerender(<DataTable {...base} rows={[]} />);
    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  });

  it("says nothing matches, not nothing exists, when a filter is active", () => {
    render(<DataTable {...base} rows={[]} filtered={{ query: "zzz" }} />);
    expect(screen.getByText(/no matches for "zzz"/i)).toBeInTheDocument();
    expect(screen.queryByText(/nothing here yet/i)).not.toBeInTheDocument();
  });

  it("keeps rows on screen while refreshing", () => {
    render(<DataTable {...base} rows={rows} refreshing />);
    expect(screen.getByText("INV-1041")).toBeInTheDocument();
  });
});

describe("DataTable sorting", () => {
  it("reports ascending first for a column that is not the active one", async () => {
    const onSortChange = vi.fn();
    render(<DataTable {...base} rows={rows} sort={null} onSortChange={onSortChange} />);
    await userEvent.click(screen.getByRole("button", { name: /number/i }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "number", direction: "asc" });
  });

  it("toggles direction on the active column", async () => {
    const onSortChange = vi.fn();
    const sort: SortState = { key: "number", direction: "asc" };
    render(<DataTable {...base} rows={rows} sort={sort} onSortChange={onSortChange} />);
    await userEvent.click(screen.getByRole("button", { name: /number/i }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "number", direction: "desc" });
  });

  it("announces the sort on the column header", () => {
    render(
      <DataTable {...base} rows={rows} sort={{ key: "number", direction: "desc" }} onSortChange={vi.fn()} />,
    );
    // aria-sort is how a non-visual user learns the list is sorted at all; the arrow icon is
    // aria-hidden and tells them nothing.
    expect(screen.getByRole("columnheader", { name: /number/i })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: /customer/i })).not.toHaveAttribute("aria-sort");
  });

  it("does not make a header a button without a sort handler", () => {
    render(<DataTable {...base} rows={rows} />);
    expect(screen.queryByRole("button", { name: /number/i })).not.toBeInTheDocument();
  });
});

function Selectable({ isSelectable }: { isSelectable?: (r: Invoice) => boolean }) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  return (
    <DataTable {...base} rows={rows} selection={{ selected, onChange: setSelected, isSelectable }} />
  );
}

describe("DataTable selection", () => {
  it("names each row checkbox after its record", () => {
    render(<Selectable />);
    expect(screen.getByRole("checkbox", { name: "Select Invoice INV-1041" })).toBeInTheDocument();
  });

  it("selects and clears all from the header", async () => {
    render(<Selectable />);
    const all = screen.getByRole("checkbox", { name: /select all rows/i });
    await userEvent.click(all);
    for (const n of ["INV-1041", "INV-1042", "INV-1043"]) {
      expect(screen.getByRole("checkbox", { name: `Select Invoice ${n}` })).toBeChecked();
    }
    await userEvent.click(screen.getByRole("checkbox", { name: /clear selection/i }));
    expect(screen.getByRole("checkbox", { name: "Select Invoice INV-1041" })).not.toBeChecked();
  });

  it("shows a partial selection as indeterminate rather than checked or clear", async () => {
    render(<Selectable />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Invoice INV-1041" }));
    const header = screen.getByRole("checkbox", { name: /select all rows/i });
    expect(header).toHaveAttribute("data-state", "indeterminate");
  });

  it("leaves unselectable rows out of select-all", async () => {
    render(<Selectable isSelectable={(r) => !r.settled} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /select all rows/i }));
    expect(screen.getByRole("checkbox", { name: "Select Invoice INV-1042" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Select Invoice INV-1042" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Invoice INV-1041" })).toBeChecked();
    // All the selectable rows are selected, so the header reads as fully checked rather than
    // partial — the settled row is not a gap in the selection, it is outside it.
    expect(screen.getByRole("checkbox", { name: /clear selection/i })).toBeInTheDocument();
  });

  it("does not open the row when the checkbox is clicked", async () => {
    const onRowClick = vi.fn();
    const Wrapper = () => {
      const [selected, setSelected] = React.useState<Set<string>>(new Set());
      return (
        <DataTable
          {...base}
          rows={rows}
          onRowClick={onRowClick}
          selection={{ selected, onChange: setSelected }}
        />
      );
    };
    render(<Wrapper />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Invoice INV-1041" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("DataTable rows as controls", () => {
  it("opens a row with Enter and with Space", async () => {
    const onRowClick = vi.fn();
    render(<DataTable {...base} rows={rows} onRowClick={onRowClick} />);
    const [first] = screen.getAllByRole("row").slice(1);
    first.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenLastCalledWith(rows[0]);
  });

  it("does not make rows focusable when they do nothing", () => {
    render(<DataTable {...base} rows={rows} />);
    for (const row of screen.getAllByRole("row").slice(1)) {
      expect(row).not.toHaveAttribute("tabindex");
    }
  });

  it("marks the open row as current", () => {
    render(<DataTable {...base} rows={rows} onRowClick={vi.fn()} isRowActive={(r) => r.id === "2"} />);
    const [, second] = screen.getAllByRole("row").slice(1);
    expect(second).toHaveAttribute("aria-current", "true");
  });
});

describe("DataTable row actions", () => {
  const actions = () => [{ id: "void", label: "Void", onSelect: vi.fn() }];

  it("gives the actions column an accessible name", () => {
    render(<DataTable {...base} rows={rows} rowActions={actions} />);
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
  });

  it("names each row's action button after its record", () => {
    render(<DataTable {...base} rows={rows} rowActions={actions} />);
    expect(screen.getByRole("button", { name: "Actions for Invoice INV-1041" })).toBeInTheDocument();
  });

  it("adds no actions column when every row returns none", () => {
    render(<DataTable {...base} rows={rows} rowActions={() => []} />);
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
  });
});

describe("DataTable columns", () => {
  it("drops a hidden column entirely", () => {
    const withHidden: Column<Invoice>[] = [...columns, { key: "cost", header: "Cost", cell: () => "9", hidden: true }];
    render(<DataTable {...base} columns={withHidden} rows={rows} />);
    expect(screen.queryByRole("columnheader", { name: "Cost" })).not.toBeInTheDocument();
  });
});

describe("TablePager", () => {
  it("says how much of the list is on screen", () => {
    render(<TablePager loaded={25} total={412} hasMore onLoadMore={vi.fn()} noun="invoices" />);
    // The total is the whole point: 25 rows with no total is indistinguishable from a list of 25.
    expect(screen.getByText("Showing 25 of 412 invoices")).toBeInTheDocument();
  });

  it("stops offering more once the list is complete", () => {
    render(<TablePager loaded={412} total={412} hasMore={false} onLoadMore={vi.fn()} noun="invoices" />);
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
    expect(screen.getByText("412 invoices")).toBeInTheDocument();
  });

  it("renders nothing for an empty list, which has its own state", () => {
    const { container } = render(<TablePager loaded={0} total={0} hasMore={false} onLoadMore={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("BulkBar", () => {
  it("stays out of the way until something is selected", () => {
    const { container } = render(
      <BulkBar count={0} onClear={vi.fn()}>
        <button type="button">Void</button>
      </BulkBar>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("is a named region, so it can be reached after appearing unannounced", () => {
    render(
      <BulkBar count={3} onClear={vi.fn()} noun="invoices selected">
        <button type="button">Void</button>
      </BulkBar>,
    );
    expect(screen.getByRole("region", { name: "3 invoices selected" })).toBeInTheDocument();
  });
});
