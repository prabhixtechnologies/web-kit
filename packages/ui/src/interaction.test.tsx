import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPaletteProvider, useCommands } from "./command-palette";
import { useList } from "./use-list";
import { useHotkey, useKeySequence } from "./use-hotkeys";
import { useDirtyTracker, useNavigationGuard } from "./use-unsaved-changes";
import { useUrlFlag, useUrlNumber, useUrlSet, useUrlString } from "./use-url-state";

function goTo(search: string) {
  window.history.replaceState(null, "", `/list${search}`);
}

beforeEach(() => goTo(""));

describe("useUrlState", () => {
  it("keeps a default out of the URL, so a default view has a clean link", () => {
    const { result } = renderHook(() => useUrlString("q", ""));
    act(() => result.current[1]("boiler"));
    expect(window.location.search).toBe("?q=boiler");
    act(() => result.current[1](""));
    expect(window.location.search).toBe("");
  });

  it("falls back when the URL holds something that is not a number", () => {
    goTo("?page=banana");
    const { result } = renderHook(() => useUrlNumber("page", 1));
    expect(result.current[0]).toBe(1);
  });

  it("sorts a set, so the same two filters always produce the same link", () => {
    const { result } = renderHook(() => useUrlSet("status"));
    act(() => result.current[1](new Set(["refunded", "open"])));
    expect(window.location.search).toBe("?status=open%2Crefunded");
    expect(result.current[0]).toEqual(new Set(["open", "refunded"]));
  });

  it("writes a flag only when it is on", () => {
    const { result } = renderHook(() => useUrlFlag("archived"));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(window.location.search).toBe("?archived=1");
    act(() => result.current[1](false));
    expect(window.location.search).toBe("");
  });

  it("keeps two hooks on one page in step", () => {
    const { result } = renderHook(() => ({
      q: useUrlString("q"),
      page: useUrlNumber("page", 1),
    }));
    act(() => result.current.q[1]("pump"));
    act(() => result.current.page[1](3));
    // The second write must not drop the first: both read the live URL, not a stale copy.
    expect(new URLSearchParams(window.location.search).get("q")).toBe("pump");
    expect(result.current.q[0]).toBe("pump");
    expect(result.current.page[0]).toBe(3);
  });
});

interface Row {
  id: string;
  name: string;
  status: string;
  cost: number;
}

const rows: Row[] = [
  { id: "1", name: "Bay 10 heater", status: "open", cost: 120 },
  { id: "2", name: "Bay 2 pump", status: "open", cost: 40 },
  { id: "3", name: "Front door", status: "closed", cost: 300 },
  { id: "4", name: "Boiler service", status: "closed", cost: 80 },
  { id: "5", name: "Roof survey", status: "paid", cost: 200 },
];

const options = {
  rows,
  getRowId: (row: Row) => row.id,
  getSearchText: (row: Row) => row.name,
  sortAccessors: {
    name: (row: Row) => row.name,
    cost: (row: Row) => row.cost,
  },
  filters: {
    status: (row: Row, selected: Set<string>) => selected.has(row.status),
  },
  pageSize: 2,
};

