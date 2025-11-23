import { defineConfig } from "vite";
import { builtinModules } from "module";
import path from "path";
const { copyStaticMain } = require("./scripts/copy-static-main.js");
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
