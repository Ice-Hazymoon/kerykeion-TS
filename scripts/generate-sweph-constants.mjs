import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const sourceFiles = [
  path.join(rootDir, "vendor", "pyswisseph-source", "libswe", "sweodef.h"),
  path.join(rootDir, "vendor", "pyswisseph-source", "libswe", "swephexp.h"),
  path.join(rootDir, "vendor", "pyswisseph-source", "libswe", "sweph.h"),
];
const outputDir = path.join(rootDir, "src", "generated", "sweph");
const outputPath = path.join(outputDir, "constants.ts");

const allowedConstantName = /^(?:SE[A-Z0-9_]*|OK|ERR|DEGTORAD|RADTODEG)$/u;
const sourceLabel = "vendor/pyswisseph-source/libswe/{sweodef.h,swephexp.h,sweph.h}";

function sanitizeExpression(value) {
  return value
    .replace(/\/\/.*$/u, "")
    .replace(/\bM_PI\b/gu, "3.14159265358979323846")
    .replace(/(?<=\b(?:0x[0-9A-Fa-f]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?))[uUlLfF]+\b/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractConstants(filePath) {
  const source = readFileSync(filePath, "utf8").replace(/\/\*[\s\S]*?\*\//gu, "");
  const constants = [];

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    const prefixMatch = line.match(/^#\s*define\s+/u);
    if (!prefixMatch) {
      continue;
    }

    const remainder = line.slice(prefixMatch[0].length).trim();
    const separatorIndex = remainder.search(/\s/u);
    if (separatorIndex <= 0) {
      continue;
    }

    const name = remainder.slice(0, separatorIndex).trim();
    if (name.includes("(")) {
      continue;
    }

    const rawValue = remainder.slice(separatorIndex).trim();
    if (!allowedConstantName.test(name)) {
      continue;
    }

    const value = sanitizeExpression(rawValue);
    if (!value) {
      continue;
    }

    constants.push({ name, value });
  }

  return constants;
}

const discoveredConstants = new Map();
for (const sourceFile of sourceFiles) {
  for (const constant of extractConstants(sourceFile)) {
    if (!discoveredConstants.has(constant.name)) {
      discoveredConstants.set(constant.name, constant.value);
    }
  }
}

if (discoveredConstants.size === 0) {
  throw new Error(`No constants found in ${sourceLabel}`);
}

const constantNames = new Set(discoveredConstants.keys());
const orderedConstants = [];
const remainingConstants = Array.from(discoveredConstants, ([name, value]) => ({ name, value }));
const emittedNames = new Set();

while (remainingConstants.length > 0) {
  let emittedThisRound = false;

  for (let index = 0; index < remainingConstants.length; index += 1) {
    const candidate = remainingConstants[index];
    const dependencies = Array.from(candidate.value.matchAll(/\b(?:SE[A-Z0-9_]*|OK|ERR|DEGTORAD|RADTODEG)\b/gu), match => match[0])
      .filter(dependency => dependency !== candidate.name && constantNames.has(dependency));

    if (dependencies.every(dependency => emittedNames.has(dependency))) {
      orderedConstants.push(candidate);
      emittedNames.add(candidate.name);
      remainingConstants.splice(index, 1);
      emittedThisRound = true;
      break;
    }
  }

  if (!emittedThisRound) {
    orderedConstants.push(...remainingConstants);
    break;
  }
}

const declarations = orderedConstants.map(({ name, value }) => `export const ${name} = ${value};`);
const entries = orderedConstants.map(({ name }) => `  ${name},`);
const output = [
  `// Generated from ${sourceLabel}`,
  ...declarations,
  "",
  "export const constants = {",
  ...entries,
  "} as const;",
  "",
  "export type SwephConstants = typeof constants;",
  "",
].join("\n");

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, output, "utf8");
