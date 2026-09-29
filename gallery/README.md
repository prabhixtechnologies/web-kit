# Visual regression

Every primitive on one page, rendered in a real browser, photographed and compared.

This exists because of one bug. `--color-primary: var(--px-accent)` was declared in a plain
`@theme`, which emits it on `:root`. Custom properties are substituted at computed-value time on
the element that declares them, so the alias resolved once at the root and every descendant
inherited a finished colour. The result was that a `[data-brand]` scope *below* the root had
nothing left to change, and five brands shared one palette.

It passed a typecheck, seventy-three unit tests and six gates. Nothing in the suite rendered a
pixel: the tests ran in jsdom, which has no layout and no paint, and the token contrast gate was
satisfied because the tokens themselves were correct. The defect was in how they were aliased.

## Running it

```bash
npx playwright install chromium   # once
npm run test:visual               # from web-kit, or from gallery/
```

The gallery itself is a normal Vite app, which is useful for looking at a change by eye:

```bash
npm run dev --workspace @prabhixtechnologies/gallery
# http://localhost:4319/?brand=mobistack&mode=dark&density=compact
```

Brand, mode and density come from the query string rather than a control on the page, so a
screenshot is reproducible from its address. `brand` must be one of the names in `tokens.json`;
an unknown one fails loudly instead of falling back to a different theme and passing.

## The two kinds of test

**`tests/invariants.spec.ts` — always runs, nothing stored.** Compares renders taken in the same
run against each other: the five brands must not render alike, dark must not render like light,
and a `data-brand` below the root must take its own accent. Because both sides of every
comparison come from the same machine in the same run, fonts and platform cancel out and the
answer is the same everywhere. This is the file that matters.

**`tests/baseline.spec.ts` — opt-in, compares against committed PNGs.** Answers a different
question: has anything changed since last time. Catches a primitive that quietly lost a border
or gained four pixels of padding, which no invariant can see.

Baselines are bytes from one particular renderer, and Linux and Windows disagree about text
rasterisation and scrollbar width. The committed set is the Linux one, so regenerate it with the
**Visual baselines** workflow rather than locally — it writes the set, verifies it passes, and
commits it. Locally the same thing is available through the container:

```bash
docker run --rm -v "${PWD}:/w" -w /w/gallery mcr.microsoft.com/playwright:v1.50.0-jammy \
  npx playwright test --project baseline --update-snapshots
```

Set `VR_BASELINE=1` to register the baseline project at all; without it only the invariants run.

## Things learned building it, which are easy to undo by accident

**A brand on `<html>` cannot reproduce the bug.** The first version of this gallery only set
`data-brand` on the root element. Planting the original bug and running the suite produced
eleven passing tests, because the root is exactly where the broken alias resolved correctly.
`src/sections/nested.tsx` and the nested-brand test are the ones with teeth; the pairwise
full-page comparisons are supporting evidence. Do not remove the nested section.

**A perceptual pixel diff is the wrong tool for comparing two brands.** pixelmatch's default
threshold asks whether a person would notice a pixel changed, which is right for a page against
its own past self, where the noise is anti-aliasing. Indigo and violet are adjacent hues of
similar lightness: they fall inside that tolerance, and the OneOps/Admin pair scored 0.5% and
read as a brand not being applied. Brand comparisons therefore count any pixel that is not
byte-identical, which is sound because both shots come from the same deterministic renderer at
the same geometry. See `exactDifference` in `tests/harness.ts`.

**Measure where the colour is.** A full-page diff divides the changed pixels by the area of a
very tall page that is mostly prose on a neutral surface. The accent-dense blocks are named in
`ACCENT_DENSE`, and the same real difference reads as 20% there instead of 0.04%.

**Wait for `document.fonts.ready`, not `load`.** Fonts resolve after load, and a shot taken in
between is laid out with fallback metrics and differs from every later one by a pixel or two
everywhere there is text. `main.tsx` sets `data-gallery-ready` after fonts settle; the harness
waits for that.

**Pin `colorScheme`.** Light mode is the *absence* of `data-theme`, which falls through to a
block that also answers `prefers-color-scheme: dark`. On a machine that prefers dark, the light
gallery renders dark. `playwright.config.ts` pins it, and `open()` asserts the mode actually
applied rather than trusting it.

## A defect this found on its first run, since fixed

`data-density="compact"` did nothing.

It was set on `<html>`, documented in `TOKENS.md`, and generated five custom properties that
nothing read: searching all eight repositories for `--px-density-` found only the lines in
`build-tokens.mjs` that wrote it. The primitives sized themselves with fixed Tailwind spacing,
so an application could ask for compact and render comfortable — and had done since the tokens
were introduced. The same shape as the bug at the top of this file: a generator producing
correct values that never reach paint.

Three things came out of fixing it that are worth keeping in mind.

**A token that is read by nothing can hold any value, and will.** Comfortable said a control was
40px while every control shipped at 44px, and compact said 32px. Nobody reconciled the two
because there was nothing to reconcile — the number had no consequence. The fix took the sizes
that had actually shipped: 44px comfortable, which is the WCAG 2.5.5 AAA pointer target that
`button.tsx` chose deliberately, and 36px compact, which is a real reduction and still well
clear of the 24px AA floor in 2.5.8.

**A role name is not a value.** `bodyRole` emitted `--px-density-body-role: body-md`, and there
is no `var(--px-text-var(--px-density-body-role))` — CSS cannot dereference a name, so that
property was unusable by construction. `build-tokens.mjs` now resolves the role against
`scale.type` and emits the size and line height it stands for. The role stays the authored form,
because that is the real intent and it keeps in step with the type scale on its own.

**Only a measured box proves a token works.** The test asserting that the custom properties
change between modes passed throughout the whole period the feature was broken, because the
properties were always correct. The tests that have teeth are the ones that measure a rendered
control against the token and compare page heights between the two modes.
