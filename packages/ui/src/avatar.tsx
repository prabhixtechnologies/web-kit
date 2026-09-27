import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";
import { cn } from "./cn";
import { toneFor, type TagTone } from "./tags";

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  /**
   * The identity this avatar stands for: an email, a display name, a workspace name.
   *
   * Passing it colours the initials from the tag swatches, stably, so the same person is
   * the same colour on every screen and across sessions without storing a colour per
   * record. Twenty grey circles of initials are a wall of noise; twenty coloured ones are
   * scannable. Colour is never the only signal - the initials still carry the meaning, so
   * this stays legible to anyone who cannot tell the swatches apart.
   */
  seed?: string;

  /** Overrides what [seed] would have picked. */
  tone?: TagTone;
}

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, seed, tone, style, ...props }, ref) => {
  const picked = tone ?? (seed ? toneFor(seed) : undefined);
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full text-xs font-semibold",
        picked
          ? "bg-[var(--tag-bg)] text-[var(--tag-ink)]"
          : "bg-surface-muted text-text",
        className,
      )}
      style={
        picked
          ? ({
              "--tag-bg": `var(--px-tag-${picked}-bg)`,
              "--tag-ink": `var(--px-tag-${picked}-ink)`,
              ...style,
            } as React.CSSProperties)
          : style
      }
      {...props}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
