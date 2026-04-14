import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(import.meta.dirname, "..");
const configPath = path.join(rootDir, "vendor", "upstream-sources.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");

function readOption(name) {
  const prefix = `${name}=`;
  const match = argv.find(argument => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

const requestedVendors = (readOption("--vendor") ?? "all")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const refOverrides = {
  "Astrologer-API": readOption("--astrologer-api-ref"),
  "kerykeion": readOption("--kerykeion-ref"),
  "pyswisseph-source": readOption("--pyswisseph-ref"),
};

function shouldSyncVendor(name) {
  return requestedVendors.includes("all") || requestedVendors.includes(name);
}

function runGit(args, workdir) {
  return execFileSync("git", args, {
    cwd: workdir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function removeIfExists(targetPath) {
  if (existsSync(targetPath)) {
    rmSync(targetPath, { force: true, recursive: true });
  }
}

function copySnapshot(sourceDir, destinationDir) {
  removeIfExists(destinationDir);
  cpSync(sourceDir, destinationDir, { recursive: true });

  for (const relativePath of [
    ".git",
    ".gitignore",
    ".github/cache",
    ".vscode",
    "__pycache__",
  ]) {
    removeIfExists(path.join(destinationDir, relativePath));
  }
}

function cloneSnapshot({ name, path: destinationPath, ref, repo }) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "astrologer-vendor-"));
  const tempClone = path.join(tempRoot, name);

  runGit(["clone", "--depth", "1", repo, tempClone], rootDir);

  if (ref !== "HEAD") {
    runGit(["fetch", "--depth", "1", "origin", ref], tempClone);
    runGit(["checkout", "--detach", "FETCH_HEAD"], tempClone);
  }

  const resolved = runGit(["rev-parse", "HEAD"], tempClone);
  const absoluteDestination = path.join(rootDir, destinationPath);

  if (!dryRun) {
    copySnapshot(tempClone, absoluteDestination);
  }

  removeIfExists(tempRoot);
  return resolved;
}

function recopyParityEphemerisFiles() {
  const sourceDir = path.join(rootDir, "assets", "sweph");
  const destinationDir = path.join(rootDir, "vendor", "kerykeion", "kerykeion", "sweph");
  mkdirSync(destinationDir, { recursive: true });

  for (const filename of ["semo_18.se1", "sepl_18.se1"]) {
    cpSync(path.join(sourceDir, filename), path.join(destinationDir, filename));
  }
}

const nextConfig = structuredClone(config);
const syncPlan = [];

for (const [name, vendorConfig] of Object.entries(config)) {
  if (!shouldSyncVendor(name)) {
    continue;
  }

  const ref = refOverrides[name] ?? vendorConfig.ref;
  syncPlan.push({ name, ref, repo: vendorConfig.repo, path: vendorConfig.path });
}

if (syncPlan.length === 0) {
  throw new Error("No vendors selected. Use --vendor=all or a comma-separated list such as --vendor=kerykeion,Astrologer-API.");
}

console.log(`Sync mode: ${dryRun ? "dry-run" : "apply"}`);
for (const item of syncPlan) {
  console.log(`- ${item.name}: ${item.repo} @ ${item.ref}`);
}

for (const item of syncPlan) {
  const resolved = cloneSnapshot(item);
  nextConfig[item.name].ref = item.ref;
  nextConfig[item.name].resolved = resolved;
  console.log(`${item.name} synced to ${resolved}`);
}

if (!dryRun && shouldSyncVendor("kerykeion")) {
  recopyParityEphemerisFiles();
}

if (!dryRun) {
  writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");
}

console.log("");
console.log("Next steps:");
console.log("1. bun run build");
console.log("2. bun run verify:full");
console.log("3. If upstream behavior changed, refresh baselines and parity fixtures before committing.");
