import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const distLoaderPath = path.join(rootDir, "dist", "generated", "sweph", "emscripten", "sweph.js");
const sourceWasmPath = path.join(rootDir, "src", "generated", "sweph", "emscripten", "sweph.wasm");
const distWasmPath = path.join(rootDir, "dist", "generated", "sweph", "emscripten", "sweph.wasm");

const distLoaderSource = readFileSync(distLoaderPath, "utf8");
const wasmUrlStartMarker = "return new URL(\"data:application/wasm;base64,";
const wasmUrlEndMarker = "\", \"\" + import.meta.url).href;";
const wasmUrlStartIndex = distLoaderSource.indexOf(wasmUrlStartMarker);
const externalWasmUrlMarker = "return new URL(\"sweph.wasm\", import.meta.url).href;";

if (wasmUrlStartIndex === -1 && !distLoaderSource.includes(externalWasmUrlMarker)) {
  throw new Error("Expected Vite to inline the Swiss Ephemeris wasm asset in dist/generated/sweph/emscripten/sweph.js");
}

let patchedDistLoaderSource = distLoaderSource;

if (wasmUrlStartIndex !== -1) {
  const wasmUrlEndIndex = distLoaderSource.indexOf(wasmUrlEndMarker, wasmUrlStartIndex);

  if (wasmUrlEndIndex === -1) {
    throw new Error("Could not locate the end of the inlined Swiss Ephemeris wasm asset URL in dist/generated/sweph/emscripten/sweph.js");
  }

  patchedDistLoaderSource = [
    distLoaderSource.slice(0, wasmUrlStartIndex),
    externalWasmUrlMarker,
    distLoaderSource.slice(wasmUrlEndIndex + wasmUrlEndMarker.length),
  ].join("");
}

patchedDistLoaderSource = patchedDistLoaderSource
  .replaceAll("await import(\"node:module\")", "await import([\"node\", \"module\"].join(\":\"))")
  .replaceAll("require(\"node:fs\")", "require([\"node\", \"fs\"].join(\":\"))")
  .replaceAll("require(\"node:path\")", "require([\"node\", \"path\"].join(\":\"))")
  .replaceAll("require(\"node:url\")", "require([\"node\", \"url\"].join(\":\"))")
  .replaceAll("require(\"node:crypto\")", "require([\"node\", \"crypto\"].join(\":\"))");

if (!patchedDistLoaderSource.includes(externalWasmUrlMarker)) {
  throw new Error("Could not locate the end of the inlined Swiss Ephemeris wasm asset URL in dist/generated/sweph/emscripten/sweph.js");
}

mkdirSync(path.dirname(distWasmPath), { recursive: true });
copyFileSync(sourceWasmPath, distWasmPath);
writeFileSync(distLoaderPath, patchedDistLoaderSource);
