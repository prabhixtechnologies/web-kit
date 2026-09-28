#!/usr/bin/env node
// One-off repair for text that was double-encoded. Run, verify, then let check-mojibake.mjs keep
// it from coming back.
//
//   node scripts/fix-mojibake.mjs --dry     list what would change
//   node scripts/fix-mojibake.mjs           write the files
//
// It does not use a lookup table of mangled forms, because some of this text was mangled twice
// and a table would need an entry per depth. Instead it reverses the operation that caused the
// damage: the bytes of a UTF-8 string were read as if each byte were one Latin-1 character. Doing
// that backwards — take the characters, treat each as one byte, decode those bytes as UTF-8 — is
// exact, and repeating it unwinds however many layers there are.
//
// The reversal is applied only to runs of non-ASCII characters, never to a whole file, and only
// when the result is itself valid and strictly simpler. A run that is already correct text
// survives untouched, because decoding a real em-dash's characters as bytes does not produce
// valid UTF-8 and the attempt is discarded.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const dry = process.argv.includes("--dry");

const TREES = [
  "web-kit/packages/ui/src", "web-kit/packages/brand/src",
  "oneOps/web/src", "Mailroom/web/src", "MobiStack/web/src", "Platform/marketing/src",
  "Mobile/apps", "Mobile/packages", "Infra/docs", "Infra/deploy/app-store/www",
  "Identity/src/main/resources",
];

const EXT = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".dart", ".css", ".md", ".html", ".java", ".yml", ".yaml",
]);

/** Runs of adjacent non-ASCII characters, which is the only place the damage can be. */
const RUN = /[^\x00-\x7F]+/g;

/**
 * The sixteen bytes Windows-1252 maps somewhere other than the matching C1 control.
 *
 * This is the whole reason a Latin-1 reversal is not enough. The mangling was done by a
 * Windows-1252 decoder, and in that code page 0x94 is a right curly quote at U+201D, not the
 * control at U+0094. An em-dash is the bytes E2 80 94, so its mangled form ends in a character
 * whose code point is 0x201D — far above the 0xFF that a byte-for-character reversal can accept,
 * which is why the first version of this script found four occurrences out of twenty-three.
 *
 * Bytes Windows-1252 leaves undefined (0x81, 0x8D, 0x8F, 0x90, 0x9D) are absent here on purpose:
 * decoders differ on them, and the ones in this codebase passed them through as C1 controls, so
 * they are handled by the code-point fallback below.
 */
const CP1252 = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

const BYTE_TO_CHAR = new Map([...CP1252].map(([ch, byte]) => [byte, ch]));

/** The characters of a run as the bytes a Windows-1252 decoder would have read them from. */
function toBytes(run) {
  const bytes = [];
  for (const ch of run) {
    const cp = ch.codePointAt(0);
    const mapped = CP1252.get(cp);
    if (mapped !== undefined) bytes.push(mapped);
    else if (cp <= 0xff) bytes.push(cp);
    else return null;
  }
  return Buffer.from(bytes);
}

/** The inverse, used only to prove the reversal was exact before accepting it. */
function fromBytes(buf) {
  let out = "";
  for (const byte of buf) {
    out += byte >= 0x80 && BYTE_TO_CHAR.has(byte)
      ? String.fromCodePoint(BYTE_TO_CHAR.get(byte))
      : String.fromCharCode(byte);
  }
  return out;
}

/**
 * One layer of the damage undone, or null if this run was not damaged.
 *
 * The round-trip check is what makes it safe to try on text that is already correct: re-encoding
 * the result has to reproduce the input exactly, and for undamaged text it does not.
 */
function unwindOnce(run) {
  const bytes = toBytes(run);
  if (bytes === null) return null;
  const decoded = bytes.toString("utf8");
  if (decoded.includes("\uFFFD")) return null;
  if (fromBytes(Buffer.from(decoded, "utf8")) !== run) return null;
  return decoded === run ? null : decoded;
}

function unwind(run) {
  let current = run;
  for (let i = 0; i < 4; i += 1) {
    const next = unwindOnce(current);
    if (next === null) break;
    current = next;
  }
  return current;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".git", "dist", "build", ".next", "coverage"].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.has(extname(name))) out.push(full);
  }
  return out;
}

let changedFiles = 0;
let changedRuns = 0;

for (const tree of TREES) {
  const root = join(repo, tree);
  try {
    statSync(root);
  } catch {
    continue;
  }
  for (const file of walk(root)) {
    const text = readFileSync(file, "utf8");
    if (!/[^\x00-\x7F]/.test(text)) continue;
    const swaps = [];
    const fixed = text.replace(RUN, (run) => {
      const out = unwind(run);
      if (out !== run) swaps.push([run, out]);
      return out;
    });
    if (fixed === text) continue;
    changedFiles += 1;
    changedRuns += swaps.length;
    console.log(`${relative(repo, file).split(sep).join("/")}  (${swaps.length})`);
    for (const [from, to] of swaps.slice(0, 6)) {
      console.log(`    ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
    }
    if (swaps.length > 6) console.log(`    ... and ${swaps.length - 6} more`);
    if (!dry) writeFileSync(file, fixed, "utf8");
  }
}

console.log(
  `\n${dry ? "would change" : "changed"} ${changedRuns} run(s) in ${changedFiles} file(s)`,
);
