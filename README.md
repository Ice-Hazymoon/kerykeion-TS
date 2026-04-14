# kerykeion-ts

TypeScript port of `Astrologer-API` and `kerykeion`, with two primary entry points:

- a reusable TypeScript library for natal charts, synastry, returns, reports, SVG charts, and moon phase calculations
- a source-built Swiss Ephemeris WASM runtime compiled from the vendored upstream C sources, so the package can run in browser and serverless JavaScript environments without Python or native addons

The GitHub repository also contains a Hono-based HTTP API used for local parity work, but the published npm package ships only the core library runtime. The repository intentionally keeps vendored upstream snapshots under `vendor/` for auditability and parity work. The npm package excludes both the vendor mirrors and the API server code, and ships only the built core runtime plus the public Swiss Ephemeris data files.

## Requirements

- Bun `>= 1.3`
- macOS / Linux / Windows environment that can load the bundled Swiss Ephemeris data in [`assets/sweph`](./assets/sweph)

## Install

```bash
bun add kerykeion-ts
```

If you are working from this repository instead of the published package, use `bun install`.

The packaged runtime does not require Python at runtime. Python is only used by the parity test suite that compares the Bun/TypeScript implementation against the upstream Python projects.

## Repository commands

```bash
# start the repository-local API server
bun run dev

# lint
bun run lint

# type check
bun run typecheck

# check for unused files and dependencies
bun run check:unused

# run the parity and regression test suite
bun run test

# run the publish-facing checks
bun run verify

# build the npm-ready dist/ output and regenerate generated assets
bun run build
```

## Build output

`bun run build` does four things:

1. regenerates chart assets
2. regenerates Swiss Ephemeris constants from vendored `libswe` headers
3. rebuilds the single-file Swiss Ephemeris WASM runtime
4. emits the publishable `dist/` package contents

The published package is Bun-first and ships ESM JavaScript plus `.d.ts` declarations from `dist/`.

## Repository-only API server

The Hono API remains in this repository for local development and parity testing. It is not exported from the published `kerykeion-ts` npm package.

```bash
bun run src/server.ts
```

The default server URL is:

```text
http://localhost:3000
```

Quick health check:

```bash
curl http://localhost:3000/health
```

## TypeScript usage

### Create a subject and natal chart data

```ts
import {
  AstrologicalSubjectFactory,
  ChartDataFactory,
  ReportGenerator,
} from "kerykeion-ts";

const subject = await AstrologicalSubjectFactory.fromBirthData({
  name: "Ada Lovelace",
  year: 1815,
  month: 12,
  day: 10,
  hour: 13,
  minute: 45,
  city: "London",
  nation: "GB",
  lng: -0.1276,
  lat: 51.5072,
  tz_str: "Europe/London",
  online: false,
  zodiac_type: "Tropical",
  houses_system_identifier: "P",
  perspective_type: "Apparent Geocentric",
  suppress_geonames_warning: true,
});

const chartData = ChartDataFactory.createNatalChartData(subject);

console.log(chartData.chart_type); // "Natal"
console.log(chartData.subject.sun.sign);
console.log(new ReportGenerator(chartData).generate_report());
```

### Generate an SVG chart

```ts
import {
  AstrologicalSubjectFactory,
  ChartDataFactory,
  ChartDrawer,
} from "kerykeion-ts";

const subject = await AstrologicalSubjectFactory.fromBirthData({
  name: "Alan Turing",
  year: 1912,
  month: 6,
  day: 23,
  hour: 14,
  minute: 0,
  city: "London",
  nation: "GB",
  lng: -0.1276,
  lat: 51.5072,
  tz_str: "Europe/London",
  online: false,
  suppress_geonames_warning: true,
});

const chartData = ChartDataFactory.createNatalChartData(subject);
const drawer = new ChartDrawer(chartData, {
  theme: "classic",
  chart_language: "EN",
  style: "modern",
  show_zodiac_background_ring: true,
});

const svg = drawer.generate_svg_string(false, false, {
  custom_title: "Alan Turing",
  style: "modern",
});

await Bun.write("./alan-turing-chart.svg", svg);
```

### Browser or serverless usage

The published package embeds the Swiss Ephemeris WASM/data bundle into a single generated ESM module. That means:

- no `python`, `pip`, or native `sweph` package is required at runtime
- no dynamic filesystem access is required for the ephemeris core in browser/serverless deployments
- Node/Bun-only features such as writing SVG files or shelling out to `scour` stay behind runtime checks

