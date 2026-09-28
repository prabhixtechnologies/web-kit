import { ChevronRight } from "lucide-react";
import * as React from "react";
import { cn } from "./cn";

export interface TreeNode {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** A trailing count, status dot, or anything else that belongs at the end of the row. */
  meta?: React.ReactNode;
  children?: TreeNode[];
}

export interface TreeViewProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "onSelect"> {
  nodes: TreeNode[];
  label: string;
  selectedId?: string | null;
  onSelect?: (node: TreeNode) => void;
  expandedIds?: Set<string>;
  onExpandedChange?: (ids: Set<string>) => void;
  /** Ids open on first render when the component manages expansion itself. */
  defaultExpandedIds?: string[];
}

/** Depth-first order of what is currently visible - what the arrow keys walk. */
function visible(nodes: TreeNode[], expanded: Set<string>, depth = 0): { node: TreeNode; depth: number }[] {
  return nodes.flatMap((node) => {
    const row = { node, depth };
    const open = node.children?.length && expanded.has(node.id);
    return open ? [row, ...visible(node.children!, expanded, depth + 1)] : [row];
  });
}

/**
 * A nested list - folders, categories, an org chart.
 *
 * The keyboard contract is the reason this is a component and not a styled `<ul>`: a tree is
 * one tab stop, and inside it the arrows move. Down and up walk what is visible, right opens a
 * closed branch and then steps into it, left closes an open one and then steps out to the
 * parent. That is the WAI-ARIA tree pattern, and half of a tree's value is unreachable without
 * it - nobody tabs through four hundred folders.
 */
const TreeView = React.forwardRef<HTMLUListElement, TreeViewProps>(
  (
    {
      nodes,
      label,
      selectedId,
      onSelect,
      expandedIds,
      onExpandedChange,
      defaultExpandedIds = [],
      className,
      ...props
    },
    ref,
  ) => {
    const [ownExpanded, setOwnExpanded] = React.useState(() => new Set(defaultExpandedIds));
    const expanded = expandedIds ?? ownExpanded;
    const setExpanded = React.useCallback(
      (next: Set<string>) => (onExpandedChange ? onExpandedChange(next) : setOwnExpanded(next)),
      [onExpandedChange],
    );

    const rows = visible(nodes, expanded);
    // Whichever row is selected owns the tab stop; failing that, the first one. A tree with no
    // reachable row is a tree nobody can enter.
    const [focusId, setFocusId] = React.useState<string | null>(null);
    const activeId = focusId ?? selectedId ?? rows[0]?.node.id ?? null;
    const refs = React.useRef(new Map<string, HTMLDivElement | null>());

    function focus(id: string) {
      setFocusId(id);
      refs.current.get(id)?.focus();
    }

    function toggle(id: string, open: boolean) {
      const next = new Set(expanded);
      if (open) next.add(id);
      else next.delete(id);
      setExpanded(next);
    }

    function onKeyDown(event: React.KeyboardEvent, node: TreeNode, depth: number) {
      const at = rows.findIndex((row) => row.node.id === node.id);
      const branch = Boolean(node.children?.length);
      const open = branch && expanded.has(node.id);

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          if (rows[at + 1]) focus(rows[at + 1].node.id);
          break;
        case "ArrowUp":
          event.preventDefault();
          if (rows[at - 1]) focus(rows[at - 1].node.id);
          break;
        case "ArrowRight":
          event.preventDefault();
          if (branch && !open) toggle(node.id, true);
          else if (open && rows[at + 1]) focus(rows[at + 1].node.id);
          break;
        case "ArrowLeft": {
          event.preventDefault();
          if (open) {
            toggle(node.id, false);
            break;
          }
          // Out to the parent, which is the nearest row above at a shallower depth.
          for (let i = at - 1; i >= 0; i--) {
            if (rows[i].depth < depth) {
              focus(rows[i].node.id);
              break;
            }
          }
          break;
        }
        case "Home":
          event.preventDefault();
          if (rows[0]) focus(rows[0].node.id);
          break;
        case "End":
          event.preventDefault();
          if (rows.at(-1)) focus(rows.at(-1)!.node.id);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (branch) toggle(node.id, !open);
          onSelect?.(node);
          break;
        default:
          break;
      }
    }

    function render(list: TreeNode[], depth: number): React.ReactNode {
      return list.map((node) => {
        const branch = Boolean(node.children?.length);
        const open = branch && expanded.has(node.id);
        return (
          <li key={node.id} role="none">
            <div
              ref={(element) => {
                refs.current.set(node.id, element);
              }}
              role="treeitem"
              aria-expanded={branch ? open : undefined}
              aria-selected={selectedId === node.id}
              // Levels are 1-based in ARIA, and must be explicit: the markup nests but the
              // role="none" wrappers mean assistive tech cannot infer the depth.
              aria-level={depth + 1}
              tabIndex={activeId === node.id ? 0 : -1}
              onFocus={() => setFocusId(node.id)}
              onKeyDown={(event) => onKeyDown(event, node, depth)}
              onClick={() => {
                if (branch) toggle(node.id, !open);
                onSelect?.(node);
              }}
              style={{ paddingInlineStart: `${depth * 16 + 8}px` }}
              className={cn(
                "flex min-h-9 cursor-pointer select-none items-center gap-1.5 rounded-lg pe-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedId === node.id
                  ? "bg-surface-muted font-medium text-text"
                  : "text-text-muted hover:bg-surface-muted hover:text-text",
              )}
            >
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-4 shrink-0 transition-transform motion-reduce:transition-none",
                  open && "rotate-90",
                  !branch && "invisible",
                )}
              />
              {node.icon}
              <span className="min-w-0 flex-1 truncate">{node.label}</span>
              {node.meta}
            </div>
            {open && (
              <ul role="group" className="m-0 list-none p-0">
                {render(node.children!, depth + 1)}
              </ul>
            )}
          </li>
        );
      });
    }

    return (
      <ul
        ref={ref}
        role="tree"
        aria-label={label}
        className={cn("m-0 list-none p-0", className)}
        {...props}
      >
        {render(nodes, 0)}
      </ul>
    );
  },
);
TreeView.displayName = "TreeView";

export { TreeView };
