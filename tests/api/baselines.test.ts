import { readFileSync } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { postJson } from "../helpers/api";

const baselinesDir = path.join(process.cwd(), "vendor", "Astrologer-API", "tests", "baselines");

const LONDON_SUBJECT = {
  name: "Baseline Test London",
  year: 1980,
  month: 12,
  day: 12,
  hour: 12,
  minute: 12,
  longitude: 0,
  latitude: 51.4825766,
  city: "London",
  nation: "GB",
  timezone: "Europe/London",
};

const ROME_SUBJECT = {
  name: "Baseline Test Roma",
  year: 1946,
  month: 6,
  day: 16,
  hour: 10,
  minute: 10,
  longitude: 12.4963655,
  latitude: 41.9027835,
  city: "Roma",
  nation: "IT",
  timezone: "Europe/Rome",
};

const ROME_1990_SUBJECT = {
  name: "Baseline Test Roma 1990",
  year: 1990,
  month: 6,
  day: 15,
  hour: 14,
  minute: 30,
  longitude: 12.4964,
  latitude: 41.9028,
  city: "Rome",
  nation: "IT",
  timezone: "Europe/Rome",
};

const PARIS_SUBJECT = {
  name: "Baseline Test Paris",
  year: 1988,
  month: 3,
  day: 20,
  hour: 10,
  minute: 15,
  longitude: 2.3522,
  latitude: 48.8566,
  city: "Paris",
  nation: "FR",
  timezone: "Europe/Paris",
};

const TRANSIT_SUBJECT = {
  name: "Transit 2024",
  year: 2024,
  month: 6,
  day: 1,
  hour: 12,
  minute: 12,
  longitude: 0,
  latitude: 51.4825766,
  city: "London",
  nation: "GB",
  timezone: "Europe/London",
};

const MOON_PHASE_REQUEST = {
  year: 1993,
  month: 10,
  day: 10,
  hour: 12,
  minute: 12,
  second: 0,
  latitude: 51.5074,
  longitude: -0.1276,
  timezone: "Europe/London",
};

