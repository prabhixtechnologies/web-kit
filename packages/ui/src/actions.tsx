import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { Button } from "./button";
import { cn } from "./cn";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "./context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/**
 * How much ceremony an action needs before it runs.
 *
 * `confirm` and `undoable` are alternatives, not a scale: an action that is cheap to reverse
 * should never interrupt, and an action that cannot be reversed must. Picking both is how you
 * get a dialog people dismiss without reading.
 */
export type ActionRisk = "safe" | "undoable" | "confirm";

export interface RowAction {
  /** Stable key. Also the value passed to `onSelect` handlers that need to distinguish. */
  id: string;
  label: string;
  icon?: React.ReactNode;
  /**
   * Awaited if it returns a promise, so the confirm dialog can hold its button disabled
   * until the mutation settles. The return value itself is ignored, which keeps call sites
   * from having to wrap handlers that happen to return something — `toast.success` returns
   * an id, and a mutation returns its result.
   */
  onSelect: () => unknown;
  /** Rendered right-aligned. Display only — binding the key is the surface's job. */
  shortcut?: string;
  disabled?: boolean;
  risk?: ActionRisk;
  /** Groups render in order, separated by a rule. Ungrouped actions come first. */
  group?: string;
  /** Required when `risk` is `confirm`. */
  confirm?: {
    title: string;
    /** Say what will be lost and whether it can be undone. Never just "Are you sure?". */
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
  };
}

export interface RowActionsProps {
  actions: RowAction[];
  /** The row. Right-click, long-press and Shift+F10 anywhere inside it open the menu. */
  children: React.ReactNode;
  /**
   * Names the subject, not the menu: "Invoice INV-1043", not "Row actions". It becomes the
   * menu's heading and the visible button's accessible name, so a screen-reader user hears
   * which record they are acting on.
   */
  label: string;
}

interface RowActionsContext {
  actions: RowAction[];
  label: string;
  groups: RowAction[][];
  run: (action: RowAction) => void;
  usable: boolean;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
}

const Ctx = React.createContext<RowActionsContext | null>(null);

/**
 * The visible entry point to the same action list, for placing inside the row wherever the
 * layout wants it. Separate from `RowActions` because only the call site knows where in its
 * own row the control belongs.
 *
 * It should almost always be present: a right-click menu nobody knows about is not an
 * affordance. Omit it only where every action is already reachable from a visible control.
 */
export function RowActionsTrigger({ className }: { className?: string }) {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("RowActionsTrigger must be rendered inside RowActions");
  const { label, groups, run, usable, triggerRef } = ctx;

  const [open, setOpen] = React.useState(false);

  // Shift+F10 and the Menu key are the keyboard equivalents of a right-click, and browsers
  // are inconsistent about turning either into a `contextmenu` event. Opening the menu from
  // state rather than by synthesising a click is deliberate: Radix menus open on pointerdown,
  // so a programmatic `.click()` on the trigger does nothing at all.
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey)) return;
    event.preventDefault();
    setOpen(true);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0 text-text-muted hover:text-text", className)}
          aria-label={`Actions for ${label}`}
          disabled={!usable}
          onKeyDown={onKeyDown}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {groups.map((items, i) => (
          <React.Fragment key={items[0]?.group ?? i}>
            {i > 0 && <DropdownMenuSeparator />}
            {items.map((action) => (
              <DropdownMenuItem
                key={action.id}
                disabled={action.disabled}
                className={
                  action.risk === "confirm"
                    ? "text-destructive focus:bg-danger-subtle focus:text-danger-subtle-ink"
                    : undefined
                }
                onSelect={() => run(action)}
              >
                {action.icon}
                {action.label}
                {action.shortcut && <DropdownMenuShortcut>{action.shortcut}</DropdownMenuShortcut>}
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function group(actions: RowAction[]): RowAction[][] {
  const order: string[] = [];
  const byGroup = new Map<string, RowAction[]>();
  for (const action of actions) {
    const key = action.group ?? "";
    if (!byGroup.has(key)) {
      byGroup.set(key, []);
      order.push(key);
    }
    byGroup.get(key)!.push(action);
  }
  // The ungrouped bucket leads, so a row's primary verbs stay at the top where the pointer
  // and the keyboard both land first.
  order.sort((a, b) => (a === "" ? -1 : b === "" ? 1 : 0));
  return order.map((k) => byGroup.get(k)!);
}

/**
 * The interaction contract for a row, in one component.
 *
 * The action list is canonical. From it this renders the right-click menu (which the browser
 * also opens for Shift+F10, and Radix opens on a touch long-press), a visible button with the
 * identical list, and the confirmation step for anything that cannot be undone. Adding an
 * action to the array adds it to every route at once, which is the only way a portfolio this
 * size keeps them in agreement.
 *
 * Gestures are shortcuts here, never the only path. See Infra/docs/UX-STANDARD.md § 3.6.
 */
export function RowActions({ actions, children, label }: RowActionsProps) {
  const [pending, setPending] = React.useState<RowAction | null>(null);
  const [running, setRunning] = React.useState(false);

  const run = React.useCallback((action: RowAction) => {
    if (action.risk === "confirm") {
      setPending(action);
      return;
    }
    void action.onSelect();
  }, []);

  const confirmPending = React.useCallback(async () => {
    if (!pending) return;
    setRunning(true);
    try {
      await pending.onSelect();
      setPending(null);
    } finally {
      setRunning(false);
    }
  }, [pending]);

  const groups = React.useMemo(() => group(actions), [actions]);
  const usable = actions.some((a) => !a.disabled);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const ctx = React.useMemo<RowActionsContext>(
    () => ({ actions, label, groups, run, usable, triggerRef }),
    [actions, label, groups, run, usable],
  );

  return (
    <Ctx.Provider value={ctx}>
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={!usable}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{label}</ContextMenuLabel>
          <ContextMenuSeparator />
          {groups.map((items, i) => (
            <React.Fragment key={items[0]?.group ?? i}>
              {i > 0 && <ContextMenuSeparator />}
              {items.map((action) => (
                <ContextMenuItem
                  key={action.id}
                  disabled={action.disabled}
                  destructive={action.risk === "confirm"}
                  onSelect={() => run(action)}
                >
                  {action.icon}
                  {action.label}
                  {action.shortcut && <ContextMenuShortcut>{action.shortcut}</ContextMenuShortcut>}
                </ContextMenuItem>
              ))}
            </React.Fragment>
          ))}
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pending?.confirm?.title ?? pending?.label}</DialogTitle>
            <DialogDescription>{pending?.confirm?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={running}>
              {pending?.confirm?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant="destructive" onClick={confirmPending} disabled={running}>
              {running ? "Working…" : (pending?.confirm?.confirmLabel ?? "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
