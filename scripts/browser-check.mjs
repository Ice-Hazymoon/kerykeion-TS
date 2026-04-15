import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const workspaceDir = path.join(rootDir, ".tmp", "browser-check");
const nodeModulesDir = path.join(workspaceDir, "node_modules");
const packageLink = path.join(nodeModulesDir, "kerykeion-ts");
const viteBin = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
const consumerDistDir = path.join(workspaceDir, "dist");

function collectFiles(directoryPath) {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}

rmSync(workspaceDir, { force: true, recursive: true });
mkdirSync(path.join(workspaceDir, "src"), { recursive: true });
mkdirSync(nodeModulesDir, { recursive: true });

writeFileSync(path.join(workspaceDir, "package.json"), JSON.stringify({
  name: "browser-check",
  private: true,
  type: "module",
}, null, 2));

writeFileSync(path.join(workspaceDir, "index.html"), "<!doctype html><html><body><script type=\"module\" src=\"/src/main.js\"></script></body></html>\n");
writeFileSync(path.join(workspaceDir, "src", "main.js"), [
  "import { AstrologicalSubjectFactory, ChartDrawer, initializeSweph } from \"kerykeion-ts\";",
  "",
  "console.log(typeof AstrologicalSubjectFactory, typeof ChartDrawer, typeof initializeSweph);",
].join("\n"));

symlinkSync(rootDir, packageLink, "dir");

try {
  execFileSync(process.execPath, [viteBin, "build"], {
    cwd: workspaceDir,
    stdio: "inherit",
  });

  const builtFiles = collectFiles(consumerDistDir);
  const wasmFiles = builtFiles.filter(filePath => filePath.endsWith(".wasm"));

  if (wasmFiles.length === 0) {
    throw new Error("Expected the browser smoke build to emit a wasm asset for kerykeion-ts");
  }

  const bundledJavaScript = builtFiles
    .filter(filePath => filePath.endsWith(".js"))
    .map(filePath => readFileSync(filePath, "utf8"))
    .join("\n");

  if (bundledJavaScript.includes("core/paths.js")) {
    throw new Error("Browser smoke build still references core/paths.js");
  }
}
finally {
  rmSync(workspaceDir, { force: true, recursive: true });
}