describe("useList", () => {
  it("sorts text the way a person reads it, so Bay 2 comes before Bay 10", () => {
    const { result } = renderHook(() => useList({ ...options, pageSize: 10 }));
    act(() => result.current.toggleSort("name"));
    expect(result.current.rows.map((row) => row.name)).toEqual([
      "Bay 2 pump",
      "Bay 10 heater",
      "Boiler service",
      "Front door",
      "Roof survey",
    ]);
  });

  it("cycles a column ascending, descending, then off", () => {
    const { result } = renderHook(() => useList(options));
    act(() => result.current.toggleSort("cost"));
    expect(result.current.sort).toEqual({ column: "cost", direction: "asc" });
    act(() => result.current.toggleSort("cost"));
    expect(result.current.sort).toEqual({ column: "cost", direction: "desc" });
    act(() => result.current.toggleSort("cost"));
    expect(result.current.sort).toBeNull();
  });

  it("treats an empty filter as no opinion rather than match nothing", () => {
    const { result } = renderHook(() => useList({ ...options, pageSize: 10 }));
    expect(result.current.matched).toHaveLength(5);
    act(() => result.current.setFilter("status", new Set(["open"])));
    expect(result.current.matched).toHaveLength(2);
    act(() => result.current.setFilter("status", new Set()));
    expect(result.current.matched).toHaveLength(5);
  });

  it("goes back to page one when the search changes", () => {
    const { result } = renderHook(() => useList(options));
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    act(() => result.current.setSearch("bay"));
    expect(result.current.page).toBe(1);
    expect(result.current.matched).toHaveLength(2);
  });

  it("clamps the page when filtering shortens the list under you", () => {
    const { result } = renderHook(() => useList(options));
    act(() => result.current.setPage(3));
    // Straight to the URL, the way the back button would, bypassing the reset in `setSearch`.
    act(() => {
      window.history.replaceState(null, "", "/list?page=3&q=roof");
      window.dispatchEvent(new Event("px-url-state"));
    });
    expect(result.current.pageCount).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.rows).toHaveLength(1);
  });

  it("selects across every matched row, not just the visible page", () => {
    const { result } = renderHook(() => useList(options));
    expect(result.current.rows).toHaveLength(2);
    act(() => result.current.toggleAll());
    expect(result.current.selected.size).toBe(5);
    expect(result.current.allSelected).toBe(true);
    act(() => result.current.toggleAll());
    expect(result.current.selected.size).toBe(0);
  });

  it("reports a partial selection as indeterminate", () => {
    const { result } = renderHook(() => useList(options));
    act(() => result.current.toggleRow("1"));
    expect(result.current.allSelected).toBe("indeterminate");
  });

  it("shift-clicks a range, taking the clicked row's new state", () => {
    const { result } = renderHook(() => useList({ ...options, pageSize: 10 }));
    act(() => result.current.toggleRow("2"));
    act(() => result.current.selectRange("4"));
    expect([...result.current.selected].sort()).toEqual(["2", "3", "4"]);
    // Shift-clicking an already-selected row deselects the block, which is what makes ranges
    // usable rather than a one-way door.
    act(() => result.current.selectRange("2"));
    expect(result.current.selected.size).toBe(0);
  });

  it("tells an empty search apart from an empty list", () => {
    const { result } = renderHook(() => useList(options));
    expect(result.current.emptyBecauseFiltered).toBe(false);
    act(() => result.current.setSearch("nothing here"));
    expect(result.current.matched).toHaveLength(0);
    expect(result.current.emptyBecauseFiltered).toBe(true);

    const { result: bare } = renderHook(() => useList({ ...options, rows: [] }));
    expect(bare.current.emptyBecauseFiltered).toBe(false);
  });

  it("survives a reload, because the whole view is in the URL", () => {
    goTo("?q=bay&sort=cost%3Adesc&f=status%3Aopen");
    const { result } = renderHook(() => useList({ ...options, pageSize: 10 }));
    expect(result.current.search).toBe("bay");
    expect(result.current.sort).toEqual({ column: "cost", direction: "desc" });
    expect(result.current.activeFilterCount).toBe(1);
    expect(result.current.rows.map((row) => row.id)).toEqual(["1", "2"]);
  });
});

describe("useHotkey", () => {
  afterEach(() => document.body.replaceChildren());

  function Probe({ onFire, ...rest }: { onFire: () => void; enableInInputs?: boolean }) {
    useHotkey("n", onFire, rest);
    return <input aria-label="Search" />;
  }

  it("does not fire while someone is typing", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(<Probe onFire={onFire} />);
    await user.click(screen.getByLabelText("Search"));
    await user.keyboard("n");
    expect(onFire).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Search")).toHaveValue("n");
  });

  it("fires when focus is not in a text field", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    render(<Probe onFire={onFire} />);
    await user.keyboard("n");
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it("treats mod as whichever key the platform uses", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    function Chord() {
      useHotkey("mod+k", onFire, { enableInInputs: true });
      return <input aria-label="Search" />;
    }
    render(<Chord />);
    await user.click(screen.getByLabelText("Search"));
    await user.keyboard("{Control>}k{/Control}");
    expect(onFire).toHaveBeenCalledTimes(1);
    await user.keyboard("{Meta>}k{/Meta}");
    expect(onFire).toHaveBeenCalledTimes(2);
    // The bare letter must not count, or every k typed is a shortcut.
    await user.keyboard("k");
    expect(onFire).toHaveBeenCalledTimes(2);
  });
});

