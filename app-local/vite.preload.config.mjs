import { defineConfig } from "vite";
import { builtinModules } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export default defineConfig({
  root: path.resolve(__dirname, "./src/main"),
  build: {
    outDir: "../../dist/preload",
    emptyOutDir: false,
    sourcemap: true,
    target: "node18",
    minify: false,
    rollupOptions: {
      input: path.resolve(__dirname, "src/main/preload.js"),
      external: ["electron", ...builtinModules],
      output: {
        format: "cjs",
        entryFileNames: "preload.js",
      }
    }
  }
});
