# AGENTS.md

## Project Overview

`kerykeion-ts` is a Bun-first TypeScript port of:

- `g-battaglia/kerykeion`
- the Swiss Ephemeris C runtime used by `pyswisseph`

The repository has two roles:

1. a publishable npm core library
2. a parity workspace that keeps the TypeScript implementation aligned with the upstream Python and C sources

The published npm package ships only the core runtime.

## What This Repo Contains

- `src/core/*`
  - the actual TypeScript port of the astrology logic
- `src/generated/*`
  - generated chart assets, generated Swiss Ephemeris constants, and generated Emscripten output
- `assets/sweph/*`
  - Swiss Ephemeris data files that are shipped with the package
- `vendor/*`
  - committed upstream mirrors used for auditability and parity work
- `tests/*`
  - regression and parity coverage for the TypeScript port
- `scripts/*`
  - generators, vendor sync tooling, and build helpers

## Runtime Model

This project does **not** depend on the npm `sweph` package and does **not** require Python at runtime.

Swiss Ephemeris is built from vendored C sources into:

- a plain-text ESM loader: `src/generated/sweph/emscripten/sweph.mjs`
- a separate WebAssembly binary: `src/generated/sweph/emscripten/sweph.wasm`

This split asset model is intentional. It is more stable for Vite, Rolldown, esbuild, browser, and serverless bundlers than embedding wasm bytes into a single generated JS file.

## Published Package Scope

The npm package is **core-only**.

It includes:

- `dist/core/*`
- `dist/generated/*`
- `dist/index.js`
- `dist/index.d.ts`
- `dist/browser.js`
- `assets/sweph/*`

It does **not** include:

- `vendor/*`
- repository-only scripts or test fixtures

## Primary Commands

Install:

```bash
bun install
```

Build the publishable output:

```bash
bun run build
```

Run lint:

```bash
bun run lint
```

Run type checks:

```bash
bun run typecheck
```

Run unused-file/dependency checks:

```bash
bun run check:unused
```

Run the full verification pipeline:

```bash
bun run verify:full
```

Smoke-check browser bundling:

```bash
bun run browser:check
```

Run the local browser demo:

```bash
bun run demo:web
```

## Architecture Notes

- `src/core/astrological-subject-factory.ts`
  - subject creation, point calculation, houses, location/time handling
- `src/core/chart-data-factory.ts`
  - natal, synastry, transit, composite, and return chart assembly
- `src/core/aspects/*`
  - aspect detection and aspect metadata
- `src/core/charts/*`
  - SVG chart rendering
- `src/core/report.ts`
  - text report generation
- `src/core/context-serializer.ts`
  - structured export for downstream consumers
- `src/core/sweph.ts`
  - TypeScript adapter around the generated Swiss Ephemeris wasm module

## Generated Files

Do not hand-edit generated outputs unless you are fixing the generator itself.

Generated files include:

- `src/generated/chart-assets.ts`
- `src/generated/sweph/constants.ts`
- `src/generated/sweph/emscripten/sweph.mjs`
- `src/generated/sweph/emscripten/sweph.wasm`

Relevant generators:

- `scripts/generate-chart-assets.mjs`
- `scripts/generate-sweph-constants.mjs`
- `scripts/build-sweph-wasm.sh`

## Upstream Parity Rules

This repository is parity-driven. Behavioral compatibility with the upstream Python implementation is a core requirement.

Non-negotiable expectations:

- do not replace the vendored Swiss Ephemeris runtime with npm `sweph`
- do not introduce a Python runtime dependency into the published package
- keep public calculations aligned with the vendored upstream versions
- update parity fixtures and tests when upstream logic changes
- treat silent numeric drift as a regression unless it is part of an explicit Swiss Ephemeris upgrade

Detailed sync policy and upstream SHA tracking live in `CLAUDE.md`.

## Safe Change Boundaries

Safe areas for routine work:

- documentation
- tests
- TypeScript logic that is already mapped to upstream Python modules
- packaging and build tooling

High-risk areas that require extra care:

- `src/core/sweph.ts`
- `scripts/build-sweph-wasm.sh`
- `assets/sweph/*`
- generated Emscripten output
- SVG chart rendering where exact output parity matters

## When Editing This Repo

- prefer Bun commands
- preserve upstream parity unless the task explicitly changes the parity target
- rebuild generated outputs after changing their generators
- run `bun run verify:full` before concluding substantive changes
- keep temporary repro folders and one-off build artifacts out of version control

## Release Checklist

Before publishing:

1. `bun run build`
2. `bun run verify`
3. `bun run test`
4. `bun run browser:check`
5. confirm `README.md`, `CLAUDE.md`, and this file still match the current repository behavior
