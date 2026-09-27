#!/usr/bin/env node
// Renders every product theme in both modes to one reviewable sheet: semantic
// roles, the brand gradient built from each theme's accent pair, and the
// user-assignable tag swatches.
// Run after build-tokens.mjs. Output: Infra/design/palette-sheet.{svg,png}

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");
const repo = resolve(pkg, "../../..");
const T = JSON.parse(readFileSync(join(pkg, "tokens.json"), "utf8"));

const ROLES = [
  "bg", "surface", "surface-sunken", "ink", "ink-muted", "border-strong",
  "accent", "accent-subtle", "accent-2", "accent-2-subtle",
  "success", "warning", "danger", "info",
];

const resolve_ = (ref, theme) => {
  const filled = ref
    .replace("{accent2}", theme.accent2)
    .replace("{accent}", theme.accent)
    .replace("{neutral}", theme.neutral);
  const [group, step] = filled.split(".");
  return group === "base" ? T.base[step] : T.primitive[group][step];
};
const role = (name, theme, mode) => resolve_(T.semantic[mode][name], theme);

const themeNames = Object.keys(T.themes).filter((k) => !k.startsWith("$"));
const tagRamps = T.palette.tag.ramps;

const SW = 96, SH = 56, PAD = 30, GAP = 4, GRAD_H = 22;
const W = PAD * 2 + ROLES.length * SW;
const TSW = Math.floor((W - PAD * 2) / tagRamps.length);

const parts = [], defs = [];
let y = PAD;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, yy, s, o = {}) => {
  const { size = 10, fill = "#56687e", weight = 400, anchor = "start", mono = false } = o;
  parts.push(
    `<text x="${x}" y="${yy}" font-family="${mono ? "ui-monospace, Menlo, monospace" : "Segoe UI, system-ui, sans-serif"}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`,
  );
};

function pickInk(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? "rgba(12,21,36,0.75)" : "rgba(255,255,255,0.85)";
}

text(PAD, y + 18, "Prabhix design tokens — five product identities", { size: 22, fill: "#0c1524", weight: 700 });
text(PAD, y + 38, "Generated from tokens.json. Every product carries two accents, so each theme composes its own gradient. Status hues are reserved and never used as an accent.", { size: 11 });
y += 60;

ROLES.forEach((r, i) => text(PAD + i * SW, y, r, { size: 9, fill: "#71859d", weight: 600 }));
y += 10;

for (const name of themeNames) {
  const th = T.themes[name];
  text(PAD, y + 12, th.label, { size: 14, fill: "#0c1524", weight: 700 });
  text(PAD + 190, y + 12, `${th.accent} + ${th.accent2}  ·  ${th.neutral} surface  ·  ${th.density}`, { size: 10 });
  y += 22;

  for (const mode of ["light", "dark"]) {
    const inkOn = mode === "light" ? "#0c1524" : "#f6f8fb";
    text(PAD - 8, y + SH / 2 + 3, mode === "light" ? "L" : "D", { size: 9, fill: "#9aabc0", anchor: "end", weight: 700 });

    ROLES.forEach((r, i) => {
      const x = PAD + i * SW;
      const hex = role(r, th, mode);
      parts.push(`<rect x="${x}" y="${y}" width="${SW - GAP}" height="${SH}" rx="6" fill="${hex}" stroke="${mode === "light" ? "#dfe6ef" : "#2c3a49"}" stroke-width="1"/>`);

      // Show the ink each fill is paired with — that pairing is what the build asserts.
      const pairs = {
        accent: "accent-ink", "accent-subtle": "accent-subtle-ink",
        "accent-2": "accent-2-ink", "accent-2-subtle": "accent-2-subtle-ink",
        success: "success-ink", warning: "warning-ink", danger: "danger-ink", info: "info-ink",
      };
      if (pairs[r]) text(x + 9, y + 22, "Aa", { size: 13, fill: role(pairs[r], th, mode), weight: 700 });
      else if (["bg", "surface", "surface-sunken"].includes(r)) text(x + 9, y + 22, "Aa", { size: 13, fill: inkOn, weight: 600 });

      text(x + 9, y + SH - 8, hex, { size: 8.5, fill: pickInk(hex), mono: true });
    });
    y += SH + GAP;

    // the theme's own gradient, from its accent pair
    const gid = `g-${name}-${mode}`;
    defs.push(
      `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${role("accent", th, mode)}"/><stop offset="1" stop-color="${role("accent-2", th, mode)}"/></linearGradient>`,
    );
    parts.push(`<rect x="${PAD}" y="${y}" width="${ROLES.length * SW - GAP}" height="${GRAD_H}" rx="5" fill="url(#${gid})"/>`);
    text(PAD + 9, y + 15, `gradient-brand  ·  ${th.accent} → ${th.accent2}`, { size: 9, fill: pickInk(role("accent", th, mode)), weight: 600 });
    y += GRAD_H + GAP;
  }
  y += 14;
}

