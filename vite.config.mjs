import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const externalDependencies = new Set([
  "@js-temporal/polyfill",
  "zod",
  ...builtinModules,
  ...builtinModules.map(moduleId => `node:${moduleId}`),
]);

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    target: "es2022",
    outDir: "dist",
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    lib: {
      entry: {
        browser: path.resolve(rootDir, "src/browser.ts"),
        index: path.resolve(rootDir, "src/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: source => externalDependencies.has(source),
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "[name].js",
        format: "es",
        preserveModules: true,
        preserveModulesRoot: "src",
      },
    },
  },
});
