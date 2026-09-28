#!/usr/bin/env node
// Finds text that was written UTF-8 and then re-encoded as if it had been Latin-1, which turns
// an em-dash into three characters beginning with a-circumflex, and a section sign into two.
// The mangled forms are not written out anywhere in this file, only built from escapes below, so
// that the checker cannot report itself.
//
//   node scripts/check-mojibake.mjs             — every known tree that is checked out
//   node scripts/check-mojibake.mjs <dir> ...    — only these
//
// It is a gate and not a one-off cleanup because the damage is invisible in review: the diff
// looks like a comment change, the file still compiles, and the mangled text is usually in prose
// nobody reads twice. It only becomes obvious on a rendered page or in a commit message.
//
// The patterns are the mojibake forms of the punctuation this codebase actually uses in comments
// and copy — em-dash, curly quotes, ellipsis, section sign, non-breaking space. Searching for the
// general shape instead (a C3/C2 byte followed by more high bytes) matches real UTF-8 text in
// several languages, so the list is explicit.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { sibling } from "./siblings.mjs";

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(pkg, "../../..");

// Same ownership table as check-literals.mjs, plus the trees that hold prose rather than code:
// docs and the app store, which is where mangled punctuation is most likely to reach a reader.
const TREES = [
  "web-kit/packages/brand/src", "web-kit/packages/brand/scripts", "web-kit/packages/ui/src",
  "oneOps/web/src", "Mailroom/web/src", "MobiStack/web/src", "Platform/marketing/src",
  "Mobile/packages/prabhix_ui/lib", "Mobile/packages/prabhix_theme/lib",
  "Mobile/apps/admin/lib", "Mobile/apps/mailroom/lib",
  "Mobile/apps/oneops/lib", "Mobile/apps/mobistack/lib",
  "Infra/docs", "Infra/deploy/app-store/www",
  "Identity/src/main/resources/templates", "Identity/src/main/resources/static/assets",
];

const EXT = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".dart", ".css", ".md", ".html", ".java", ".yml", ".yaml",
]);

// The mojibake form, and what it should have been. Written as escapes so this file stays ASCII
// and cannot itself be corrupted by a tool that guesses an encoding.
const BROKEN = [
  ["\u00e2\u20ac\u201d", "\u2014", "em dash"],
  ["\u00e2\u20ac\u201c", "\u2013", "en dash"],
  ["\u00e2\u20ac\u2122", "\u2019", "right single quote"],
  ["\u00e2\u20ac\u0153", "\u201c", "left double quote"],
  ["\u00e2\u20ac\u009d", "\u201d", "right double quote"],
  ["\u00e2\u20ac\u00a6", "\u2026", "ellipsis"],
  ["\u00c2\u00a7", "\u00a7", "section sign"],
  ["\u00c2\u00a0", "\u00a0", "non-breaking space"],
  ["\u00c3\u00a9", "\u00e9", "e acute"],
];

const requested = process.argv.slice(2);
const roots = requested.length ? requested : TREES.map((t) => sibling(repo, t)).filter(existsSync);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "dist" || name === "build") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.has(extname(name))) out.push(full);
  }
  return out;
}

const label = (root) => {
  const rel = relative(repo, root).split(sep).join("/");
  return rel && !rel.startsWith("..") ? rel : root;
};

let files = 0;
const findings = new Map();

for (const root of roots) {
  for (const file of walk(root)) {
    files += 1;
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const [bad, good, name] of BROKEN) {
        if (!line.includes(bad)) continue;
        const key = label(root);
        if (!findings.has(key)) findings.set(key, []);
        findings.get(key).push({
          file: relative(root, file).split(sep).join("/"),
          line: i + 1,
          name,
          good,
          text: line.trim().slice(0, 100),
        });
        break;
      }
    });
  }
}

if (findings.size > 0) {
  let total = 0;
  console.error("text was double-encoded — written as UTF-8, then read as Latin-1 and saved again:\n");
  for (const [root, items] of findings) {
    console.error(`  ${root}`);
    for (const f of items) {
      total += 1;
      console.error(`    ${f.file}:${f.line}  ${f.name} (should be "${f.good}")`);
      console.error(`      ${f.text}`);
    }
    console.error("");
  }
  console.error(`${total} occurrence(s). Fix the character, and save the file as UTF-8 without a BOM.`);
  process.exit(1);
}

console.log(`no double-encoded text in ${files} file(s) across ${roots.length} tree(s)`);

if (!requested.length) {
  const missing = TREES.filter((t) => !existsSync(sibling(repo, t)));
  if (missing.length) console.log(`not checked out (skipped): ${missing.join(", ")}`);
}