const SCENARIOS: Array<{ id: string; url: string; json: Record<string, unknown> }> = [
  { id: "subject_rome", url: "/api/v5/subject", json: { subject: ROME_SUBJECT } },
  { id: "subject_london", url: "/api/v5/subject", json: { subject: LONDON_SUBJECT } },
  {
    id: "subject_sidereal_lahiri",
    url: "/api/v5/subject",
    json: {
      subject: {
        ...ROME_1990_SUBJECT,
        zodiac_type: "Sidereal",
        sidereal_mode: "LAHIRI",
      },
    },
  },
  {
    id: "subject_whole_sign",
    url: "/api/v5/subject",
    json: {
      subject: {
        ...ROME_1990_SUBJECT,
        houses_system_identifier: "W",
      },
    },
  },
  { id: "now_subject", url: "/api/v5/now/subject", json: {} },
  { id: "chartdata_natal", url: "/api/v5/chart-data/birth-chart", json: { subject: LONDON_SUBJECT } },
  {
    id: "chartdata_synastry",
    url: "/api/v5/chart-data/synastry",
    json: { first_subject: LONDON_SUBJECT, second_subject: ROME_SUBJECT },
  },
  {
    id: "chartdata_composite",
    url: "/api/v5/chart-data/composite",
    json: { first_subject: LONDON_SUBJECT, second_subject: ROME_SUBJECT },
  },
  {
    id: "chartdata_transit",
    url: "/api/v5/chart-data/transit",
    json: { first_subject: LONDON_SUBJECT, transit_subject: TRANSIT_SUBJECT },
  },
  {
    id: "chartdata_solar_return_dual",
    url: "/api/v5/chart-data/solar-return",
    json: { subject: LONDON_SUBJECT, year: 2024, wheel_type: "dual" },
  },
  {
    id: "chartdata_solar_return_single",
    url: "/api/v5/chart-data/solar-return",
    json: { subject: LONDON_SUBJECT, year: 2024, wheel_type: "single" },
  },
  {
    id: "chartdata_lunar_return_dual",
    url: "/api/v5/chart-data/lunar-return",
    json: { subject: LONDON_SUBJECT, year: 2024, wheel_type: "dual" },
  },
  {
    id: "chartdata_lunar_return_single",
    url: "/api/v5/chart-data/lunar-return",
    json: { subject: LONDON_SUBJECT, year: 2024, wheel_type: "single" },
  },
  {
    id: "chartdata_natal_custom_points",
    url: "/api/v5/chart-data/birth-chart",
    json: {
      subject: ROME_1990_SUBJECT,
      active_points: ["Sun", "Moon", "Ascendant", "Spica", "Chiron"],
    },
  },
  {
    id: "chartdata_natal_pure_count",
    url: "/api/v5/chart-data/birth-chart",
    json: {
      subject: ROME_1990_SUBJECT,
      distribution_method: "pure_count",
    },
  },
  {
    id: "compatibility_score",
    url: "/api/v5/compatibility-score",
    json: { first_subject: ROME_SUBJECT, second_subject: ROME_SUBJECT },
  },
  { id: "chart_natal", url: "/api/v5/chart/birth-chart", json: { subject: LONDON_SUBJECT } },
  {
    id: "chart_synastry",
    url: "/api/v5/chart/synastry",
    json: { first_subject: LONDON_SUBJECT, second_subject: ROME_SUBJECT },
  },
  {
    id: "chart_composite",
    url: "/api/v5/chart/composite",
    json: { first_subject: LONDON_SUBJECT, second_subject: ROME_SUBJECT },
  },
  {
    id: "chart_transit",
    url: "/api/v5/chart/transit",
    json: { first_subject: LONDON_SUBJECT, transit_subject: TRANSIT_SUBJECT },
  },
  {
    id: "chart_solar_return",
    url: "/api/v5/chart/solar-return",
    json: { subject: LONDON_SUBJECT, year: 2024, wheel_type: "dual" },
  },
  {
    id: "chart_lunar_return",
    url: "/api/v5/chart/lunar-return",
    json: { subject: LONDON_SUBJECT, year: 2024, wheel_type: "single" },
  },
  { id: "now_chart", url: "/api/v5/now/chart", json: {} },
  { id: "context_subject", url: "/api/v5/context/subject", json: { subject: ROME_1990_SUBJECT } },
  { id: "context_natal", url: "/api/v5/context/birth-chart", json: { subject: ROME_1990_SUBJECT } },
  {
    id: "context_synastry",
    url: "/api/v5/context/synastry",
    json: { first_subject: ROME_1990_SUBJECT, second_subject: PARIS_SUBJECT },
  },
  {
    id: "context_composite",
    url: "/api/v5/context/composite",
    json: { first_subject: ROME_1990_SUBJECT, second_subject: PARIS_SUBJECT },
  },
  {
    id: "context_transit",
    url: "/api/v5/context/transit",
    json: {
      first_subject: ROME_1990_SUBJECT,
      transit_subject: {
        name: "Transit",
        year: 2024,
        month: 10,
        day: 27,
        hour: 12,
        minute: 0,
        city: "Rome",
        nation: "IT",
        longitude: 12.4964,
        latitude: 41.9028,
        timezone: "Europe/Rome",
      },
    },
  },
  {
    id: "context_solar_return",
    url: "/api/v5/context/solar-return",
    json: { subject: LONDON_SUBJECT, year: 2024, wheel_type: "dual" },
  },
  {
    id: "context_lunar_return",
    url: "/api/v5/context/lunar-return",
    json: { subject: LONDON_SUBJECT, year: 2024, month: 6, wheel_type: "single" },
  },
  { id: "now_context", url: "/api/v5/now/context", json: { name: "Now Context Baseline" } },
  { id: "moon_phase", url: "/api/v5/moon-phase", json: MOON_PHASE_REQUEST },
  { id: "moon_phase_now_utc", url: "/api/v5/moon-phase/now-utc", json: {} },
  { id: "moon_phase_context", url: "/api/v5/moon-phase/context", json: MOON_PHASE_REQUEST },
  { id: "moon_phase_now_utc_context", url: "/api/v5/moon-phase/now-utc/context", json: {} },
];

