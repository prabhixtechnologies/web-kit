#!/usr/bin/env node
// Fails when a component file hard-codes a colour instead of using a token.
//
//   node scripts/check-literals.mjs              — every known tree that is checked out
//   node scripts/check-literals.mjs <dir> ...    — only these
//
// Run from web-kit. Every repository that renders UI clones web-kit in CI already, so this needs
// no per-repo copy and there is one implementation to change.
//
// Why a script and not an ESLint rule: three of the four web apps have no ESLint at all, and
// standing one up in each — config, plugin set, and the existing violations — is a larger job
// than the rule is worth. This is the rule, it runs anywhere Node runs, and it can be pointed
// at Dart as easily as TSX.
//
// A literal is allowed only where a CSS custom property cannot reach, and only when the line
// says so. Put `px-allow-literal: <reason>` in a comment on the line or the line above. The
// reason is not parsed; it is there so the next person reads an argument rather than a
// suppression, and so a review can disagree with it.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { sibling } from "./siblings.mjs";

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(pkg, "../../..");

// Every tree in the portfolio that renders UI. Called with no arguments, this scans all of them
// that are checked out — the same ownership-table approach as build-tokens.mjs, and for the same
// reason: CI clones one repository at a time, so the workflow in each can run one identical
// command and have it cover whatever is actually present.
const TREES = [
  "web-kit/packages/brand/src",
  "web-kit/packages/ui/src",
  "oneOps/web/src",
  "Mailroom/web/src",
  "MobiStack/web/src",
  "Platform/marketing/src",
  "Mobile/packages/prabhix_ui/lib",
  "Mobile/packages/prabhix_theme/lib",
  "Mobile/apps/admin/lib",
  "Mobile/apps/mailroom/lib",
  "Mobile/apps/oneops/lib",
  "Mobile/apps/mobistack/lib",
  // Not built by a bundler and not written in React, which is exactly why they need checking:
  // hand-written CSS served straight to a browser is where a stale hex survives longest. Both
  // are real public surfaces — the hosted sign-in pages, and store.prabhixtechnologies.com.
  "Identity/src/main/resources/static/assets",
  "Identity/src/main/resources/templates",
  "Infra/deploy/app-store/www",
];

const requested = process.argv.slice(2);
const roots = requested.length ? requested : TREES.map((t) => sibling(repo, t)).filter(existsSync);

if (!roots.length) {
  console.error("nothing to scan: no known source tree is checked out beside web-kit");
  process.exit(2);
}

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".dart", ".css", ".html"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", "coverage", ".git", "generated"]);
const ALLOW = "px-allow-literal";

