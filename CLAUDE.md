# Upstream Sync Guide

This repository is a Bun-first TypeScript port of two upstream codebases:

- `vendor/kerykeion`: `g-battaglia/kerykeion` at `fb753abecc11a1e863edb2db14e3635da11e0a08`
- `vendor/pyswisseph-source`: `pyswisseph 2.10.03.2`, which embeds `libswe 2.10.3`

`aloistr/swisseph` was last audited at `b51a083390bf3cdc93a6ba466cbc83b846c4cfc4`, but the runtime parity target of this project is the Swiss Ephemeris version that `kerykeion 5.12.7` actually uses, not raw `swisseph` HEAD.

The default vendor refs live in `vendor/upstream-sources.json`. Refreshing vendored snapshots should go through:

- `bun run sync:vendors`
- `bun run sync:vendors -- --dry-run`
- `bun run sync:vendors -- --vendor=kerykeion`

## Source-of-truth mapping

The local TypeScript modules intentionally mirror the upstream Python/C structure:

- `src/core/astrological-subject-factory.ts`
  - `vendor/kerykeion/kerykeion/astrological_subject_factory.py`
- `src/core/planetary-return-factory.ts`
  - `vendor/kerykeion/kerykeion/planetary_return_factory.py`
- `src/core/moon-phase-details/*`
  - `vendor/kerykeion/kerykeion/moon_phase_details/*`
- `src/core/aspects/*`
  - `vendor/kerykeion/kerykeion/aspects/*`
- `src/core/charts/*`
  - `vendor/kerykeion/kerykeion/charts/*`
- `src/core/report.ts`
  - `vendor/kerykeion/kerykeion/report.py`
- `src/core/sweph.ts`
  - `vendor/pyswisseph-source/wasm-wrapper.c`
  - `vendor/pyswisseph-source/libswe/*`
- `scripts/generate-sweph-constants.mjs`
  - `vendor/pyswisseph-source/libswe/sweodef.h`
  - `vendor/pyswisseph-source/libswe/swephexp.h`
  - `vendor/pyswisseph-source/libswe/sweph.h`

## Non-negotiable invariants

- Runtime must never depend on npm `sweph` or on a Python wrapper.
- Swiss Ephemeris constants must be generated from vendored `libswe` headers.
- Swiss Ephemeris runtime must be built from vendored C sources into WASM.
- SVG parity tests must stay exact-string compatible with upstream Python output.
- Text/context/report parity must stay exact-string compatible with upstream Python output.
- Numeric runtime parity must stay within the existing WASM tolerance envelope.
- `vendor/` is committed source, not a local-only clone. Nested `.git` directories must stay removed.

## Sync lanes

There are two valid update lanes. Do not mix them by accident.

### Lane 1: parity with `kerykeion`

Use this lane when upstream `kerykeion` changes and you want the TypeScript port to stay behaviorally identical.

1. Refresh `vendor/kerykeion` from upstream.
2. Check whether `vendor/kerykeion/pyproject.toml` changed its `pyswisseph` version.
3. If the `pyswisseph` version changed, update `vendor/pyswisseph-source` to the matching version before touching `libswe`.
4. Run:
   - `bun run build`
   - `bun run refresh:report-fixtures`
5. Re-run:
   - `bun run verify:full`
6. If parity fails, fix the TypeScript port before changing tolerances or baselines.

### Lane 2: intentional Swiss Ephemeris upgrade

Use this lane only when you explicitly want to move beyond the Swiss Ephemeris version pinned by `kerykeion`.

1. Update `vendor/pyswisseph-source/libswe/*` from `aloistr/swisseph`.
2. Keep `vendor/pyswisseph-source/wasm-wrapper.c` and packaging glue intact unless the C API changed.
3. Rebuild:
   - `bun run build`
4. Re-run the full parity suite.
5. Expect numeric drift. If drift appears, treat it as a version migration, not a silent bugfix.
6. Document the new Swiss Ephemeris version and audit SHA in this file.

## Practical sync checklist

- Remove nested upstream metadata after every refresh:
  - `vendor/**/.git`
  - `vendor/**/.vscode`
- Do not hand-edit generated files unless you are fixing the generator:
  - `src/generated/chart-assets.ts`
  - `src/generated/sweph/constants.ts`
  - `src/generated/sweph/emscripten/sweph.mjs`
- Keep the Python parity tests using the vendored upstreams, not PyPI or npm packages.
- If `kerykeion` adds a new public function, add the TypeScript port and a parity test in the same change.

## Release checklist

Before tagging or publishing:

1. `bun run build`
2. `bun run verify`
3. `bun run test`
4. Smoke-check browser bundling:
   - `bun run browser:check`
5. Confirm `README.md`, `LICENSE`, and this file still describe the current upstream SHAs and version targets.