```ts
import { AstrologicalSubjectFactory } from "kerykeion-ts";

const subject = await AstrologicalSubjectFactory.fromBirthData({
  name: "Browser Example",
  year: 1990,
  month: 6,
  day: 15,
  hour: 14,
  minute: 30,
  city: "Rome",
  nation: "IT",
  lng: 12.4964,
  lat: 41.9028,
  tz_str: "Europe/Rome",
  online: false,
  suppress_geonames_warning: true,
});

console.log(subject.sun.abs_pos);
```

For serverless handlers, import the core factories directly and build your own handler around them.

## Upstream sync

The repository keeps a parity map and sync checklist in [`claude.md`](./claude.md). That file records:

- the exact upstream SHAs last audited
- the mapping between local TypeScript modules and upstream Python/C files
- the difference between "keep parity with kerykeion" updates and "intentionally upgrade Swiss Ephemeris" updates
- the release checklist that must pass before publishing

The `vendor/` directories are committed source snapshots, not nested git repositories. That is intentional: it keeps the main repository self-contained, reviewable, and publishable without submodules or embedded `.git` metadata.

To refresh the vendored snapshots from upstream:

```bash
# refresh all vendored upstream snapshots using the refs recorded in vendor/upstream-sources.json
bun run sync:vendors

# preview what would be synced without touching the working tree
bun run sync:vendors -- --dry-run

# update only one vendor
bun run sync:vendors -- --vendor=kerykeion

# override a specific ref during sync
bun run sync:vendors -- --vendor=pyswisseph-source --pyswisseph-ref=v2.10.03.2
```

After any sync, run:

```bash
bun run build
bun run verify:full
```

## Repository-only HTTP API examples

These examples target the local Hono server from this repository. They are not part of the published npm surface.

### Build a subject

```bash
curl -X POST http://localhost:3000/api/v5/subject \
  -H 'content-type: application/json' \
  -d '{
    "subject": {
      "name": "Ada Lovelace",
      "year": 1815,
      "month": 12,
      "day": 10,
      "hour": 13,
      "minute": 45,
      "second": 0,
      "city": "London",
      "nation": "GB",
      "longitude": -0.1276,
      "latitude": 51.5072,
      "timezone": "Europe/London",
      "zodiac_type": "Tropical",
      "houses_system_identifier": "P",
      "perspective_type": "Apparent Geocentric"
    }
  }'
```

### Get birth chart data

```bash
curl -X POST http://localhost:3000/api/v5/chart-data/birth-chart \
  -H 'content-type: application/json' \
  -d '{
    "subject": {
      "name": "Alan Turing",
      "year": 1912,
      "month": 6,
      "day": 23,
      "hour": 14,
      "minute": 0,
      "second": 0,
      "city": "London",
      "nation": "GB",
      "longitude": -0.1276,
      "latitude": 51.5072,
      "timezone": "Europe/London",
      "zodiac_type": "Tropical",
      "houses_system_identifier": "P",
      "perspective_type": "Apparent Geocentric"
    }
  }'
```

### Get current UTC moon phase

```bash
curl -X POST http://localhost:3000/api/v5/moon-phase/now-utc \
  -H 'content-type: application/json' \
  -d '{
    "using_default_location": true,
    "location_precision": 0
  }'
```

## Repository-only API routes

Common endpoints exposed by the local Hono server:

- `GET /health`
- `POST /api/v5/subject`
- `POST /api/v5/now/subject`
- `POST /api/v5/chart-data/birth-chart`
- `POST /api/v5/chart-data/synastry`
- `POST /api/v5/chart-data/composite`
- `POST /api/v5/chart-data/transit`
- `POST /api/v5/chart-data/solar-return`
- `POST /api/v5/chart-data/lunar-return`
- `POST /api/v5/context/*`
- `POST /api/v5/moon-phase`
- `POST /api/v5/moon-phase/context`
- `POST /api/v5/moon-phase/now-utc`
- `POST /api/v5/compatibility-score`

## Notes

- For deterministic results, prefer explicit coordinates and timezone over GeoNames lookups.
- The API and the TypeScript library share the same calculation core, so the returned chart data structures are aligned.
- The test suite compares TypeScript results against the Python reference implementation and should stay green before publishing.

## License

This project is distributed under `AGPL-3.0-only`, matching the upstream licensing constraints of `kerykeion`, `Astrologer-API`, and the AGPL distribution path of Swiss Ephemeris used here. The top-level [`LICENSE`](./LICENSE) file applies to this repository; vendored upstream source trees keep their original notices as well.
