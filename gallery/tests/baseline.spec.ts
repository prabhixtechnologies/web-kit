import { expect, test } from "@playwright/test";
import { BRANDS, MODES, open } from "./harness";

/*
  Pixel baselines. Off unless VR_BASELINE=1 - see playwright.config.ts for why.

  These answer a different question from invariants.spec.ts. That file asks whether the brands
  differ from each other, which is portable and needs nothing stored. This one asks whether
  anything changed since last time, which is the only way to notice a primitive that quietly
  lost its border or gained four pixels of padding.

  The committed PNGs are Linux, because that is what CI renders. Do not update them from
  Windows or macOS: text rasterisation and scrollbar width differ, the whole set turns red, and
  the temptation is then to raise the threshold until it passes. Use the Visuals workflow, or
  the Playwright container locally:

    docker run --rm -v "${PWD}:/w" -w /w/gallery mcr.microsoft.com/playwright:v1.50.0-jammy \
      npx playwright test --update-snapshots
*/

for (const brand of BRANDS) {
  for (const mode of MODES) {
    test(`${brand} ${mode}`, async ({ page }) => {
      await open(page, { brand, mode });
      await expect(page).toHaveScreenshot(`${brand}-${mode}.png`, { fullPage: true });
    });
  }
}

/*
  The overlays, which are not on the page until something opens them.

  One brand is enough here: what an overlay adds over the flat gallery is where it lands and
  what it lands on, and that geometry is shared. The colours inside it are the same tokens the
  pairwise tests already cover under all five.
*/
test.describe("overlays", () => {
  const brand = BRANDS[0];

  test("dialog", async ({ page }) => {
    await open(page, { brand });
    await page.getByRole("button", { name: "Open dialog" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveScreenshot("overlay-dialog.png");
  });

  test("sheet", async ({ page }) => {
    await open(page, { brand });
    await page.getByRole("button", { name: "Open sheet" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveScreenshot("overlay-sheet.png");
  });

  test("popover", async ({ page }) => {
    await open(page, { brand });
    await page.getByRole("button", { name: "Open popover" }).click();
    await expect(page.getByRole("textbox", { name: "Customer" })).toBeVisible();
    await expect(page).toHaveScreenshot("overlay-popover.png");
  });

  test("dropdown menu", async ({ page }) => {
    await open(page, { brand });
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page).toHaveScreenshot("overlay-dropdown.png");
  });

  test("context menu", async ({ page }) => {
    await open(page, { brand });
    await page.getByText("Right-click anywhere in this area").click({ button: "right" });
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page).toHaveScreenshot("overlay-context-menu.png");
  });

  // The row menu is the one piece of chrome with three ways in - right-click, long-press and
  // Shift+F10. Which of them fired is asserted in actions.test.tsx; this is where the menu goes.
  test("row actions", async ({ page }) => {
    await open(page, { brand });
    await page.getByText("INV-1043").first().click({ button: "right" });
    await expect(page.getByRole("menu", { name: /INV-1043/ })).toBeVisible();
    await expect(page).toHaveScreenshot("overlay-row-actions.png");
  });
});
