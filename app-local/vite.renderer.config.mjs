import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, "./src/renderer"),
  base: "",
  plugins: [react()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer"),
    }
  },

  css: {
    postcss: path.resolve(__dirname, "./postcss.config.js"),
  },

  build: {
    outDir: "../../dist/renderer",
    emptyOutDir: true,
    sourcemap: true,
    target: "esnext",
  },

  server: {
    port: 5173,
    strictPort: true
  }
});