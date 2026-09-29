import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BRANDS, apply, type Density, type Mode } from "./brands";
import { Gallery } from "./gallery";
import "./gallery.css";

const params = new URLSearchParams(window.location.search);

const brand = params.get("brand") ?? BRANDS[0];
const mode: Mode = params.get("mode") === "dark" ? "dark" : "light";
const density: Density = params.get("density") === "compact" ? "compact" : "comfortable";

if (!BRANDS.includes(brand)) {
  // Loudly, rather than falling back. A test that asks for a brand that no longer exists is
  // asserting against a theme nobody ships, and silently photographing a different one would
  // make it pass.
  document.body.textContent = `Unknown brand "${brand}". Known: ${BRANDS.join(", ")}.`;
  throw new Error(`Unknown brand "${brand}"`);
}

apply(brand, mode, density);

/**
 * `data-gallery-ready` is what the tests wait for.
 *
 * Waiting on `load` would not be enough: fonts resolve after it, and a shot taken in between
 * is laid out with the fallback metrics and differs from every later one. `document.fonts.ready`
 * is the signal that the layout has stopped moving.
 */
async function markReady() {
  await document.fonts.ready;
  document.documentElement.setAttribute("data-gallery-ready", "true");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Gallery brand={brand} mode={mode} density={density} />
  </StrictMode>,
);

void markReady();
