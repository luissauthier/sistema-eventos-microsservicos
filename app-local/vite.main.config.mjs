import { defineConfig } from "vite";
import { builtinModules } from "module";
import path from "path";
import { copyStaticMain } from "./scripts/copy-static-main.js";

export default defineConfig({
  root: path.resolve(__dirname, "./src/main"),
  build: {
    outDir: "../../dist/main",
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    target: "node18",
    rollupOptions: {
      input: path.resolve(__dirname, "./src/main/main.js"),
      external: ["electron", "sqlite3", ...builtinModules],
      output: {
        format: "cjs",
        entryFileNames: "main.js",
      },
    },
  },
  plugins: [
    copyStaticMain(),
  ],
});
