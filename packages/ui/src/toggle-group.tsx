import * as TogglePrimitive from "@radix-ui/react-toggle";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "./cn";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-surface-muted data-[state=on]:text-text [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent text-text-muted",
        outline: "border border-border bg-transparent text-text-muted data-[state=on]:border-primary",
      },
      size: {
        default: "min-h-11 px-3",
        sm: "min-h-9 px-2.5",
        // 32px, above the 24px AA pointer-target floor. Anything smaller belongs in a menu.
        xs: "min-h-8 px-2 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

/** One independent on/off, for a toolbar: bold, mute, pin. */
const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
));
Toggle.displayName = "Toggle";

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({});

/**
 * Several toggles that belong together.
 *
 * `type="multiple"` is the reason this exists alongside `SegmentedControl`: that one is a
 * radio group and can only hold one answer. When any combination is valid - which statuses to
 * show, which columns to keep - it is not a radio group and must not announce itself as one.
 */
const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center gap-1", className)}
    {...props}
  >
    {/* Through context rather than cloned onto each child, so a caller can wrap an item in a
        tooltip without the styling silently disappearing. */}
    <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));
ToggleGroup.displayName = "ToggleGroup";

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => {
  const group = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({ variant: variant ?? group.variant, size: size ?? group.size, className }),
      )}
      {...props}
    />
  );
});
ToggleGroupItem.displayName = "ToggleGroupItem";

export { Toggle, ToggleGroup, ToggleGroupItem, toggleVariants };
