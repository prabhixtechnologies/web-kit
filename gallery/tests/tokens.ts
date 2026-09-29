import { createRequire } from "node:module";

/*
  The token file, loaded the way Node can load it.

  `import tokens from ".../tokens.json"` is what the gallery's own source does, and it works
  there because Vite resolves it. These files run under Playwright in plain Node ESM, where a
  JSON import needs `with { type: "json" }` - an attribute the TypeScript transform in front of
  them does not reliably preserve. `createRequire` sidesteps the question entirely.
*/
const require = createRequire(import.meta.url);
const tokens = require("@prabhixtechnologies/brand/tokens.json") as {
  themes: Record<string, { density?: string; label?: string }>;
};

/** The brands, from the token source rather than a list that could drift from it. */
export const BRANDS = Object.keys(tokens.themes)
  .filter((name) => !name.startsWith("$"))
  .sort();

/** Each brand's own density, which two themes already ship as compact. */
export const DENSITY: Record<string, string> = Object.fromEntries(
  BRANDS.map((name) => [name, tokens.themes[name].density ?? "comfortable"]),
);
