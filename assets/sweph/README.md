# Swiss Ephemeris data

This directory contains the public Swiss Ephemeris data files bundled with the package:

- `sepl_18.se1`
- `semo_18.se1`

They are used for parity with the vendored `kerykeion` and `Astrologer-API` upstreams and are embedded into the generated WASM runtime during `bun run build`.

Source lineage:

- Swiss Ephemeris C sources: `vendor/pyswisseph-source/libswe/*`
- Generated WASM module: `src/generated/sweph/emscripten/sweph.mjs`

Keep this folder in the published package because `src/core/paths.ts` exposes these paths as part of the public compatibility surface.
