import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The primitives are the one place in the portfolio where a mistake is copied into four
// products, so they are tested here rather than only where they are used.
//
// jsdom rather than a real browser: everything asserted is structure and wiring — ids, aria
// attributes, roles, what keyboard events do — which jsdom models faithfully. Anything that
// depends on real layout or paint (sticky headers, the long-press timer, focus rings) is not
// tested here and is not claimed to be; that belongs to the visual-regression pass.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
