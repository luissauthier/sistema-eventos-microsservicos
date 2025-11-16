import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

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