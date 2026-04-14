import { describe, expect, it } from "vitest";

import {
  ALL_ACTIVE_ASPECTS,
  ALL_ACTIVE_POINTS,
  AstrologicalSubjectFactory,
  ChartDataFactory,
  ReportGenerator,
  toContext,
} from "../../src/index";
import { normalizeMultilineText, runPython } from "../helpers/python-parity";

const PYTHON_TEXT_PARITY_SCRIPT = `
import sys

from kerykeion import AstrologicalSubjectFactory, ChartDataFactory, ReportGenerator, to_context
from kerykeion.settings.config_constants import ALL_ACTIVE_ASPECTS, ALL_ACTIVE_POINTS


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
        active_points=list(ALL_ACTIVE_POINTS),
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
        active_points=list(ALL_ACTIVE_POINTS),
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
        active_points=list(ALL_ACTIVE_POINTS),
    )
    params.update(kwargs)
    return AstrologicalSubjectFactory.from_birth_data(**params)


case = sys.argv[1]

if case == "context_subject":
    print(to_context(make_rome()), end="")
elif case == "context_synastry_chart":
    chart = ChartDataFactory.create_synastry_chart_data(
        make_london(),
        make_paris(),
        active_aspects=list(ALL_ACTIVE_ASPECTS),
    )
    print(to_context(chart), end="")
elif case == "report_natal_chart":
    chart = ChartDataFactory.create_natal_chart_data(
        make_rome(),
        active_aspects=list(ALL_ACTIVE_ASPECTS),
    )
    print(ReportGenerator(chart).generate_report(), end="")
elif case == "report_synastry_chart":
    chart = ChartDataFactory.create_synastry_chart_data(
        make_london(),
        make_paris(),
        active_aspects=list(ALL_ACTIVE_ASPECTS),
    )
    print(ReportGenerator(chart).generate_report(), end="")
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
    active_points: ALL_ACTIVE_POINTS,
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
    active_points: ALL_ACTIVE_POINTS,
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
    active_points: ALL_ACTIVE_POINTS,
  });
}

const textCases: Array<{
  name: string;
  getTsValue: () => Promise<string>;
}> = [
  {
    name: "context_subject",
    getTsValue: async () => toContext(await makeRome()),
  },
  {
    name: "context_synastry_chart",
    getTsValue: async () =>
      toContext(ChartDataFactory.createSynastryChartData(await makeLondon(), await makeParis(), null, ALL_ACTIVE_ASPECTS)),
  },
  {
    name: "report_natal_chart",
    getTsValue: async () =>
      new ReportGenerator(ChartDataFactory.createNatalChartData(await makeRome(), null, ALL_ACTIVE_ASPECTS)).generate_report(),
  },
  {
    name: "report_synastry_chart",
    getTsValue: async () =>
      new ReportGenerator(
        ChartDataFactory.createSynastryChartData(await makeLondon(), await makeParis(), null, ALL_ACTIVE_ASPECTS),
      ).generate_report(),
  },
];

describe("python text parity", () => {
  it.each(textCases)("$name matches Python exactly", async ({ name, getTsValue }) => {
    const pythonValue = normalizeMultilineText(runPython(PYTHON_TEXT_PARITY_SCRIPT, [name]));
    const tsValue = normalizeMultilineText(await getTsValue());
    expect(tsValue).toBe(pythonValue);
  });
});
