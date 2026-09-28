import { defineConfig } from "tsup";

// Why this package needs a build at all, when most of what it ships is generated CSS and JSON:
// three repositories import it as a module for `toneFor`, `TAG_TONES`, `TAG_SWATCHES` and
// `marks`. Those are TypeScript sources today, which a `file:` link compiles for free and a
// published tarball does not -- see the note in packages/ui/tsup.config.ts.
//
// The CSS, tokens.json, the marks and the scripts are not built. They are listed in `files` and
// shipped as they are: prabhix-tokens.css and tailwind-preset.css are generated artefacts that
// must reach the consumer byte-for-byte, and the gate scripts are run by node directly.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
