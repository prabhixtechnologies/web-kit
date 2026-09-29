import { defineConfig } from "tsup";

// Same reasoning as the other two packages: raw TypeScript is what a `file:` link wants and what
// a published tarball cannot use, because a consumer resolving out of node_modules gets no
// transpilation. See packages/ui/tsup.config.ts for the full note.
//
// No `external` list is needed. This package has no runtime dependencies at all -- it is PKCE
// over `fetch` and `crypto.subtle`, both of which are platform globals.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // The test file sits beside the source and is run with node's own type stripping, so it must
  // not be compiled into the published output.
  external: [/\.test\.ts$/],
});