const NUMBER_REGEX = /-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi;
const NUMBER_TOLERANCE = 1e-4;

function compareNumeric(actual: number, expected: number): boolean {
  const delta = Math.abs(actual - expected);
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  return delta <= NUMBER_TOLERANCE || delta / scale <= NUMBER_TOLERANCE;
}

function compareSvgLine(expectedLine: string, actualLine: string): boolean {
  const expectedNumbers = [...expectedLine.matchAll(NUMBER_REGEX)].map(match => Number(match[0]));
  const actualNumbers = [...actualLine.matchAll(NUMBER_REGEX)].map(match => Number(match[0]));

  if (expectedNumbers.length !== actualNumbers.length) {
    return false;
  }

  for (let index = 0; index < expectedNumbers.length; index += 1) {
    if (!compareNumeric(actualNumbers[index]!, expectedNumbers[index]!)) {
      return false;
    }
  }

  const expectedText = expectedLine.replaceAll(NUMBER_REGEX, "NUM").trimEnd();
  const actualText = actualLine.replaceAll(NUMBER_REGEX, "NUM").trimEnd();
  return expectedText === actualText;
}

function compareSvg(expected: string, actual: string | null): boolean {
  if (actual == null) {
    return false;
  }

  const expectedLines = expected.split(/\r?\n/);
  const actualLines = actual.split(/\r?\n/);

  if (expectedLines.length !== actualLines.length) {
    return false;
  }

  return expectedLines.every((line, index) => compareSvgLine(line, actualLines[index]!));
}

function compareApiValue(actual: unknown, expected: unknown): boolean {
  if (actual == null && expected == null) {
    return true;
  }

  if (typeof actual === "number" && typeof expected === "number") {
    return compareNumeric(actual, expected);
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    return actual.length === expected.length && actual.every((entry, index) => compareApiValue(entry, expected[index]));
  }

  if (typeof actual === "object" && typeof expected === "object" && actual != null && expected != null) {
    const actualRecord = actual as Record<string, unknown>;
    const expectedRecord = expected as Record<string, unknown>;
    const keys = new Set([...Object.keys(actualRecord), ...Object.keys(expectedRecord)]);

    for (const key of keys) {
      const actualHasKey = key in actualRecord;
      const expectedHasKey = key in expectedRecord;
      const actualValue = actualRecord[key];
      const expectedValue = expectedRecord[key];

      if (!actualHasKey && expectedValue == null) {
        continue;
      }
      if (!expectedHasKey && actualValue == null) {
        continue;
      }
      if (!compareApiValue(actualValue, expectedValue)) {
        return false;
      }
    }

    return true;
  }

  return Object.is(actual, expected);
}

function loadBaselineJson(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(baselinesDir, `${id}.json`), "utf8")) as Record<string, unknown>;
}

function loadBaselineSvg(id: string): string | null {
  const svgPath = path.join(baselinesDir, `${id}.svg`);
  try {
    return readFileSync(svgPath, "utf8");
  }
  catch {
    return null;
  }
}

describe("astrologer API baselines", { timeout: 20_000 }, () => {
  beforeAll(() => {
    vi.useFakeTimers({
      now: new Date("2024-06-01T12:30:00.000Z"),
    });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it.each(SCENARIOS)("$id matches upstream baseline", async (scenario) => {
    const response = await postJson(scenario.url, scenario.json);
    const text = await response.text();

    expect(response.status).toBe(200);

    const actual = JSON.parse(text) as Record<string, unknown>;
    const expectedJson = loadBaselineJson(scenario.id);
    const expectedSvg = loadBaselineSvg(scenario.id);

    let actualSvg: string | null = null;
    let actualJson: Record<string, unknown> = actual;
    if (typeof actual.chart === "string") {
      actualSvg = actual.chart;
      const { chart: _chart, ...rest } = actual;
      actualJson = rest;
    }

    expect(compareApiValue(actualJson, expectedJson)).toBe(true);

    if (expectedSvg != null) {
      expect(compareSvg(expectedSvg, actualSvg)).toBe(true);
    }
    else {
      expect(actualSvg).toBeNull();
    }
  });
});
