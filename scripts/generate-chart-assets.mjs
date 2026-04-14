import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const templatesDir = path.join(rootDir, "assets", "chart-templates");
const themesDir = path.join(rootDir, "assets", "chart-themes");
const outputDir = path.join(rootDir, "src", "generated");
const outputPath = path.join(outputDir, "chart-assets.ts");

const templateFiles = ["aspect_grid_only.xml", "chart.xml", "modern_wheel.xml", "wheel_only.xml"];
const themeFiles = ["black-and-white.css", "classic.css", "dark-high-contrast.css", "dark.css", "light.css", "strawberry.css"];

function withoutExtension(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

function readFiles(directory, filenames) {
  return Object.fromEntries(
    filenames.map(filename => [withoutExtension(filename), readFileSync(path.join(directory, filename), "utf8")]),
  );
}

const chartTemplates = readFiles(templatesDir, templateFiles);
const chartThemes = readFiles(themesDir, themeFiles);

const output = [
  "// Generated from assets/chart-templates and assets/chart-themes.",
  `export const chartTemplates = ${JSON.stringify(chartTemplates, null, 2)} as const;`,
  "",
  `export const chartThemes = ${JSON.stringify(chartThemes, null, 2)} as const;`,
  "",
  "export type ChartTemplateName = keyof typeof chartTemplates;",
  "export type ChartThemeName = keyof typeof chartThemes;",
  "",
].join("\n");

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, output, "utf8");
