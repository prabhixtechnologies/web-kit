import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RowActions, RowActionsTrigger, type RowAction } from "./actions";

/*
  The four routes to a row's verbs, pinned.

  `RowActions` carries right-click and long-press across eight pages, and all of it arrives
  through Radix rather than through handlers written here — so nothing in this file's own
  source mentions `contextmenu`, a pointer type, or a timer. That is precisely why it needs
  a test: a grep of the component finds no evidence the gestures exist, and an upgrade that
  quietly changed any of it would produce a diff nobody could read as a regression.

  Every case drives the real event a browser would send, not a handler.
*/

afterEach(() => {
  // An open Radix menu parks `pointer-events: none` on the body and restores it when it
  // closes. Testing Library unmounts between cases without closing, so the style survives
  // into the next test and every pointer interaction there is refused. Test-harness
  // bookkeeping, not product behaviour.
  document.body.style.pointerEvents = "";
});

function menuItemNames() {
  return screen.getAllByRole("menuitem").map((el) => el.textContent?.trim());
}

const basic: RowAction[] = [
  { id: "open", label: "Open" },
  { id: "dup", label: "Duplicate" },
].map((a) => ({ ...a, onSelect: vi.fn() }));

function Row({ actions = basic, label = "Invoice INV-1043" }: { actions?: RowAction[]; label?: string }) {
  return (
    <table>
      <tbody>
        <RowActions actions={actions} label={label}>
          <tr data-testid="row">
            <td>INV-1043</td>
            <td>
              <RowActionsTrigger />
            </td>
          </tr>
        </RowActions>
      </tbody>
    </table>
  );
}

describe("RowActions", () => {
  it("does not wrap the row in an element, so it stays valid inside tbody", () => {
    render(<Row />);
    // asChild merges onto the <tr>. A wrapper <div> here would be dropped by the HTML parser
    // in a real document, and the gestures would land on an element outside the table.
    const row = screen.getByTestId("row");
    expect(row.tagName).toBe("TR");
    expect(row.parentElement?.tagName).toBe("TBODY");
  });

  it("opens on right-click", async () => {
    const user = userEvent.setup();
    render(<Row />);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByTestId("row") });

    await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
    expect(menuItemNames()).toEqual(["Open", "Duplicate"]);
  });

  it("opens on a touch long-press, and not on a short tap", async () => {
    vi.useFakeTimers();
    try {
      render(<Row />);
      const row = screen.getByTestId("row");

      // Short press: down and up inside the threshold. Radix arms a 700ms timer on
      // pointerdown for any non-mouse pointer and clears it on pointerup.
      act(() => {
        fireEvent.pointerDown(row, { pointerType: "touch" });
        vi.advanceTimersByTime(300);
        fireEvent.pointerUp(row, { pointerType: "touch" });
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByRole("menu")).toBeNull();

      act(() => {
        fireEvent.pointerDown(row, { pointerType: "touch" });
        vi.advanceTimersByTime(700);
      });
      expect(screen.getByRole("menu")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not long-press open for a mouse, which has its own button for this", () => {
    vi.useFakeTimers();
    try {
      render(<Row />);
      const row = screen.getByTestId("row");
      act(() => {
        fireEvent.pointerDown(row, { pointerType: "mouse" });
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByRole("menu")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers the same list from the visible button", async () => {
    const user = userEvent.setup();
    render(<Row />);

    await user.click(screen.getByRole("button", { name: "Actions for Invoice INV-1043" }));

    await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
    expect(menuItemNames()).toEqual(["Open", "Duplicate"]);
  });

  it("opens from Shift+F10 and from the Menu key", async () => {
    for (const keys of ["{Shift>}{F10}{/Shift}", "{ContextMenu}"]) {
      const user = userEvent.setup();
      const view = render(<Row />);

      screen.getByRole("button", { name: /^Actions for/ }).focus();
      await user.keyboard(keys);

      await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
      view.unmount();
    }
  });

  it("names the record rather than the menu, so the row is identifiable by ear", async () => {
    const user = userEvent.setup();
    render(<Row label="Order 8812" />);

    const button = screen.getByRole("button", { name: "Actions for Order 8812" });
    await user.click(button);

    await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
    expect(screen.getByText("Order 8812")).toBeTruthy();
  });

  it("runs a safe action straight away", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Row actions={[{ id: "open", label: "Open", onSelect }]} />);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByTestId("row") });
    await user.click(await screen.findByRole("menuitem", { name: "Open" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("holds a confirm action behind the dialog, and does not run it on dismiss", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <Row
        actions={[
          {
            id: "delete",
            label: "Delete",
            risk: "confirm",
            onSelect,
            confirm: {
              title: "Delete invoice INV-1043?",
              message: "The invoice and its payment record are removed. This cannot be undone.",
              confirmLabel: "Delete invoice",
            },
          },
        ]}
      />,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByTestId("row") });
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const dialog = await screen.findByRole("alertdialog").catch(() => screen.getByRole("dialog"));
    expect(dialog.textContent).toContain("cannot be undone");
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("runs the confirm action once the dialog is confirmed", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <Row
        actions={[
          {
            id: "delete",
            label: "Delete",
            risk: "confirm",
            onSelect,
            confirm: { title: "Delete?", message: "Gone for good.", confirmLabel: "Delete invoice" },
          },
        ]}
      />,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByTestId("row") });
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await user.click(await screen.findByRole("button", { name: "Delete invoice" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("separates groups, with the ungrouped verbs leading", async () => {
    const user = userEvent.setup();
    render(
      <Row
        actions={[
          { id: "export", label: "Export", group: "data", onSelect: vi.fn() },
          { id: "open", label: "Open", onSelect: vi.fn() },
          { id: "print", label: "Print", group: "data", onSelect: vi.fn() },
        ]}
      />,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByTestId("row") });
    await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());

    // Declaration order put Export first; the ungrouped verb still leads.
    expect(menuItemNames()).toEqual(["Open", "Export", "Print"]);
    expect(screen.getAllByRole("separator").length).toBeGreaterThan(0);
  });

  it("disables the button when every action is disabled", () => {
    render(
      <Row
        actions={[
          { id: "open", label: "Open", disabled: true, onSelect: vi.fn() },
          { id: "dup", label: "Duplicate", disabled: true, onSelect: vi.fn() },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /^Actions for/ }).hasAttribute("disabled")).toBe(true);
  });

  it("does not open on right-click when every action is disabled", () => {
    render(<Row actions={[{ id: "open", label: "Open", disabled: true, onSelect: vi.fn() }]} />);

    // fireEvent rather than user-event: the trigger is disabled via `pointer-events: none`,
    // which user-event refuses to click through. Dispatching the event directly is the
    // stronger assertion anyway — even if one arrives, no menu opens.
    fireEvent.contextMenu(screen.getByTestId("row"));

    expect(screen.queryByRole("menu")).toBeNull();
  });
});
