import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  AstrologicalSubjectFactory,
  ChartDataFactory,
  ChartDrawer,
} from "../../src/index";
import { normalizeMultilineText, runPython } from "../helpers/python-parity";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeSvgNumber(raw: string): string {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return raw;
  }
  if (Object.is(parsed, -0) || Math.abs(parsed) < 1e-12) {
    return "0";
  }
  return Number(parsed.toFixed(9)).toString();
}

function canonicalizeSvg(value: string): string {
  return normalizeMultilineText(value).replace(/-?(?:\d+\.\d+|\d+|\.\d+)(?:e[+-]?\d+)?/gi, normalizeSvgNumber);
}

const PYTHON_SVG_PARITY_SCRIPT = `
import sys

from kerykeion import AstrologicalSubjectFactory, ChartDataFactory, ChartDrawer


def make_rome(**kwargs):
    params = dict(
        name="Parity Rome",
        year=1990,
        month=6,
        day=15,
        hour=14,
        minute=30,
        city="Rome",
        nation="IT",
        lng=12.4964,
        lat=41.9028,
        tz_str="Europe/Rome",
        online=False,
        suppress_geonames_warning=True,
    )
    params.update(kwargs)
    return AstrologicalSubjectFactory.from_birth_data(**params)


def make_london(**kwargs):
    params = dict(
        name="Parity London",
        year=1980,
        month=12,
        day=12,
        hour=12,
        minute=12,
        city="London",
        nation="GB",
        lng=0.0,
        lat=51.4825766,
        tz_str="Europe/London",
        online=False,
        suppress_geonames_warning=True,
    )
    params.update(kwargs)
    return AstrologicalSubjectFactory.from_birth_data(**params)


def make_paris(**kwargs):
    params = dict(
        name="Parity Paris",
        year=1988,
        month=3,
        day=20,
        hour=10,
        minute=15,
        city="Paris",
        nation="FR",
        lng=2.3522,
        lat=48.8566,
        tz_str="Europe/Paris",
        online=False,
        suppress_geonames_warning=True,
    )
    params.update(kwargs)
    return AstrologicalSubjectFactory.from_birth_data(**params)


def make_transit(**kwargs):
    params = dict(
        name="Parity Transit",
        year=2024,
        month=6,
        day=1,
        hour=12,
        minute=12,
        city="London",
        nation="GB",
        lng=0.0,
        lat=51.4825766,
        tz_str="Europe/London",
        online=False,
        suppress_geonames_warning=True,
    )
    params.update(kwargs)
    return AstrologicalSubjectFactory.from_birth_data(**params)


case = sys.argv[1]

if case == "natal_svg":
    chart = ChartDataFactory.create_natal_chart_data(make_rome())
    print(ChartDrawer(chart).generate_svg_string(minify=True, remove_css_variables=True), end="")
elif case == "natal_wheel_only_svg":
    chart = ChartDataFactory.create_natal_chart_data(make_rome())
    print(ChartDrawer(chart).generate_wheel_only_svg_string(minify=True, remove_css_variables=True), end="")
elif case == "natal_aspect_grid_svg":
    chart = ChartDataFactory.create_natal_chart_data(make_rome())
    print(ChartDrawer(chart).generate_aspect_grid_only_svg_string(minify=True, remove_css_variables=True), end="")
elif case == "synastry_svg":
    chart = ChartDataFactory.create_synastry_chart_data(make_london(), make_paris())
    print(ChartDrawer(chart).generate_svg_string(minify=True, remove_css_variables=True), end="")
elif case == "transit_svg":
    chart = ChartDataFactory.create_transit_chart_data(make_london(), make_transit())
    print(ChartDrawer(chart).generate_svg_string(minify=True, remove_css_variables=True), end="")
else:
    raise SystemExit(f"Unknown case: {case}")
`.trim();

async function makeRome() {
  return AstrologicalSubjectFactory.fromBirthData({
    name: "Parity Rome",
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
}

async function makeLondon() {
  return AstrologicalSubjectFactory.fromBirthData({
    name: "Parity London",
    year: 1980,
    month: 12,
    day: 12,
    hour: 12,
    minute: 12,
    city: "London",
    nation: "GB",
    lng: 0.0,
    lat: 51.4825766,
    tz_str: "Europe/London",
    online: false,
    suppress_geonames_warning: true,
  });
}

async function makeParis() {
  return AstrologicalSubjectFactory.fromBirthData({
    name: "Parity Paris",
    year: 1988,
    month: 3,
    day: 20,
    hour: 10,
    minute: 15,
    city: "Paris",
    nation: "FR",
    lng: 2.3522,
    lat: 48.8566,
    tz_str: "Europe/Paris",
    online: false,
    suppress_geonames_warning: true,
  });
}

async function makeTransit() {
  return AstrologicalSubjectFactory.fromBirthData({
    name: "Parity Transit",
    year: 2024,
    month: 6,
    day: 1,
    hour: 12,
    minute: 12,
    city: "London",
    nation: "GB",
    lng: 0.0,
    lat: 51.4825766,
    tz_str: "Europe/London",
    online: false,
    suppress_geonames_warning: true,
  });
}

const svgCases: Array<{
  name: string;
  getTsValue: () => Promise<string>;
}> = [
  {
    name: "natal_svg",
    getTsValue: async () =>
      new ChartDrawer(ChartDataFactory.createNatalChartData(await makeRome())).generate_svg_string(true, true),
  },
  {
    name: "natal_wheel_only_svg",
    getTsValue: async () =>
      new ChartDrawer(ChartDataFactory.createNatalChartData(await makeRome())).generate_wheel_only_svg_string(true, true),
  },
  {
    name: "natal_aspect_grid_svg",
    getTsValue: async () =>
      new ChartDrawer(ChartDataFactory.createNatalChartData(await makeRome())).generate_aspect_grid_only_svg_string(
        true,
        true,
      ),
  },
  {
    name: "synastry_svg",
    getTsValue: async () =>
      new ChartDrawer(ChartDataFactory.createSynastryChartData(await makeLondon(), await makeParis())).generate_svg_string(
        true,
        true,
      ),
  },
  {
    name: "transit_svg",
    getTsValue: async () =>
      new ChartDrawer(ChartDataFactory.createTransitChartData(await makeLondon(), await makeTransit())).generate_svg_string(
        true,
        true,
      ),
  },
];

describe("python SVG parity", () => {
  it.each(svgCases)("$name matches Python exactly", async ({ name, getTsValue }) => {
    const pythonValue = canonicalizeSvg(runPython(PYTHON_SVG_PARITY_SCRIPT, [name]));
    const tsValue = canonicalizeSvg(await getTsValue());
    expect({
      length: tsValue.length,
      sha256: sha256(tsValue),
    }).toEqual({
      length: pythonValue.length,
      sha256: sha256(pythonValue),
    });
  });
});
