import * as React from "react";
import { cn } from "./cn";
import { Label } from "./label";

/*
  Field wiring, which is the part of a form that is always wrong.

  The audit found labels associated by nothing at all, errors rendered as a sibling paragraph no
  assistive technology could connect to the input, and `aria-invalid` nowhere in the portfolio.
  All three are the same omission: the relationship between a control and the text about it is
  expressed by ids, and nobody wants to write ids by hand.

  So this generates them. A `Field` mints one id and hands out four — the control, its label, its
  hint and its error — and the parts read them from context. The call site writes no ids, cannot
  forget `aria-describedby`, and cannot get `aria-invalid` out of step with whether an error is
  actually on screen, because both come from the same prop.
*/

interface FieldContextValue {
  id: string;
  hintId: string;
  errorId: string;
  invalid: boolean;
  /** Whether a hint is present, so the control knows whether to reference its id. */
  hasHint: boolean;
  required: boolean;
  disabled: boolean;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

/**
 * The ids and state for the current field.
 *
 * Throws rather than returning null when used outside a `Field`, because the failure it would
 * otherwise cause is silent: a control with no id renders and works with a mouse, and only a
 * screen reader notices it has no name.
 */
export function useField(): FieldContextValue {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("useField must be used inside a <Field>");
  return ctx;
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Supply one only to match an id a server rendered, or to point a label at it from outside. */
  id?: string;
  /**
   * The message, or nothing. Presence is the single source of truth for the invalid state, so
   * `aria-invalid` and the red border cannot disagree with whether there is text to read.
   */
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Whether a `FieldHint` will be rendered. See the note on `FieldControl`. */
  hint?: boolean;
}

/**
 * One label, one control, and the text about it.
 *
 * `hint` is a boolean here and the hint's text is passed to `FieldHint` instead, which looks
 * redundant and is not: `aria-describedby` must be set on the control during the same render in
 * which the hint exists, and the control is a sibling of the hint rather than its parent, so it
 * cannot discover it. Declaring it on the field is the only ordering that works without a second
 * render pass.
 */
const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, id, error, required = false, disabled = false, hint = false, children, ...props }, ref) => {
    const generated = React.useId();
    const base = id ?? generated;
    const value = React.useMemo<FieldContextValue>(
      () => ({
        id: base,
        hintId: `${base}-hint`,
        errorId: `${base}-error`,
        invalid: Boolean(error),
        hasHint: hint,
        required,
        disabled,
      }),
      [base, error, hint, required, disabled],
    );

    return (
      <FieldContext.Provider value={value}>
        <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
          {children}
          {error && <FieldError>{error}</FieldError>}
        </div>
      </FieldContext.Provider>
    );
  },
);
Field.displayName = "Field";

/**
 * The field's label, pointed at the control by id.
 *
 * `htmlFor` rather than wrapping: a wrapping label makes the whole row a click target, which is
 * wrong for a field whose row contains a second control such as a unit selector or a reveal
 * toggle.
 */
const FieldLabel = React.forwardRef<
  React.ComponentRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, children, ...props }, ref) => {
  const { id, required, disabled } = useField();
  return (
    <Label
      ref={ref}
      htmlFor={id}
      className={cn("flex items-center gap-1", disabled && "opacity-70", className)}
      {...props}
    >
      {children}
      {required && (
        // The asterisk is decorative because the control already carries `required`, which is
        // what a screen reader announces. Left in the accessibility tree it reads as "asterisk"
        // in the middle of the field's name.
        <span aria-hidden="true" className="text-danger">
          *
        </span>
      )}
    </Label>
  );
});
FieldLabel.displayName = "FieldLabel";

/**
 * The props a control needs in order to be described by its own field.
 *
 * Returned as an object rather than applied by cloning children, so it works with any control —
 * this package's `Input`, a bare `<select>`, or a third-party editor — and so the call site can
 * see what is being set.
 */
export function useFieldControlProps() {
  const { id, hintId, errorId, invalid, hasHint, required, disabled } = useField();
  return {
    id,
    // Both ids when both are present, and in reading order: the hint explains the field, the
    // error says what to change. A screen reader reads them in the order listed here.
    "aria-describedby": [hasHint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(" ") || undefined,
    "aria-invalid": invalid || undefined,
    "aria-required": required || undefined,
    required,
    disabled,
  } as const;
}

export interface FieldControlProps {
  /**
   * The control. Given the field's id and aria attributes, so it must forward props to a real
   * form element — every control in this package does.
   */
  children: React.ReactElement;
}

/**
 * Applies `useFieldControlProps` to a single child.
 *
 * Provided for the common case of one plain control. Anything more involved — a control whose
 * props are computed, or two controls sharing a label — should call the hook directly rather
 * than nest elements to satisfy this component.
 */
function FieldControl({ children }: FieldControlProps) {
  const controlProps = useFieldControlProps();
  const { invalid } = useField();
  const child = children as React.ReactElement<{ className?: string }>;
  return React.cloneElement(child, {
    ...controlProps,
    // The invalid border goes on last so a call site can still override it, and it is a border
    // change rather than only a ring: a ring is a focus affordance, and a field can be invalid
    // while something else has focus.
    className: cn(invalid && "border-danger focus-visible:ring-danger", child.props.className),
  } as Partial<typeof child.props>);
}
FieldControl.displayName = "FieldControl";

/**
 * The standing explanation of a field: format, units, what it will be used for.
 *
 * Always rendered before the control in the DOM so it is read as part of arriving at the field
 * rather than after leaving it.
 */
const FieldHint = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { hintId } = useField();
    return <p ref={ref} id={hintId} className={cn("text-xs text-text-muted", className)} {...props} />;
  },
);
FieldHint.displayName = "FieldHint";

/**
 * What is wrong with the current value.
 *
 * Rendered by `Field` from its `error` prop rather than placed by hand, which is what keeps it
 * impossible to show a red border with no message or a message the control does not reference.
 * `role="alert"` because an error that appears after a submit has to be announced without the
 * person going looking for it.
 */
const FieldError = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { errorId } = useField();
    return (
      <p ref={ref} id={errorId} role="alert" className={cn("text-xs font-medium text-danger", className)} {...props} />
    );
  },
);
FieldError.displayName = "FieldError";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /**
   * A submit-time failure that belongs to the form rather than to one field: a rejected card, a
   * stale version, a network error. Render an `Alert` into it at the call site.
   */
  banner?: React.ReactNode;
}

/**
 * A form, with its fields spaced and its form-level error given a fixed place.
 *
 * `noValidate` is set deliberately. The browser's own bubbles cannot be styled, vanish on the
 * next interaction, appear one at a time, and are announced inconsistently; every field here
 * already has a described error that does none of those things. Removing it would give people
 * two error systems disagreeing about the same field.
 */
const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, banner, children, ...props }, ref) => (
    <form ref={ref} noValidate className={cn("space-y-4", className)} {...props}>
      {banner}
      {children}
    </form>
  ),
);
Form.displayName = "Form";

/**
 * The row of buttons that ends a form.
 *
 * Reversed on a narrow screen so the primary action is the one under the thumb, and full-width
 * there because two buttons side by side at phone width give neither enough room to be read.
 */
const FormActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
      {...props}
    />
  ),
);
FormActions.displayName = "FormActions";

export { Form, FormActions, Field, FieldLabel, FieldControl, FieldHint, FieldError };
