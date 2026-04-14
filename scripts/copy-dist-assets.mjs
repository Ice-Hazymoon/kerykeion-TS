import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const sourceDir = path.join(rootDir, "src", "generated", "sweph", "emscripten");
const destinationDir = path.join(rootDir, "dist", "generated", "sweph", "emscripten");

mkdirSync(destinationDir, { recursive: true });

for (const filename of ["sweph.mjs", "sweph.wasm"]) {
  cpSync(path.join(sourceDir, filename), path.join(destinationDir, filename));
}