// #abc, #aabbcc, #aabbccdd, rgb(1..., rgba(1..., and Dart's Color(0xFF...).
const PATTERN = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b|\brgba?\(\s*\d|\bColor\(\s*0x/;

/**
 * The second way a colour gets hard-coded, which the hex rule cannot see.
 *
 * `bg-slate-500` contains no hex and passes everything above, but it pins a component to
 * Tailwind's stock grey no matter which of the five themes is on. That is the exact failure the
 * whole token effort was about: the portfolio looked like one grey product because components
 * reached for the default palette instead of the ramps.
 *
 * Most of Tailwind's palette names are also names in this system — `blue`, `red`, `teal` and ten
 * others are declared ramps, and `bg-blue-500` is a legitimate token class. So the list of what
 * to reject is derived from the generated preset rather than written here: a stock name is a
 * violation only when this system does not declare a ramp by that name. Add a ramp and it stops
 * being reported, remove one and it starts, with no second list to remember.
 *
 * `white` and `black` are always reported. They are not ramps in any theme and never become
 * them, and they are what a component reaches for when it wants "the light one" — which is
 * wrong the moment the page is dark.
 */
const TAILWIND_PALETTE = [
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime",
  "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia",
  "pink", "rose",
];

/**
 * The third way, and the one that leaves no mark at all.
 *
 * shadcn/ui ships a token vocabulary — `muted`, `card`, `background`, `secondary` — and every
 * component copied from its docs, and every developer who has used it before, reaches for those
 * names. This system renamed them: `surface-muted`, `surface-raised`, `bg`, and so on.
 *
 * An undeclared colour name in Tailwind 4 does not error and does not fall back. The utility is
 * simply never generated, so `bg-muted` paints nothing whatsoever. That is worse than a wrong
 * colour, because a wrong colour is visible: this renders a chip with no background, on a page
 * where every other chip has one, and reads as a design choice. Twenty-four of these were live
 * across three apps when the rule was written, and nobody had filed a bug about any of them.
 *
 * Like the palette list, derived rather than written down: a shadcn name is only reported when
 * this system does not declare it. Declare `--color-card` tomorrow and `bg-card` stops being a
 * violation, with nothing here to update.
 */
const SHADCN_NAMES = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "secondary", "secondary-foreground", "muted", "muted-foreground", "accent-foreground",
  "input",
];

/** Utilities that take a colour. Deliberately not every one — these are the ones in use. */
const COLOUR_UTILITIES =
  "bg|text|border|ring|fill|stroke|from|to|via|decoration|outline|shadow|accent|caret|divide|placeholder";

/** Every `--color-*` name a given CSS text declares. */
const colourNames = (css) => [...css.matchAll(/^\s*--color-([a-z0-9-]+)\s*:/gm)].map((m) => m[1]);

/**
 * The names available to one tree: the shared presets, plus whatever that tree declares itself.
 *
 * Per tree rather than once, because the apps legitimately differ. The marketing site declares
 * `--color-background` and `--color-muted` in its own `globals.css`, so `bg-background` resolves
 * there and is not a violation; OneOps declares neither, so the same class in OneOps paints
 * nothing. A single global list would have to either accuse the marketing site of a bug it does
 * not have, or excuse OneOps of one it does.
 */
function paletteRule(root) {
  const preset = join(pkg, "tailwind-preset.css");
  if (!existsSync(preset)) return null;
  // The ramps live in the generated preset and the shadcn-shaped aliases that map onto them
  // live in @prabhix/ui. A name declared in either one resolves everywhere.
  const shared = [preset, resolve(pkg, "../ui/src/preset.css")].filter(existsSync);
  const declared = new Set(shared.flatMap((f) => colourNames(readFileSync(f, "utf8"))));
  for (const file of walk(root)) {
    if (extname(file) === ".css") for (const name of colourNames(readFileSync(file, "utf8"))) declared.add(name);
  }

  const banned = [
    "white",
    "black",
    // A ramp is declared as its steps — `--color-red-500`, not `--color-red` — so the 500 is
    // what proves the ramp exists. Checking the bare name instead banned `red`, which is one of
    // this system's own ramps, and reported nine legitimate uses of it on the marketing site.
    ...TAILWIND_PALETTE.filter((name) => !declared.has(`${name}-500`)),
    ...SHADCN_NAMES.filter((name) => !declared.has(name)),
  ];
  // Longest first, so `muted-foreground` is not matched as `muted` and reported by half its name.
  banned.sort((a, b) => b.length - a.length);

  return {
    declared,
    banned,
    // The lookarounds keep `text-red-ink` and `bg-surface-raised` out of it: a match has to end
    // at the class boundary, not in the middle of a longer token name.
    pattern: new RegExp(
      `(?<![\\w-])(?:${COLOUR_UTILITIES})-(?:${banned.join("|")})(?:-\\d{2,3})?(?:\\/\\d{1,3})?(?![\\w-])`,
      "g",
    ),
  };
}


/** Generated files are the source of the tokens, not a violation of them. */
const isGenerated = (text) => text.slice(0, 400).includes("GENERATED by");

/**
 * A whole-line comment, which cannot put a colour on screen.
 *
 * Prose explaining why a swatch was wrong needs to be able to name the hex it replaced, and a
 * commented-out line is not rendered. A literal in a trailing comment after real code is still
 * reported, because that is usually a value someone is about to paste back in.
 *
 * `{/*` is how a comment is written inside JSX and `<!--` inside an HTML string. Both are here
 * because the files most likely to need the escape hatch are exactly those: server-rendered
 * images built from JSX, and HTML documents assembled as strings for a WebView. In both, the
 * host language's comment syntax cannot reach the line that holds the colour.
 */
const isComment = (line) => /^\s*(\{\s*\/\*|<!--|\/\/|\/\*|\*|#)/.test(line);

/**
 * Which lines sit inside a block comment, including the ones that do not begin with a marker.
 *
 * `isComment` reads one line and so only sees a block whose every line is decorated with a
 * leading `*`. A JSX comment written as prose is not:
 *
 *     {\/*
 *       The thumb was `bg-white`, which disappeared when the switch was off.
 *     *\/}
 *
 * The middle line starts with a capital letter, and the first version of this reported it —
 * telling the author to fix a colour that the same comment says was already fixed. A checker
 * that cries wolf about its own documentation teaches people to skip its output.
 *
 * Deliberately not a parser. It tracks the two block forms that appear in these files and does
 * not know about a `/*` inside a string literal. The failure mode of getting that wrong is a
 * missed violation, not a false one, which is the right way round for a rule people have to
 * trust before they will read it.
 */
function blockCommentLines(lines) {
  const inside = new Set();
  let open = null;
  lines.forEach((line, i) => {
    let rest = line;
    let consumed = 0;
    while (rest) {
      if (open) {
        const end = rest.indexOf(open);
        inside.add(i);
        if (end === -1) return;
        rest = rest.slice(end + open.length);
        consumed = 1;
        open = null;
        continue;
      }
      const js = rest.indexOf("/*");
      const html = rest.indexOf("<!--");
      const next = js === -1 ? html : html === -1 ? js : Math.min(js, html);
      if (next === -1) return;
      // Text before the opener is real code, so a trailing `/*` does not excuse the whole line.
      if (next > 0 || consumed) {
        const before = rest.slice(0, next);
        if (before.trim() && !inside.has(i)) {
          open = next === js ? "*/" : "-->";
          const end = rest.indexOf(open, next);
          if (end === -1) return;
          rest = rest.slice(end + open.length);
          consumed = 1;
          continue;
        }
      }
      inside.add(i);
      open = next === js ? "*/" : "-->";
      const end = rest.indexOf(open, next);
      if (end === -1) return;
      rest = rest.slice(end + open.length);
      consumed = 1;
      open = null;
    }
  });
  return inside;
}

/**
 * Whether the line carries the escape hatch, on itself or in the comment block above it.
 *
 * The whole attached block counts, not just the line directly above, because a reason worth
 * writing rarely fits on one line — and a rule that only reads one line quietly pushes people
 * towards a terse "allowed" instead of an argument.
 */
function isAllowed(lines, index, commented) {
  if (lines[index].includes(ALLOW)) return true;
  // `commented` as well as `isComment`, because a reason long enough to be worth reading wraps,
  // and the second line of a `/* ... */` does not begin with a marker. Without it the walk
  // stopped at the wrap and the escape hatch silently did nothing — which is how the app-store
  // mask ended up reported despite carrying a written, correct justification directly above it.
  for (let i = index - 1; i >= 0 && (isComment(lines[i]) || commented.has(i)); i -= 1) {
    if (lines[i].includes(ALLOW)) return true;
  }
  return false;
}

/** A tree named the way a person would say it, rather than as an absolute path. */
const label = (root) => {
  const rel = relative(repo, root).split(sep).join("/");
  return rel && !rel.startsWith("..") ? rel : root;
};

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(name))) yield path;
  }
}