describe("useKeySequence", () => {
  it("fires on g then i, and not on g then anything else", async () => {
    const user = userEvent.setup();
    const onFire = vi.fn();
    function Probe() {
      useKeySequence(["g", "i"], onFire);
      return <div />;
    }
    render(<Probe />);
    await user.keyboard("gi");
    expect(onFire).toHaveBeenCalledTimes(1);
    await user.keyboard("gx");
    expect(onFire).toHaveBeenCalledTimes(1);
    // The stray key ends the sequence rather than being held, so this `i` is not a late half.
    await user.keyboard("i");
    expect(onFire).toHaveBeenCalledTimes(1);
  });
});

describe("useNavigationGuard", () => {
  it("lets navigation through when nothing has been typed", () => {
    const navigate = vi.fn();
    const { result } = renderHook(() => useNavigationGuard(false));
    act(() => result.current.guard(navigate)());
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(result.current.blocked).toBe(false);
  });

  it("holds navigation until the question is answered", () => {
    const navigate = vi.fn();
    const { result } = renderHook(() => useNavigationGuard(true));
    act(() => result.current.guard(navigate)());
    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.blocked).toBe(true);

    act(() => result.current.cancel());
    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.blocked).toBe(false);

    act(() => result.current.guard(navigate)());
    act(() => result.current.proceed());
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(result.current.blocked).toBe(false);
  });

  it("counts a blank and an absent value as the same thing", () => {
    const { result } = renderHook(() =>
      useDirtyTracker({ note: "", ref: "A1" }, { ref: "A1" }),
    );
    expect(result.current).toBe(false);

    const { result: typed } = renderHook(() =>
      useDirtyTracker({ note: "x", ref: "A1" }, { note: "", ref: "A1" }),
    );
    expect(typed.current).toBe(true);
  });
});

describe("CommandPaletteProvider", () => {
  function Page({ show }: { show: boolean }) {
    useCommands(
      show ? [{ id: "refund", label: "Refund this order", group: "Order", perform: vi.fn() }] : [],
      [show],
    );
    return null;
  }

  it("opens on the shortcut, even from inside a search box", async () => {
    const user = userEvent.setup();
    render(
      <CommandPaletteProvider
        staticCommands={[
          { id: "inbox", label: "Go to inbox", keywords: ["mail"], perform: vi.fn() },
        ]}
      >
        <input aria-label="Search" />
      </CommandPaletteProvider>,
    );

    await user.click(screen.getByLabelText("Search"));
    await user.keyboard("{Control>}k{/Control}");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Go to inbox")).toBeInTheDocument();
  });

  it("finds a command by a word that is not in its label", async () => {
    const user = userEvent.setup();
    render(
      <CommandPaletteProvider
        staticCommands={[
          { id: "inv", label: "Inventory", keywords: ["stock", "parts"], perform: vi.fn() },
          { id: "cal", label: "Calendar", perform: vi.fn() },
        ]}
      >
        <div />
      </CommandPaletteProvider>,
    );
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "stock");
    await waitFor(() => expect(screen.queryByText("Calendar")).not.toBeInTheDocument());
    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });

  it("takes a page's commands away with the page", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CommandPaletteProvider staticCommands={[]}>
        <Page show />
      </CommandPaletteProvider>,
    );
    await user.keyboard("{Control>}k{/Control}");
    expect(await screen.findByText("Refund this order")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    rerender(
      <CommandPaletteProvider staticCommands={[]}>
        <Page show={false} />
      </CommandPaletteProvider>,
    );
    await user.keyboard("{Control>}k{/Control}");
    await waitFor(() =>
      expect(screen.queryByText("Refund this order")).not.toBeInTheDocument(),
    );
  });

  it("runs the command and closes", async () => {
    const user = userEvent.setup();
    const perform = vi.fn();
    render(
      <CommandPaletteProvider staticCommands={[{ id: "a", label: "Archive", perform }]}>
        <div />
      </CommandPaletteProvider>,
    );
    await user.keyboard("{Control>}k{/Control}");
    await user.click(await screen.findByText("Archive"));
    expect(perform).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