// categorical
text(PAD, y + 12, "Categorical — charts, grouped series, generated avatars", { size: 14, fill: "#0c1524", weight: 700 });
y += 22;
for (const mode of ["light", "dark"]) {
  text(PAD - 8, y + SH / 2 + 3, mode === "light" ? "L" : "D", { size: 9, fill: "#9aabc0", anchor: "end", weight: 700 });
  T.palette.categorical[mode].forEach((hex, i) => {
    const x = PAD + i * SW;
    parts.push(`<rect x="${x}" y="${y}" width="${SW - GAP}" height="${SH}" rx="6" fill="${hex}"/>`);
    text(x + 9, y + 22, `${i + 1}`, { size: 13, fill: pickInk(hex), weight: 700 });
    text(x + 9, y + SH - 8, hex, { size: 8.5, fill: pickInk(hex), mono: true });
  });
  y += SH + GAP;
}
y += 14;

// tags
text(PAD, y + 12, `Tag swatches — ${tagRamps.length} user-assignable colours, each derived so its ink clears AA in both themes`, { size: 14, fill: "#0c1524", weight: 700 });
y += 22;
const swatches = { light: [], dark: [] };
for (const mode of ["light", "dark"]) {
  const d = T.palette.tag.derive[mode];
  for (const n of tagRamps) swatches[mode].push({ name: n, bg: T.primitive[n][d.bg], ink: T.primitive[n][d.ink] });
}
for (const mode of ["light", "dark"]) {
  text(PAD - 8, y + 26, mode === "light" ? "L" : "D", { size: 9, fill: "#9aabc0", anchor: "end", weight: 700 });
  swatches[mode].forEach((s, i) => {
    const x = PAD + i * TSW;
    parts.push(`<rect x="${x}" y="${y}" width="${TSW - GAP}" height="44" rx="${44 / 2}" fill="${s.bg}"/>`);
    text(x + TSW / 2 - 2, y + 27, s.name, { size: 9.5, fill: s.ink, weight: 700, anchor: "middle" });
  });
  y += 48;
}
y += PAD;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}" viewBox="0 0 ${W} ${y}">
<defs>${defs.join("")}</defs>
<rect width="${W}" height="${y}" fill="#ffffff"/>
${parts.join("\n")}
</svg>`;

writeFileSync(join(repo, "Infra/design/palette-sheet.svg"), svg, "utf8");
console.log("wrote ./Infra/design/palette-sheet.svg");

const require = createRequire(join(repo, "Infra/design/brand/package.json"));
try {
  const { Resvg } = require("@resvg/resvg-js");
  const png = new Resvg(svg, { fitTo: { mode: "width", value: Math.round(W * 1.6) } }).render().asPng();
  writeFileSync(join(repo, "Infra/design/palette-sheet.png"), png);
  console.log(`wrote ./Infra/design/palette-sheet.png (${(png.length / 1024).toFixed(0)} KB)`);
} catch (e) {
  console.log(`svg only — rasterize skipped (${e.message})`);
}
