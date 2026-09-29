import { defineConfig, devices } from "@playwright/test";

/*
  Two kinds of test live here, and they are separated because only one of them is portable.

  `invariants` compares screenshots taken in the same run against each other: the five brands
  must not render alike, dark must not render like light. Nothing is stored, so the answer does
  not depend on which machine or font stack produced the pixels. These run everywhere.

  `baseline` compares against committed PNGs, which are bytes produced by one particular
  renderer. Linux and Windows disagree about text rasterisation and scrollbar width, so a
  baseline taken on one is noise on the other. They are therefore off unless asked for, and the
  committed set is the Linux one that CI produces. Run `npm run test:visual:update` inside the
  Playwright container, or let the Visuals workflow do it.
*/
const baseline = process.env.VR_BASELINE === "1";

const shared = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1280, height: 900 },
  // A fractional scale factor resamples text and makes a diff out of nothing.
  deviceScaleFactor: 1,
  // Light mode is the absence of `data-theme`, which falls through to a block that also answers
  // `prefers-color-scheme: dark`. Without pinning this, the light gallery renders dark on a
  // machine that prefers dark, and every light baseline is wrong on half the machines.
  colorScheme: "light" as const,
  reducedMotion: "reduce" as const,
  timezoneId: "Asia/Kolkata",
  locale: "en-IN",
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  // Screenshot comparison is not flaky here, so a retry would only hide a real difference.
  expect: {
    toHaveScreenshot: {
      // Anti-aliasing on a border radius differs by a pixel or two between otherwise identical
      // runs. Anything a brand or a mode changes is orders of magnitude larger than this.
      maxDiffPixelRatio: 0.002,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: "http://localhost:4319",
    ...shared,
  },
  projects: [
    { name: "invariants", testMatch: /invariants\.spec\.ts/ },
    ...(baseline ? [{ name: "baseline", testMatch: /baseline\.spec\.ts/ }] : []),
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4319",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
