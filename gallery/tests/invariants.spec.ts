import { expect, test } from "@playwright/test";
import {
  ACCENT_DENSE,
  BRANDS,
  difference,
  exactDifference,
  open,
  shoot,
  shootSection,
} from "./harness";

/*
  The tests this directory exists for.

  A single-colour bug once shipped to every product: `--color-accent: var(--px-accent)` was
  declared in a plain `@theme`, which emits it on `:root`. Custom properties are substituted at
  computed-value time on the element that declares them, so the alias resolved once at the root
  and every descendant inherited a finished colour - which made `data-brand` below the root a
  no-op. Five brands, one palette.

  It passed a typecheck, seventy-three unit tests and six gates, because not one of them
  rendered a pixel. The token contrast gate was satisfied: the tokens themselves were correct,
  and the bug was in how they were aliased.

  What would have caught it is here, and it needs no stored baseline: if two brands produce the
  same picture, one of them is not being applied. Both shots come from the same run on the same
  machine, so fonts, platform and rasteriser cancel out.
*/

// Every brand against every other, once. Five brands is ten pairs.
const PAIRS = BRANDS.flatMap((a, i) => BRANDS.slice(i + 1).map((b) => [a, b] as const));

test.describe("the brands are actually distinct", () => {
  for (const [a, b] of PAIRS) {
    test(`${a} does not render like ${b}`, async ({ page }) => {
      // The best of the accent-dense blocks, not their average. Two themes can legitimately
      // share a tag ramp or a neutral, so requiring every block to differ would assert a
      // stricter rule than the tokens actually promise. One clear repaint is the claim.
      const ratios: Record<string, number> = {};
      for (const shot of ACCENT_DENSE) {
        const left = await shootSection(page, { brand: a }, shot);
        const right = await shootSection(page, { brand: b }, shot);
        ratios[shot] = exactDifference(left, right);
      }

      const best = Math.max(...Object.values(ratios));
      const detail = Object.entries(ratios)
        .map(([shot, ratio]) => `${shot} ${(ratio * 100).toFixed(1)}%`)
        .join(", ");

      expect(
        best,
        `${a} and ${b} differ by at most ${(best * 100).toFixed(2)}% (${detail}). Two brands ` +
          `rendering alike means data-brand is not reaching the utilities - check that every ` +
          `--color-* alias is in an "@theme inline" and not a plain "@theme".`,
      ).toBeGreaterThan(0.02);
    });
  }
});

test.describe("dark mode is applied", () => {
  for (const brand of BRANDS) {
    test(`${brand} renders differently in dark`, async ({ page }) => {
      const light = await shoot(page, { brand, mode: "light" });
      const dark = await shoot(page, { brand, mode: "dark" });

      const ratio = difference(light, dark);
      // Dark mode repaints every surface, so this is a much larger change than a brand swap.
      expect(
        ratio,
        `${brand} light and dark differ in ${(ratio * 100).toFixed(2)}% of pixels.`,
      ).toBeGreaterThan(0.2);
    });
  }
});

/*
  The same claim as the pairwise shots, made precisely rather than statistically.

  The screenshot tests say "these pages look different". This says which property is wrong when
  they do not: it reads the colour the primitives actually compile against, resolved by the
  browser, on an element below `<html>` where `data-brand` has to reach for the alias to work.
*/
test("the accent resolves to a different colour under each brand", async ({ page }) => {
  const seen = new Map<string, string>();

  for (const brand of BRANDS) {
    await open(page, { brand });
    const button = page.locator('[data-shot="button-variants"] button').first();
    const background = await button.evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(background, `${brand} left the primary button unpainted`).not.toBe("rgba(0, 0, 0, 0)");
    seen.set(brand, background);
  }

  const colours = [...seen.values()];
  const duplicates = [...seen.entries()].filter(
    ([, colour]) => colours.filter((c) => c === colour).length > 1,
  );

  expect(
    duplicates.map(([brand, colour]) => `${brand}=${colour}`),
    "brands sharing an accent. Each theme declares its own, so any sharing here is the alias " +
      "resolving at the root instead of at the [data-brand] scope.",
  ).toEqual([]);
  expect(new Set(colours).size).toBe(BRANDS.length);
});

