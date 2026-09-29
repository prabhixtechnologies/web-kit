import { expect, type Page, test } from "@playwright/test";
import {
  ACCENT_DENSE,
  BRANDS,
  type Density,
  difference,
  exactDifference,
  open,
  shoot,
  shootSection,
} from "./harness";
import { DENSITY_SCALE, px } from "./tokens";

/** The rendered height of the first match, which is what a density token is a claim about. */
async function box(page: Page, selector: string): Promise<number> {
  const rect = await page.locator(selector).first().boundingBox();
  if (!rect) throw new Error(`${selector} is not visible, so it cannot be measured`);
  return Math.round(rect.height);
}

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

  `data-density="compact"` was set on <html>, documented in TOKENS.md, and generated five custom
  properties that nothing read. A search for `--px-density-` across all eight repositories found
  only the lines in build-tokens.mjs that wrote it. The primitives sized themselves with fixed
  Tailwind spacing, so an application could ask for compact and render exactly like comfortable,
  and had done since the tokens were introduced. The same shape as the single-colour bug: a
  generator producing correct values that never reach paint, invisible to every gate because the
  gates checked the values and not the pixels.

  The tokens are wired into the primitives now, and two of the three tests below exist because
  the first one was not enough on its own - it passed throughout the entire period the feature
  was broken, since the custom properties were always correct. Only measuring a rendered box
  distinguishes a token that works from one that is merely present.
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

    expect(compact).toBe(DENSITY_SCALE.compact.control);
    expect(roomy).toBe(DENSITY_SCALE.comfortable.control);
  });

  test("the controls are the height the tokens say they are", async ({ page }) => {
    // The test that decides whether density is real. For most of this project's life the
    // tokens above were emitted and read by nothing, so `data-density="compact"` was an
    // attribute that changed five custom properties and not one pixel. Measuring the boxes
    // is the only way to tell the difference: the values were always legible.
    const bodyRows: Record<string, number> = {};

    for (const [mode, tokens] of Object.entries(DENSITY_SCALE)) {
      await open(page, { brand: "technologies", density: mode as Density });

      const button = await box(page, '[data-shot="button-variants"] button');
      expect(button, `default button under ${mode}`).toBe(px(tokens.control));

      const input = await box(page, '[data-shot="text-inputs"] input');
      expect(input, `input under ${mode}`).toBe(px(tokens.control));

      // The header row is plain text, so it sits exactly on the floor the token sets.
      const head = await box(page, '[data-shot="table-plain"] thead tr');
      expect(head, `table header row under ${mode}`).toBe(px(tokens.row));

      // A body row is only guaranteed to be *at least* the token: `h-` on a tr is a floor,
      // and this table has a Badge in its status column. A badge is an inline label rather
      // than a control, so it does not take the density height, and under compact its 23px
      // plus 12px of cell padding clears the 34px row by one pixel. That is the row growing
      // to fit its contents, which is what it should do.
      const row = await box(page, '[data-shot="table-plain"] tbody tr');
      expect(row, `table body row under ${mode}`).toBeGreaterThanOrEqual(px(tokens.row));
      bodyRows[mode] = row;
    }

    expect(
      bodyRows.compact,
      `body rows: comfortable ${bodyRows.comfortable}px, compact ${bodyRows.compact}px`,
    ).toBeLessThan(bodyRows.comfortable);
  });

  test("compact makes the page shorter", async ({ page }) => {
    // The whole-page consequence of the heights above, and the cheapest guard against a
    // future primitive that hardcodes its height again: one control going back to a fixed
    // size would not fail the measurements above, but enough of them will fail this.
    await open(page, { brand: "technologies", density: "comfortable" });
    const roomy = await page.evaluate(() => document.documentElement.scrollHeight);

    await open(page, { brand: "technologies", density: "compact" });
    const tight = await page.evaluate(() => document.documentElement.scrollHeight);

    expect(tight, `comfortable ${roomy}px, compact ${tight}px`).toBeLessThan(roomy);
  });
});
