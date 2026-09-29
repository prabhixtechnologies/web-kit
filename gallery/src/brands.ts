import tokens from "@prabhixtechnologies/brand/tokens.json";

/**
 * The brands, read from the token source rather than listed here.
 *
 * A hardcoded list would be a second place to add a theme, and the gallery would keep passing
 * while silently not photographing the new one - which is the failure this whole directory
 * exists to catch. `$doc` is the schema note, not a theme; `build-tokens.mjs` drops it the
 * same way.
 */
export const BRANDS = Object.keys((tokens as { themes: Record<string, unknown> }).themes)
  .filter((name) => !name.startsWith("$"))
  .sort();

export const LABELS: Record<string, string> = Object.fromEntries(
  BRANDS.map((name) => [
    name,
    ((tokens as { themes: Record<string, { label?: string }> }).themes[name].label ?? name),
  ]),
);

export type Mode = "light" | "dark";
export type Density = "comfortable" | "compact";

/**
 * Applies a brand to the document.
 *
 * Light mode sets no `data-theme` at all, because that is the only thing the generated CSS
 * understands - there is no `[data-theme="light"]` selector. It falls through to
 * `:root:not([data-theme])`, which also carries the `prefers-color-scheme: dark` block, so a
 * browser that prefers dark renders the light gallery dark. Playwright pins `colorScheme` to
 * light for exactly this reason; anything else driving this page has to do the same.
 */
export function apply(brand: string, mode: Mode, density: Density) {
  const root = document.documentElement;
  root.setAttribute("data-brand", brand);
  if (mode === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  if (density === "compact") root.setAttribute("data-density", "compact");
  else root.removeAttribute("data-density");
}
