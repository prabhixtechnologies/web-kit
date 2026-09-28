import { render } from "@testing-library/react";
import axe from "axe-core";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { Alert } from "./alert";
import { Button } from "./button";
import { DataTable, type Column } from "./data-table";
import { EmptyState, ErrorState } from "./empty-state";
import { Field, FieldControl, FieldHint, FieldLabel, Form, FormActions } from "./form";
import { Input } from "./input";

/*
  axe over each primitive in a realistic arrangement.

  This catches the class of mistake that a behavioural test does not: a label with no control, a
  button with no name, a table cell outside a row, an aria attribute that is not allowed on the
  element carrying it. All four were present somewhere in the portfolio before the primitives
  existed, and all four are the kind of thing that survives review because the component looks
  right on screen.

  What axe cannot see is also worth stating: it does not check contrast here, because jsdom
  applies no stylesheet — contrast is asserted at build time by the token gate instead, against
  the token values themselves, which is stricter than sampling rendered pixels.
*/

/** axe, with the rules it cannot judge in jsdom turned off rather than silently passing. */
async function check(element: HTMLElement) {
  const results = await axe.run(element, {
    rules: {
      // Needs a stylesheet, which jsdom does not apply. Covered by the token contrast gate.
      "color-contrast": { enabled: false },
      // These judge a whole document. A primitive rendered on its own is not one, and enabling
      // them here reports the test harness rather than the component.
      region: { enabled: false },
      "page-has-heading-one": { enabled: false },
      "landmark-one-main": { enabled: false },
    },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
}

interface Row {
  id: string;
  number: string;
  customer: string;
}

const rows: Row[] = [
  { id: "1", number: "INV-1041", customer: "Acme" },
  { id: "2", number: "INV-1042", customer: "Borealis" },
];

const columns: Column<Row>[] = [
  { key: "number", header: "Number", cell: (r) => r.number, sortable: true },
  { key: "customer", header: "Customer", cell: (r) => r.customer },
];

describe("primitives are clean under axe", () => {
  it("a form with a hint and an error", async () => {
    const { container } = render(
      <Form>
        <Field hint required>
          <FieldLabel>Email</FieldLabel>
          <FieldHint>We only use this to send receipts.</FieldHint>
          <FieldControl>
            <Input type="email" />
          </FieldControl>
        </Field>
        <Field error="Enter an amount above zero" required>
          <FieldLabel>Amount</FieldLabel>
          <FieldControl>
            <Input type="number" />
          </FieldControl>
        </Field>
        <FormActions>
          <Button variant="outline">Cancel</Button>
          <Button type="submit">Save</Button>
        </FormActions>
      </Form>,
    );
    expect(await check(container)).toEqual([]);
  });

  it("every alert tone, including a dismissible one", async () => {
    const { container } = render(
      <div>
        <Alert tone="info" title="Scheduled maintenance">
          Sunday 02:00 to 04:00 IST.
        </Alert>
        <Alert tone="success" title="Invoice sent" />
        <Alert tone="warning" title="Seats nearly used up" onDismiss={() => {}} />
        <Alert tone="danger" title="Payment declined">
          The card issuer declined the charge.
        </Alert>
        <Alert tone="neutral" title="Draft" />
      </div>,
    );
    expect(await check(container)).toEqual([]);
  });

  it("a sortable, selectable table with row actions", async () => {
    const Wrapper = () => {
      const [selected, setSelected] = React.useState<Set<string>>(new Set(["1"]));
      return (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          rowLabel={(r) => `Invoice ${r.number}`}
          caption="Invoices"
          sort={{ key: "number", direction: "asc" }}
          onSortChange={() => {}}
          onRowClick={() => {}}
          selection={{ selected, onChange: setSelected }}
          rowActions={() => [{ id: "void", label: "Void", onSelect: () => {} }]}
        />
      );
    };
    const { container } = render(<Wrapper />);
    expect(await check(container)).toEqual([]);
  });

  it("the table's loading, empty and error states", async () => {
    const loading = render(
      <DataTable columns={columns} rows={undefined} rowKey={(r: Row) => r.id} loading caption="Invoices" />,
    );
    expect(await check(loading.container)).toEqual([]);

    const empty = render(
      <EmptyState title="No invoices yet" hint="They appear here once you raise one." action={<Button>New invoice</Button>} />,
    );
    expect(await check(empty.container)).toEqual([]);

    const error = render(<ErrorState message="Network unreachable" onRetry={() => {}} />);
    expect(await check(error.container)).toEqual([]);
  });
});
