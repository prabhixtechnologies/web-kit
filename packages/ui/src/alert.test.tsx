import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "./alert";
import { EmptyState, ErrorState, NoResultsState } from "./empty-state";

describe("Alert", () => {
  /*
    The tone decides three things at once — colour, icon and how loudly a screen reader is
    interrupted — and these check that the third one follows from the first. A failed payment
    announced politely is missed; a success message announced as an alert talks over whatever
    the person was reading.
  */
  it("interrupts for a problem", () => {
    render(<Alert tone="danger" title="Payment declined" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Payment declined");
  });

  it("interrupts for a warning", () => {
    render(<Alert tone="warning" title="Seats nearly used up" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not interrupt for information or success", () => {
    render(
      <>
        <Alert tone="info" title="Scheduled maintenance" />
        <Alert tone="success" title="Invoice sent" />
      </>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("does not rely on colour alone", () => {
    const { container } = render(<Alert tone="danger" title="Payment declined" />);
    // WCAG 1.4.1. The icon is decorative, so what is being checked is that the shape carries a
    // non-colour cue at all, alongside text that says what happened.
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Payment declined");
  });

  it("keeps the icon out of the accessibility tree, so the status is not read twice", () => {
    render(<Alert tone="success" title="Invoice sent" />);
    expect(screen.getByRole("status")).toHaveTextContent("Invoice sent");
    expect(screen.getByRole("status").querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("names the dismiss button after the message it closes", async () => {
    const onDismiss = vi.fn();
    render(<Alert tone="info" title="Scheduled maintenance" onDismiss={onDismiss} />);
    // An unlabelled X is announced as "button", and a page can have several.
    const close = screen.getByRole("button", { name: "Dismiss: Scheduled maintenance" });
    await userEvent.click(close);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("has no dismiss button unless a handler is given", () => {
    render(<Alert tone="info" title="Scheduled maintenance" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("says what is missing and how the list fills up", () => {
    render(<EmptyState title="No invoices yet" hint="Invoices appear here once you raise one." />);
    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    expect(screen.getByText(/once you raise one/i)).toBeInTheDocument();
  });
});

describe("NoResultsState", () => {
  it("quotes the query back, which is what makes a forgotten filter visible", () => {
    render(<NoResultsState query="acme" onClear={vi.fn()} />);
    expect(screen.getByText('No matches for "acme"')).toBeInTheDocument();
  });

  it("offers to clear the filter rather than to create a record", async () => {
    const onClear = vi.fn();
    render(<NoResultsState query="acme" onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe("ErrorState", () => {
  it("is announced, because silence is indistinguishable from a slow load", () => {
    render(<ErrorState message="Network unreachable" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network unreachable");
  });

  it("shows what the server said rather than a generic apology", () => {
    render(<ErrorState message="You do not have permission to view invoices" />);
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });

  it("holds the retry button while a refetch is in flight", () => {
    render(<ErrorState message="Network unreachable" onRetry={vi.fn()} retrying />);
    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled();
  });
});
