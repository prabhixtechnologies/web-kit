import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "./breadcrumb";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card";
import { CopyButton } from "./copy-button";
import { Kbd } from "./kbd";
import { Pagination, pageItems } from "./pagination";
import { Progress, Spinner } from "./spinner";
import { RadioCard, RadioGroup } from "./radio-group";
import { SegmentedControl } from "./segmented-control";
import { Stepper } from "./stepper";
import { TreeView, type TreeNode } from "./tree-view";

/*
  Behaviour, not appearance.

  Every case here is something a class change cannot break and a refactor can: the keyboard
  contracts, the names assistive technology reads, and the one piece of real arithmetic in the
  set. Rendering is left to the eye and to the token gate.
*/

async function violations(element: HTMLElement) {
  const results = await axe.run(element, {
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
      "page-has-heading-one": { enabled: false },
      "landmark-one-main": { enabled: false },
    },
  });
  return results.violations.map((v) => `${v.id}: ${v.help}`);
}

describe("pageItems", () => {
  it("lists every page when they all fit", () => {
    expect(pageItems(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps a constant width as the page moves, so the buttons do not shift under the pointer", () => {
    const widths = new Set<number>();
    for (let page = 1; page <= 20; page++) widths.add(pageItems(page, 20, 1).length);
    expect([...widths]).toHaveLength(1);
  });

  it("always offers the first and last page", () => {
    const items = pageItems(10, 20, 1);
    expect(items[0]).toBe(1);
    expect(items.at(-1)).toBe(20);
  });

  it("puts a gap only where pages are actually skipped", () => {
    // Near the start there is nothing to skip on the left.
    expect(pageItems(2, 20, 1).indexOf(null)).toBeGreaterThan(1);
    const middle = pageItems(10, 20, 1);
    expect(middle.filter((item) => item === null)).toHaveLength(2);
  });
});

describe("Pagination", () => {
  it("marks the current page for assistive technology, not only by fill", async () => {
    render(<Pagination page={3} pageCount={9} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Page 4" })).not.toHaveAttribute("aria-current");
  });

  it("renders nothing when there is only one page", () => {
    const { container } = render(<Pagination page={1} pageCount={1} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disables the arrow at each end rather than letting it run off", () => {
    const { rerender } = render(<Pagination page={1} pageCount={4} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    rerender(<Pagination page={4} pageCount={4} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});

describe("SegmentedControl", () => {
  const options = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "done", label: "Done" },
  ];

  it("is a radio group, because it is one choice out of several - not tabs over panels", () => {
    render(<SegmentedControl options={options} value="all" onValueChange={() => {}} label="View" />);
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("costs one tab stop, whatever the number of options", () => {
    render(<SegmentedControl options={options} value="open" onValueChange={() => {}} label="View" />);
    const reachable = screen.getAllByRole("radio").filter((node) => node.tabIndex === 0);
    expect(reachable).toHaveLength(1);
    expect(reachable[0]).toHaveAccessibleName("Open");
  });

  it("moves and selects on the arrow keys, and wraps", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SegmentedControl options={options} value="done" onValueChange={onValueChange} label="View" />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith("all");
  });
});

describe("Stepper", () => {
  const steps = [
    { id: "a", label: "Basket" },
    { id: "b", label: "Address" },
    { id: "c", label: "Pay" },
  ];

  it("says which step is current in words, not only with a colour", () => {
    render(<Stepper steps={steps} current={1} label="Checkout" />);
    // aria-current is on the list item, so the text is the reachable assertion.
    expect(screen.getByText("Current step")).toBeInTheDocument();
    expect(screen.getAllByText("Completed")).toHaveLength(1);
    expect(screen.getAllByText("Not started")).toHaveLength(1);
  });

  it("only offers to go back to steps that are finished", () => {
    render(<Stepper steps={steps} current={1} label="Checkout" onStepSelect={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("is not clickable at all without a handler, rather than looking clickable and doing nothing", () => {
    render(<Stepper steps={steps} current={2} label="Checkout" />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("TreeView", () => {
  const nodes: TreeNode[] = [
    { id: "inbox", label: "Inbox", children: [{ id: "flagged", label: "Flagged" }] },
    { id: "sent", label: "Sent" },
  ];

  it("is one tab stop with the arrows moving inside it", async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={nodes} label="Folders" />);
    const reachable = screen.getAllByRole("treeitem").filter((node) => node.tabIndex === 0);
    expect(reachable).toHaveLength(1);

    await user.tab();
    expect(screen.getByRole("treeitem", { name: /Inbox/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: /Sent/ })).toHaveFocus();
  });

  it("opens a branch with right and steps into it on the second press", async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={nodes} label="Folders" />);
    await user.tab();
    expect(screen.getByRole("treeitem", { name: /Inbox/ })).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("treeitem", { name: /Inbox/ })).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("treeitem", { name: /Flagged/ })).toHaveFocus();
  });

  it("closes with left, then steps out to the parent", async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={nodes} label="Folders" defaultExpandedIds={["inbox"]} />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: /Flagged/ })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("treeitem", { name: /Inbox/ })).toHaveFocus();
  });

  it("states the depth, which the nesting alone does not convey", () => {
    render(<TreeView nodes={nodes} label="Folders" defaultExpandedIds={["inbox"]} />);
    expect(screen.getByRole("treeitem", { name: /Inbox/ })).toHaveAttribute("aria-level", "1");
    expect(screen.getByRole("treeitem", { name: /Flagged/ })).toHaveAttribute("aria-level", "2");
  });
});

describe("CopyButton", () => {
  /**
   * `navigator.clipboard` is accessor-only in jsdom, so it has to be redefined rather than
   * assigned - and after `userEvent.setup()`, which installs a stub of its own that would
   * otherwise swallow the call.
   */
  function stubClipboard(writeText: () => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });
  }

  it("says it copied, out loud as well as with a tick", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<CopyButton value="INV-1041" label="Copy invoice number" />);

    await user.click(screen.getByRole("button", { name: "Copy invoice number" }));
    expect(writeText).toHaveBeenCalledWith("INV-1041");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("says so when the clipboard refuses, instead of a tick that means nothing", async () => {
    const user = userEvent.setup();
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<CopyButton value="x" label="Copy token" />);
    await user.click(screen.getByRole("button", { name: "Copy token" }));
    expect(await screen.findByRole("button", { name: "Could not copy" })).toBeInTheDocument();
  });
});

describe("Kbd", () => {
  it("gives the chord a spoken name, because the glyphs are unreadable aloud", () => {
    render(<Kbd keys={["mod", "k"]} />);
    expect(screen.getByText("Command plus K")).toBeInTheDocument();
  });
});

describe("Spinner and Progress", () => {
  it("names what is being waited for", () => {
    render(<Spinner label="Loading orders" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading orders");
  });

  it("omits the value when it does not know it, rather than guessing zero", () => {
    const { rerender } = render(<Progress label="Upload" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    rerender(<Progress label="Upload" value={40} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("clamps rather than rendering a bar past its own end", () => {
    render(<Progress label="Upload" value={140} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("axe", () => {
  it("passes on a card", async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle as="h2">Acme Ltd</CardTitle>
          <CardDescription>Customer since 2021</CardDescription>
        </CardHeader>
        <CardContent>Three open orders.</CardContent>
      </Card>,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("passes on a breadcrumb trail", async () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Orders</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("passes on a radio card group", async () => {
    const { container } = render(
      <RadioGroup defaultValue="standard" aria-label="Delivery">
        <RadioCard value="standard" label="Standard" description="Three to five days" />
        <RadioCard value="express" label="Express" description="Next working day" />
      </RadioGroup>,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("passes on a tree", async () => {
    const { container } = render(
      <TreeView
        nodes={[{ id: "a", label: "Inbox", children: [{ id: "b", label: "Flagged" }] }]}
        label="Folders"
        defaultExpandedIds={["a"]}
      />,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("passes on a stepper", async () => {
    const { container } = render(
      <Stepper steps={[{ id: "a", label: "One" }, { id: "b", label: "Two" }]} current={0} label="Setup" />,
    );
    expect(await violations(container)).toEqual([]);
  });
});
