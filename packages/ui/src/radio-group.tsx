import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import * as React from "react";
import { cn } from "./cn";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "aspect-square size-5 shrink-0 rounded-full border border-border-strong text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="size-2.5 fill-current text-current" aria-hidden />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = "RadioGroupItem";

export interface RadioCardProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * A radio whose whole card is the target.
 *
 * The plain dot is a 20px hit area, which clears the AA floor and nothing more. Where the
 * choice is a real decision - a plan, a shipping speed, a refund reason - the label and the
 * explanation should be part of the control, not text beside it that does nothing when tapped.
 */
const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioCardProps
>(({ className, label, description, id, ...props }, ref) => {
  const generated = React.useId();
  const itemId = id ?? generated;
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      id={itemId}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border border-border bg-surface-raised p-4 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-surface-muted",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong group-data-[state=checked]:border-primary"
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="size-2.5 fill-primary text-primary" />
        </RadioGroupPrimitive.Indicator>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-text-muted">{description}</span>}
      </span>
    </RadioGroupPrimitive.Item>
  );
});
RadioCard.displayName = "RadioCard";

export { RadioGroup, RadioGroupItem, RadioCard };
