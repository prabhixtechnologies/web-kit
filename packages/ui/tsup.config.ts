import { copyFileSync } from "node:fs";
import { defineConfig } from "tsup";

// This package shipped raw TypeScript for as long as every consumer linked it with `file:`, and
// that was the right trade then: no build step, no stale `dist`, and each app's bundler compiled
// the sources it followed through the symlink.
//
// Publishing changes it. A consumer resolving `@prabhixtechnologies/ui` out of `node_modules` gets no
// transpilation by default -- Vite's Rollup build does not compile TypeScript there, and Next
// needs the package named in `transpilePackages` -- so raw sources would make every consumer
// carry configuration to undo the choice. Shipping compiled ESM with declarations is what the
// ecosystem expects a package to be.
//
// What is deliberately not bundled: everything in peerDependencies. Inlining React, Radix or
// `sonner` here would put a second copy in the consumer's graph, which is the failure the root
// package.json already documents for React -- hooks read a dispatcher off a module-level
// singleton and a duplicate fails as "Cannot read properties of null". tsup treats peers as
// external automatically; the explicit list below covers subpath imports it cannot infer.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // preset.css is copied verbatim rather than bundled. It is a Tailwind v4 `@theme` source that
  // the consuming app's Tailwind must read as authored: putting it through a bundler would
  // resolve the `@theme inline` blocks here, which is exactly the thing that made the whole
  // portfolio render in one colour. `loader` does not reach it because nothing in the entry
  // imports it -- it is a second export -- so the copy is explicit, and the published
  // `./preset.css` export is broken without it.
  loader: { ".css": "copy" },
  onSuccess: async () => {
    copyFileSync("src/preset.css", "dist/preset.css");
  },
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^@radix-ui\//, /^@prabhixtechnologies\//],
  // Preserved so a consumer importing one primitive does not pull the whole library into its
  // graph before tree-shaking gets a chance.
  splitting: true,
});
