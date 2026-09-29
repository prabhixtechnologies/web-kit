/**
 * Prabhix brand assets.
 *
 * Tokens: `import "@prabhixtechnologies/brand/prabhix-tokens.css"`
 * Marks: `import markUrl from "@prabhixtechnologies/brand/marks/prabhix-mark.svg"`
 *
 * Design source remains `Infra/design`. This package is a copy for product webs.
 */

export const TOKEN_STYLESHEET = "prabhix-tokens.css";

/** The tag swatch list and the seed-to-swatch rule. Generated from tokens.json. */
export { TAG_SWATCHES, TAG_TONES, toneFor, type TagTone } from "./tags";

function markUrl(file: string): string {
  return new URL(`../marks/${file}`, import.meta.url).href;
}

export const marks = {
  favicon: markUrl("favicon.svg"),
  prabhixMark: markUrl("prabhix-mark.svg"),
  prabhixMarkOnPaper: markUrl("prabhix-mark-on-paper.svg"),
  prabhixLockup: markUrl("prabhix-lockup.svg"),
  prabhixTechnologiesMark: markUrl("prabhix-technologies-mark.svg"),
  prabhixTechnologiesLockup: markUrl("prabhix-technologies-lockup.svg"),
  mobistackMark: markUrl("mobistack-mark.svg"),
  mobistackMarkAdaptive: markUrl("mobistack-mark-adaptive.svg"),
  mobistackLockup: markUrl("mobistack-lockup.svg"),
} as const;
