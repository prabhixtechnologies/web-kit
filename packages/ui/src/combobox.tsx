import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "./button";
import { cn } from "./cn";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Second line, for disambiguating two options with the same name. */
  description?: string;
  /** Extra words to match on that are not shown - a SKU, an email, a former name. */
  keywords?: string[];
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** Shown on the trigger when nothing is chosen. */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Required: the trigger is a button whose text changes, so it needs a stable name. */
  label: string;
  disabled?: boolean;
  className?: string;
  /** Let the chosen option be unchosen by picking it again. */
  clearable?: boolean;
}

/**
 * A select you can type into.
 *
 * `Select` is right up to about a dozen options; past that, scanning a list is slower than
 * typing three letters, and past a hundred it is hopeless. This is the same keyboard contract
 * as the command palette because it is the same component underneath - arrows move, enter
 * chooses, escape closes, and the filter matches the label, the description and any keywords.
 */
const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      options,
      value,
      onValueChange,
      placeholder = "Select\u2026",
      searchPlaceholder = "Search\u2026",
      emptyMessage = "Nothing matches that.",
      label,
      disabled,
      className,
      clearable = false,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const selected = options.find((option) => option.value === value) ?? null;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label}
            disabled={disabled}
            className={cn("w-full justify-between font-normal", className)}
          >
            <span className={cn("truncate", !selected && "text-text-faint")}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronsUpDown className="ml-2 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        {/* Matched to the trigger so the list does not jump wider than the control that
            opened it, which on a narrow form pushes it off the edge of the screen. */}
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    // cmdk filters on this, not on the rendered children, so the keywords and
                    // the description are searchable without being the label.
                    value={[option.label, option.description, ...(option.keywords ?? [])]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={option.disabled}
                    onSelect={() => {
                      const next = clearable && option.value === value ? null : option.value;
                      onValueChange(next);
                      setOpen(false);
                    }}
                  >
                    <Check
                      aria-hidden
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        option.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description && (
                        <span className="block truncate text-xs text-text-muted">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
Combobox.displayName = "Combobox";

export { Combobox };
