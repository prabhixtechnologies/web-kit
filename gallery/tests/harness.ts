import { type Page, expect } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export { BRANDS, DENSITY } from "./tokens";

export const MODES = ["light", "dark"] as const;

export interface View {
  brand: string;
  mode?: (typeof MODES)[number];
  density?: "comfortable" | "compact";
}

export function url({ brand, mode = "light", density = "comfortable" }: View) {
  return `/?brand=${brand}&mode=${mode}&density=${density}`;
}

/**
 * Opens a view and waits until it has stopped moving.
 *
 * `data-gallery-ready` is set after `document.fonts.ready`, which is the part `load` does not
 * cover: a shot taken between load and font resolution is laid out with fallback metrics, and
 * differs from every shot taken after it by a few pixels everywhere there is text.
 */
export async function open(page: Page, view: View) {
  await page.goto(url(view));
  await page.waitForSelector("html[data-gallery-ready='true']", { timeout: 30_000 });
  // The mode has to be what was asked for, not what the CSS fell through to. A light view that
  // rendered dark would otherwise be compared happily against another light view.
  const theme = await page.getAttribute("html", "data-theme");
  expect(theme, `mode=${view.mode ?? "light"} did not apply`).toBe(
    view.mode === "dark" ? "dark" : null,
  );
}

/** Full page, at a fixed width. */
export async function shoot(page: Page, view: View) {
  await open(page, view);
  return page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
}

/**
 * One `data-shot` block.
 *
 * Brand comparisons use this rather than the whole page, and the reason is worth keeping: a
 * full-page diff divides the changed pixels by the area of a very tall page that is mostly
 * text on a neutral surface. Indigo against violet scored 0.04% that way and looked like two
 * brands not being applied, when in fact both were - the signal was simply diluted by four
 * thousand pixels of prose. Measuring where the accent actually is makes the same difference
 * read as 20%.
 */
export async function shootSection(page: Page, view: View, shot: string) {
  await open(page, view);
  const section = page.locator(`[data-shot="${shot}"]`);
  await expect(section).toBeVisible();
  return section.screenshot({ animations: "disabled", caret: "hide" });
}

/** The blocks where the product accent covers enough area to be measured. */
export const ACCENT_DENSE = ["button-variants", "badges", "alert-tones"] as const;

/**
 * The share of pixels that differ between two shots, 0 to 1.
 *
 * `threshold` is pixelmatch's perceptual tolerance, and the choice of it is the whole subtlety
 * of this file.
 *
 * At the default 0.1 it asks "would a person notice this pixel changed", which is right for
 * comparing a page against its own past self, where the noise is anti-aliasing. It is wrong for
 * comparing two brands: indigo and violet are adjacent hues of similar lightness, they fall
 * inside 0.1, and the OneOps/Admin pair scored 0.5% and read as two brands not being applied.
 *
 * `exact` counts any pixel that is not byte-identical. That is sound here because both shots
 * come from the same deterministic renderer at the same geometry, so every pixel the brand does
 * not touch matches exactly - which makes the result a clean measure of how much of the page
 * the palette actually reaches.
 */
export function difference(a: Buffer, b: Buffer, threshold = 0.1): number {
  const left = PNG.sync.read(a);
  const right = PNG.sync.read(b);
  if (left.width !== right.width || left.height !== right.height) {
    // Different geometry is a difference, and the largest kind. Density changes do this.
    return 1;
  }
  // No output buffer: the count is the answer, and allocating a diff image for nineteen
  // comparisons of a full page is megabytes of nothing.
  const changed = pixelmatch(
    left.data,
    right.data,
    undefined,
    left.width,
    left.height,
    { threshold },
  );
  return changed / (left.width * left.height);
}

/** Any pixel that is not byte-identical. See the note on `difference`. */
export function exactDifference(a: Buffer, b: Buffer): number {
  return difference(a, b, 0);
}