/*
  Density, which is where this suite earned itself on the first run.

  `data-density="compact"` is set on <html> in all four applications - MobiStack ships compact -
  documented in TOKENS.md, and it generates five custom properties. Nothing reads them. A search
  for `--px-density-` across all eight repositories finds only the lines in build-tokens.mjs
  that write it. The primitives size themselves with fixed Tailwind spacing: Button is
  `min-h-11`, which is 44px, while the token says a comfortable control is 40px and a compact
  one 32px.

  So MobiStack asks for compact and renders exactly like comfortable, and has done since the
  tokens were introduced. This is the same shape as the single-colour bug: a generator producing
  correct values that never reach paint, invisible to every gate because the gates check the
  values and not the pixels.

  Wiring it through changes the metrics of four shipped applications, so it is a decision rather
  than a fix, and it is recorded here instead of being quietly skipped.
*/
/*
  The test that reproduces the original bug.

  Everything above sets the brand on <html>, and under the bug that still worked: a plain
  `@theme` emits the alias on `:root`, which is the element the brand attribute was on, so the
  accent resolved correctly there. Planting the bug and running this file confirmed it - eleven
  tests, all green, against the defect they were written for.

  A brand below the root is the case that broke, because the alias had already been resolved to
  a finished colour by the time the scope was reached. So the claim here is the strict one: a
  scoped panel must paint the same accent that its brand paints at the root.
*/
test("a data-brand below the root re-themes its own subtree", async ({ page }) => {
  // What each brand's primary button looks like when the brand is on <html>. This is the
  // reference, and it is the thing a nested scope has to match.
  const atRoot = new Map<string, string>();
  for (const brand of BRANDS) {
    await open(page, { brand });
    atRoot.set(
      brand,
      await page
        .locator('[data-shot="button-variants"] button')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    );
  }

  // Host the page under one brand, then check every other brand's scoped panel.
  const host = BRANDS[0];
  await open(page, { brand: host });

  const wrong: string[] = [];
  for (const brand of BRANDS) {
    const scoped = await page
      .locator(`[data-nested="${brand}"] button`)
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    if (scoped !== atRoot.get(brand)) {
      wrong.push(`${brand}: scoped ${scoped}, expected ${atRoot.get(brand)}`);
    }
  }

  expect(
    wrong,
    `A [data-brand] panel inside a ${host} page did not take its own accent. This is the ` +
      `single-colour bug: the --color-* aliases resolve at :root and descendants inherit a ` +
      `finished colour, so a brand scope below the root has nothing left to change. Every ` +
      `--color-* alias must be in an "@theme inline".`,
  ).toEqual([]);
});

test.describe("density", () => {
  test("the attribute and the tokens both change", async ({ page }) => {
    // True today, and worth holding: it fails if the switch stops reaching the document or the
    // generator stops emitting the compact block.
    await open(page, { brand: "technologies", density: "compact" });
    expect(await page.getAttribute("html", "data-density")).toBe("compact");
    const compact = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--px-density-control").trim(),
    );

    await open(page, { brand: "technologies", density: "comfortable" });
    expect(await page.getAttribute("html", "data-density")).toBeNull();
    const roomy = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--px-density-control").trim(),
    );

    expect(compact).toBe("32px");
    expect(roomy).toBe("40px");
  });

  test("compact makes the page shorter", async ({ page }) => {
    // Expected to fail, and left in rather than deleted: the day someone wires the density
    // tokens into the primitives this starts passing, and Playwright reports the unexpected
    // pass. That report is the notification that the defect above is fixed.
    test.fail(true, "the primitives do not read --px-density-*; see the note above");

    const roomy = await shoot(page, { brand: "technologies", density: "comfortable" });
    const tight = await shoot(page, { brand: "technologies", density: "compact" });
    expect(difference(roomy, tight)).toBeGreaterThan(0.005);
  });
});
