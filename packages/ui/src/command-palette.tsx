import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";
import { useHotkey } from "./use-hotkeys";

/*
  The command palette: one place that can reach every action in the product.

  This is the answer to the navigation question these apps keep failing. OneOps has fourteen
  screens behind a sidebar that collapses on narrow windows; MobiStack buries stock adjustment
  three levels into a menu. Every one of those is reachable in two keystrokes here, and - the
  part that matters more - discoverable, because typing "stock" surfaces the three things you
  can do to stock without having to know where they live.

  Commands are registered rather than listed in one file. A page can add its own while it is
  open and they leave with it, which is the only way "Mark this order refunded" can be in the
  palette at all - it is meaningless anywhere else.
*/

export interface PaletteCommand {
  id: string;
  label: string;
  /** Shown under the label. Use it for the disambiguation, not for a second sentence. */
  description?: string;
  /** The heading this sits under. Commands with no group land in the first block. */
  group?: string;
  /** Extra search terms. "Stock" should find "Inventory"; nobody searches for the word you chose. */
  keywords?: string[];
  icon?: React.ReactNode;
  /** Displayed, not bound. The action's own shortcut is registered wherever it lives. */
  shortcut?: string;
  /** Sorts within a group. Lower first; equal values keep registration order. */
  order?: number;
  perform: () => void;
}

interface Registry {
  register: (commands: PaletteCommand[]) => () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const RegistryContext = React.createContext<Registry | null>(null);
const CommandsContext = React.createContext<PaletteCommand[]>([]);

/**
 * Publishes commands for as long as the calling component is mounted.
 *
 * ```tsx
 * useCommands(
 *   [{ id: "new-order", label: "New work order", group: "Create", perform: () => navigate("/orders/new") }],
 *   [navigate],
 * );
 * ```
 *
 * `deps` works like any other hook's: list what the commands close over. Without it, an inline
 * array re-registers every render.
 */
export function useCommands(commands: PaletteCommand[], deps: React.DependencyList = []) {
  const registry = React.useContext(RegistryContext);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoised = React.useMemo(() => commands, deps);

  React.useEffect(() => {
    // No provider is not an error. A component that offers commands should still render in a
    // test, in Storybook, or in an app that has not adopted the palette yet.
    if (!registry) return;
    return registry.register(memoised);
  }, [registry, memoised]);
}

/** Opens and closes the palette from outside it - a toolbar button, a "press ⌘K" hint. */
export function useCommandPalette() {
  const registry = React.useContext(RegistryContext);
  if (!registry) {
    throw new Error("useCommandPalette must be used inside <CommandPaletteProvider>");
  }
  return registry;
}

export interface CommandPaletteProviderProps {
  children: React.ReactNode;
  /** Always available, wherever you are. Navigation, sign out, theme. */
  staticCommands?: PaletteCommand[];
  placeholder?: string;
  /** Default `mod+k`. `mod+j` and `ctrl+shift+p` are the other two conventions. */
  hotkey?: string | string[];
  emptyMessage?: string;
}

export function CommandPaletteProvider({
  children,
  staticCommands,
  placeholder = "Search for anything, or type a command",
  hotkey = "mod+k",
  emptyMessage = "Nothing matches that.",
}: CommandPaletteProviderProps) {
  const [open, setOpen] = React.useState(false);
  const [dynamic, setDynamic] = React.useState<PaletteCommand[][]>([]);

  const register = React.useCallback((commands: PaletteCommand[]) => {
    setDynamic((previous) => [...previous, commands]);
    return () => setDynamic((previous) => previous.filter((group) => group !== commands));
  }, []);

  const registry = React.useMemo<Registry>(
    () => ({
      register,
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((previous) => !previous),
    }),
    [register],
  );

  // Allowed inside inputs, unlike most shortcuts: mod+k in a search box is reaching for the
  // palette, not typing a k, and the whole point is that it works from wherever you are.
  useHotkey(hotkey, () => setOpen((previous) => !previous), { enableInInputs: true });

  const commands = React.useMemo(
    () => [...(staticCommands ?? []), ...dynamic.flat()],
    [staticCommands, dynamic],
  );

  return (
    <RegistryContext.Provider value={registry}>
      <CommandsContext.Provider value={commands}>
        {children}
        <CommandPalette
          open={open}
          onOpenChange={setOpen}
          commands={commands}
          placeholder={placeholder}
          emptyMessage={emptyMessage}
        />
      </CommandsContext.Provider>
    </RegistryContext.Provider>
  );
}

/** Everything currently registered - for a keyboard-shortcuts sheet, or a test. */
export function useRegisteredCommands() {
  return React.useContext(CommandsContext);
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: PaletteCommand[];
  placeholder: string;
  emptyMessage: string;
}

function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder,
  emptyMessage,
}: CommandPaletteProps) {
  const grouped = React.useMemo(() => {
    const groups = new Map<string, PaletteCommand[]>();
    for (const command of commands) {
      const name = command.group ?? "";
      const bucket = groups.get(name);
      if (bucket) bucket.push(command);
      else groups.set(name, [command]);
    }
    for (const bucket of groups.values()) {
      // Stable within equal `order`, so two commands registered together stay in the order
      // they were written and the list does not shuffle between renders.
      bucket.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return [...groups.entries()];
  }, [commands]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        {grouped.map(([group, items], index) => (
          <React.Fragment key={group || "_"}>
            {index > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={group || undefined}>
              {items.map((command) => (
                <CommandItem
                  key={command.id}
                  // cmdk matches on this string, so everything searchable goes in it. Without
                  // the keywords, "stock" would not find "Inventory" and the palette would
                  // only work for people who already know the menu labels.
                  value={[command.label, command.description, ...(command.keywords ?? [])]
                    .filter(Boolean)
                    .join(" ")}
                  onSelect={() => {
                    // Closed first. Several of these navigate, and a dialog unmounting during
                    // a route change is how focus ends up on nothing.
                    onOpenChange(false);
                    command.perform();
                  }}
                >
                  {command.icon ? (
                    <span className="mr-2 flex size-4 items-center justify-center text-text-muted">
                      {command.icon}
                    </span>
                  ) : null}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{command.label}</span>
                    {command.description ? (
                      <span className="truncate text-xs text-text-muted">{command.description}</span>
                    ) : null}
                  </span>
                  {command.shortcut ? <CommandShortcut>{command.shortcut}</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
