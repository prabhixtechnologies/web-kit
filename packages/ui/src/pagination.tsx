import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "./button";
import { cn } from "./cn";

/**
 * Numbered pages, for lists that are addressable by page.
 *
 * `DataTable`'s `TablePager` is the other one, and they are not the same thing: that is a
 * cursor pager for a feed with no total, so it can only offer next and previous. This needs to
 * know how many there are, and in exchange it lets someone jump.
 */
export interface PaginationProps extends Omit<React.ComponentProps<"nav">, "onChange"> {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** How many numbers to show either side of the current one before collapsing. */
  siblings?: number;
  /** What is being paged, so the label reads "Orders pages" rather than "pagination". */
  label?: string;
}

/**
 * The page numbers to draw, with `null` where a gap belongs.
 *
 * Always the same width, so the control does not resize as you move through it - a row of
 * buttons that reflows under the pointer is how you click the wrong page.
 */
function pageItems(page: number, pageCount: number, siblings: number): (number | null)[] {
  // first + last + current + two gaps + siblings either side
  const slots = siblings * 2 + 5;
  if (pageCount <= slots) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, pageCount);
  const gapLeft = left > 2;
  const gapRight = right < pageCount - 1;

  if (!gapLeft) {
    const count = slots - 2;
    return [...Array.from({ length: count }, (_, i) => i + 1), null, pageCount];
  }
  if (!gapRight) {
    const count = slots - 2;
    return [1, null, ...Array.from({ length: count }, (_, i) => pageCount - count + 1 + i)];
  }
  return [
    1,
    null,
    ...Array.from({ length: right - left + 1 }, (_, i) => left + i),
    null,
    pageCount,
  ];
}

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ page, pageCount, onPageChange, siblings = 1, label = "Pages", className, ...props }, ref) => {
    if (pageCount <= 1) return null;
    const items = pageItems(page, pageCount, siblings);

    return (
      <nav ref={ref} aria-label={label} className={cn("flex items-center gap-1", className)} {...props}>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden />
        </Button>

        {items.map((item, index) =>
          item === null ? (
            // `key` on the index because a gap has no identity, and there are at most two.
            <span key={`gap-${index}`} aria-hidden className="px-1 text-text-faint">
              &hellip;
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "default" : "ghost"}
              size="icon-sm"
              // Both, and they say different things: the label names the page for anyone who
              // cannot see which button is filled, and aria-current says which one you are on.
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden />
        </Button>
      </nav>
    );
  },
);
Pagination.displayName = "Pagination";

export { Pagination, pageItems };
