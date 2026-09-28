import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, FieldControl, FieldError, FieldHint, FieldLabel, Form } from "./form";
import { Input } from "./input";

/*
  These test the wiring, which is the entire reason the component exists. Every assertion here
  corresponds to something the audit found missing somewhere in the portfolio: a label attached
  to nothing, an error message no assistive technology could reach, `aria-invalid` never set.
*/

function Example({ error, hint }: { error?: string; hint?: string }) {
  return (
    <Form>
      <Field error={error} hint={Boolean(hint)} required>
        <FieldLabel>Email</FieldLabel>
        {hint && <FieldHint>We only use this to send receipts.</FieldHint>}
        <FieldControl>
          <Input type="email" />
        </FieldControl>
      </Field>
    </Form>
  );
}

describe("Field", () => {
  it("names the control through its label", () => {
    render(<Example />);
    // Found by its accessible name, which only works if htmlFor and id actually match. Querying
    // by role and name is the assertion — a test that read the id attribute directly would pass
    // just as happily with the label pointing somewhere else.
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
  });

  it("marks the control required without reading the asterisk aloud", () => {
    render(<Example />);
    const input = screen.getByRole("textbox", { name: /email/i });
    expect(input).toBeRequired();
    // "Email *" would mean the asterisk is in the accessibility tree.
    expect(input).toHaveAccessibleName("Email");
  });

  it("describes the control with its hint", () => {
    render(<Example hint="yes" />);
    expect(screen.getByRole("textbox", { name: /email/i })).toHaveAccessibleDescription(
      /only use this to send receipts/i,
    );
  });

  it("is not invalid and has no message when there is no error", () => {
    render(<Example hint="yes" />);
    const input = screen.getByRole("textbox", { name: /email/i });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("marks the control invalid and points it at the message", () => {
    render(<Example error="Enter a valid email address" />);
    const input = screen.getByRole("textbox", { name: /email/i });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email address");
    // role=alert, so it is announced on a submit the person is not looking at.
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address");
  });

  it("describes the control with the hint and the error together, hint first", () => {
    render(<Example hint="yes" error="Enter a valid email address" />);
    const input = screen.getByRole("textbox", { name: /email/i });
    // Order matters: the hint explains the field, the error says what to change, and a screen
    // reader reads aria-describedby in the order the ids are listed.
    expect(input).toHaveAccessibleDescription(
      "We only use this to send receipts. Enter a valid email address",
    );
  });

  it("gives two fields on one page distinct ids", () => {
    render(
      <>
        <Example />
        <Example />
      </>,
    );
    const [first, second] = screen.getAllByRole("textbox", { name: /email/i });
    expect(first.id).not.toBe("");
    expect(first.id).not.toBe(second.id);
  });

  it("suppresses native validation bubbles, which would duplicate the message", () => {
    const { container } = render(<Example error="Enter a valid email address" />);
    expect(container.querySelector("form")).toHaveAttribute("noValidate");
  });
});
