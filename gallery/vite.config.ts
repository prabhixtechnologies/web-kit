import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `dedupe` for the same reason the root package.json holds react: the primitives are consumed
  // here through a workspace link, and two copies of react in one process fail as
  // "Cannot read properties of null (reading 'useState')".
  resolve: { dedupe: ["react", "react-dom"] },
  server: { port: 4319, strictPort: true },
  preview: { port: 4319, strictPort: true },
});