const findings = [];
let scanned = 0;

for (const root of roots) {
  const palette = paletteRule(root);
  for (const path of walk(root)) {
    const text = readFileSync(path, "utf8");
    if (isGenerated(text)) continue;
    scanned += 1;
    const lines = text.split(/\r?\n/);
    const commented = blockCommentLines(lines);
    const stylable = palette && extname(path) !== ".dart";
    lines.forEach((line, i) => {
      const hex = PATTERN.test(line);
      // `lastIndex` survives a global regex between calls, so it is reset rather than shared.
      const classes = stylable ? ((palette.pattern.lastIndex = 0), palette.pattern.exec(line)) : null;
      if (!hex && !classes) return;
      if (isComment(line) || commented.has(i)) return;
      if (isAllowed(lines, i, commented)) return;
      findings.push({
        root,
        path: relative(root, path).split(sep).join("/"),
        line: i + 1,
        text: line.trim(),
        what: hex ? "literal" : `stock Tailwind class \`${classes[0]}\``,
      });
    });
  }
}

if (findings.length) {
  console.error(`\n${findings.length} hard-coded colour(s) in ${scanned} scanned file(s):\n`);
  // Grouped by the directory it was given, because file paths are printed relative to their own
  // root and a run that scans several trees would otherwise report two different files as the
  // same `lib/theme.tsx`.
  for (const root of roots) {
    const mine = findings.filter((f) => f.root === root);
    if (!mine.length) continue;
    console.error(`  ${label(root)}`);
    for (const f of mine) console.error(`    ${f.path}:${f.line}  (${f.what})\n        ${f.text}`);
  }
  console.error(
    `\nUse a token: var(--px-*) in CSS, the Tailwind preset's classes, or PxTokens in Dart.` +
      `\nIf the value genuinely cannot be a custom property — a theme-color meta tag, a` +
      `\nserver-rendered OG image, a third-party SDK that takes a hex string — add a comment` +
      `\nsaying "${ALLOW}: <reason>" on that line or the one above it.`,
  );
  process.exit(1);
}

console.log(`no hard-coded colours in ${scanned} file(s) across ${roots.length} tree(s):`);
for (const root of roots) console.log(`  ${label(root)}`);

// Absent siblings are named rather than passed over in silence, so a run that covered three
// trees does not read like a run that covered all twelve.
if (!requested.length) {
  const missing = TREES.filter((t) => !existsSync(sibling(repo, t)));
  if (missing.length) console.log(`not checked out (skipped): ${missing.join(", ")}`);
}
