import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export function copyStaticMain() {
  return {
    name: "copy-static-main-files",
    closeBundle() {
      const srcDir = path.resolve(__dirname, "../src/main");
      const outDir = path.resolve(__dirname, "../dist/main");

      function copyRecursive(src, dest) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

        for (const file of fs.readdirSync(src)) {
          const srcPath = path.join(src, file);
          const destPath = path.join(dest, file);

          if (fs.lstatSync(srcPath).isDirectory()) {
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }

      console.log("[copy-static-main] Copiando arquivos auxiliares para dist/main...");
      copyRecursive(srcDir, outDir);
    },
  };
}
