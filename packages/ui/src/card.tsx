import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "./cn";

// Four apps each had their own, and they disagreed about every one of the three things a card
// decides: whether it sits on a raised surface or the page surface, whether it has a border or
// a shadow, and how round it is. The disagreement was visible whenever two products were open
// side by side, which for this portfolio is most of the time.
const cardVariants = cva("rounded-xl text-text", {
  variants: {
    variant: {
      // The default. A hairline and a raised surface, no shadow: on a dense console screen a
      // shadow under every card turns the page grey.
      default: "border border-border bg-surface-raised",
      // For a card that is the only thing on the screen, or is floating over something.
      raised: "border border-border bg-surface-raised shadow-[var(--px-elevation-2)]",
      // Recessed rather than raised - a well for a nested list, a diff, a preview.
      sunken: "border border-border bg-surface-muted",
      // No chrome at all. For a grid where the spacing does the grouping.
      plain: "bg-transparent",
    },
    /** Set false when the card contains its own full-bleed header or image. */
    padded: { true: "p-5", false: "" },
    interactive: {
      true: "text-left transition-colors hover:border-primary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      false: "",
    },
  },
  defaultVariants: { variant: "default", padded: true, interactive: false },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * Render as something else - most usefully a `button` or an `a` when the whole card is the
   * target. A card that navigates must be one of those and not a `div` with an onClick, which
   * is why `interactive` styles the focus ring but does not make anything focusable.
   */
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padded, interactive, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, padded, interactive, className }))}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 pb-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

/**
 * `h3` by default because a card is almost never the top of a page. Pass `as` where it is -
 * heading order is a real navigation aid for anyone reading by landmark, and a page of h3s
 * with no h2 above them reads as a page with no structure.
 */
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" | "h4" }
>(({ className, as: Comp = "h3", ...props }, ref) => (
  <Comp ref={ref} className={cn("text-base font-semibold text-text", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-text-muted", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2 pt-4", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
