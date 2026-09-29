import { createRequire } from "node:module";

/*
  The token file, loaded the way Node can load it.

  `import tokens from ".../tokens.json"` is what the gallery's own source does, and it works
  there because Vite resolves it. These files run under Playwright in plain Node ESM, where a
  JSON import needs `with { type: "json" }` - an attribute the TypeScript transform in front of
  them does not reliably preserve. `createRequire` sidesteps the question entirely.
*/
const require = createRequire(import.meta.url);
type DensityMode = { row: string; control: string; padX: string; padY: string; bodyRole: string };

const tokens = require("@prabhixtechnologies/brand/tokens.json") as {
  themes: Record<string, { density?: string; label?: string }>;
  scale: { density: { comfortable: DensityMode; compact: DensityMode } };
};

/** The brands, from the token source rather than a list that could drift from it. */
export const BRANDS = Object.keys(tokens.themes)
  .filter((name) => !name.startsWith("$"))
  .sort();

/** Each brand's own density, which two themes already ship as compact. */
export const DENSITY: Record<string, string> = Object.fromEntries(
  BRANDS.map((name) => [name, tokens.themes[name].density ?? "comfortable"]),
);

/**
 * The two density modes as authored, so the tests compare the browser against the source
 * rather than against a number typed twice. An earlier version hardcoded 32px and 40px, and
 * those went stale the moment the sizes were corrected.
 *
 * Named rather than passed through, because `scale.density` also holds the `$doc` string that
 * every block in this file carries, and iterating the raw object hands you a sixth "mode"
 * whose `control` is undefined. The type above does not save you: it describes what the file
 * is meant to contain, and `$doc` is outside it.
 */
export const DENSITY_SCALE: Record<"comfortable" | "compact", DensityMode> = {
  comfortable: tokens.scale.density.comfortable,
  compact: tokens.scale.density.compact,
};

/** A `44px` token as the number 44, for comparing against a measured box. */
export function px(value: string): number {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) throw new Error(`density token "${value}" is not a pixel length`);
  return n;
}
