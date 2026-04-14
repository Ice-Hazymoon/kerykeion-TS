import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { createApp } from "../src/api/app.ts";

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

const SCENARIOS = [
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
  { id: "moon_phase_now_utc", url: "/api/v5/now/moon-phase", json: {} },
  { id: "moon_phase_context", url: "/api/v5/context/moon-phase", json: MOON_PHASE_REQUEST },
  { id: "moon_phase_now_utc_context", url: "/api/v5/now/context/moon-phase", json: {} },
];

function installFixedDate(isoString) {
  const fixedDate = new Date(isoString);
  const RealDate = Date;

  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(args.length === 0 ? fixedDate : args[0], ...args.slice(1));
      return new RealDate(...(args.length === 0 ? [fixedDate] : args));
    }

    static now() {
      return fixedDate.getTime();
    }

    static parse(value) {
      return RealDate.parse(value);
    }

    static UTC(...args) {
      return RealDate.UTC(...args);
    }
  };

  return () => {
    globalThis.Date = RealDate;
  };
}

async function postJson(url, payload) {
  const app = createApp();
  return app.request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

mkdirSync(baselinesDir, { recursive: true });
const restoreDate = installFixedDate("2024-06-01T12:30:00.000Z");

try {
  for (const scenario of SCENARIOS) {
    const response = await postJson(scenario.url, scenario.json);
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${scenario.id} failed with ${response.status}: ${text}`);
    }

    const json = JSON.parse(text);
    const jsonPath = path.join(baselinesDir, `${scenario.id}.json`);
    const svgPath = path.join(baselinesDir, `${scenario.id}.svg`);

    if (typeof json.chart === "string") {
      const { chart, ...rest } = json;
      writeFileSync(jsonPath, `${JSON.stringify(rest, null, 2)}\n`, "utf8");
      writeFileSync(svgPath, chart, "utf8");
    }
    else {
      writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
      rmSync(svgPath, { force: true });
    }
  }
}
finally {
  restoreDate();
}
