import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  type RowAction,
  RowActions,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@prabhixtechnologies/ui";
import { Archive, Copy, Pencil, Trash2 } from "lucide-react";
import { Group, Shot } from "../shot";

/*
  Everything here renders into a portal, so it is not on the page until something opens it.

  The gallery therefore shows the triggers, and the visual tests click them and photograph what
  appears. That is deliberate rather than a limitation: an overlay's colour comes from the same
  tokens as the page under it, and the one thing a mounted-open gallery could not check is that
  the overlay lands on top of a surface it is still readable against.
*/

const ROW_ACTIONS: RowAction[] = [
  { id: "open", label: "Open", icon: <Pencil className="size-4" />, onSelect: () => {}, shortcut: "Enter" },
  { id: "copy", label: "Copy reference", icon: <Copy className="size-4" />, onSelect: () => {} },
  { id: "archive", label: "Archive", icon: <Archive className="size-4" />, onSelect: () => {}, risk: "undoable", group: "manage" },
  {
    id: "delete",
    label: "Delete invoice",
    icon: <Trash2 className="size-4" />,
    onSelect: () => {},
    risk: "confirm",
    group: "manage",
    confirm: {
      title: "Delete INV-1043?",
      message: "The invoice and its payment history go with it. This cannot be undone.",
      // Required, and the reason is worth keeping: the button says what it will do, so someone
      // who reads only the button still knows. "OK" on a destructive dialog says nothing.
      confirmLabel: "Delete invoice",
    },
  },
];

export function Overlays() {
  return (
    <>
      <Shot name="overlay-triggers">
        <Group label="dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reschedule delivery</DialogTitle>
                <DialogDescription>
                  The courier will attempt the address once more on the chosen day.
                </DialogDescription>
              </DialogHeader>
              <Input defaultValue="Friday 3 October" aria-label="Delivery date" />
              <DialogFooter>
                <Button variant="ghost">Cancel</Button>
                <Button>Reschedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Group>

        <Group label="sheet">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>INV-1043</SheetTitle>
                <SheetDescription>Coastal Supply, Indore</SheetDescription>
              </SheetHeader>
              <div className="px-4 text-sm text-text-muted">Overdue by nine days.</div>
            </SheetContent>
          </Sheet>
        </Group>

        <Group label="popover">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="grid gap-2">
                <div className="text-sm font-medium text-text">Filter</div>
                <Input placeholder="Customer" aria-label="Customer" />
              </div>
            </PopoverContent>
          </Popover>
        </Group>

        <Group label="dropdown">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>INV-1043</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Open
                <DropdownMenuShortcut>Enter</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>Copy reference</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Delete invoice</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Group>

        <Group label="hover card">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link">Coastal Supply</Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72">
              <div className="text-sm text-text">Coastal Supply</div>
              <div className="text-sm text-text-muted">Customer since 2021. Net 14 terms.</div>
            </HoverCardContent>
          </HoverCard>
        </Group>
      </Shot>

      {/* Right-click, long-press and Shift+F10 all open this. The gesture contract is asserted
          in actions.test.tsx; what a photograph adds is where the menu lands. */}
      <Shot name="row-actions">
        <RowActions actions={ROW_ACTIONS} label="Invoice INV-1043">
          <div className="flex w-full max-w-2xl items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3">
            <span className="font-mono text-xs text-text">INV-1043</span>
            <span className="text-sm text-text-muted">Coastal Supply</span>
            <span className="text-sm text-text">₹41,000</span>
          </div>
        </RowActions>
      </Shot>

      <Shot name="context-menu-target">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="grid h-24 w-full max-w-2xl place-items-center rounded-lg border border-dashed border-border-strong bg-surface-muted text-sm text-text-muted">
              Right-click anywhere in this area
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Mark as read</ContextMenuItem>
            <ContextMenuItem>Snooze until tomorrow</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem destructive>Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Shot>

      {/* cmdk renders inline rather than through a portal, so the palette can be photographed
          in place - and it is the densest piece of interactive chrome in the set. */}
      <Shot name="command-palette">
        <Command className="w-full max-w-lg rounded-lg border border-border bg-surface-raised">
          <CommandInput placeholder="Search orders, customers, settings" />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup heading="Jump to">
              <CommandItem>
                Dispatch board
                <CommandShortcut>G then D</CommandShortcut>
              </CommandItem>
              <CommandItem>
                Invoices
                <CommandShortcut>G then I</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem>Create invoice</CommandItem>
              <CommandItem>Export this month</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </Shot>
    </>
  );
}
