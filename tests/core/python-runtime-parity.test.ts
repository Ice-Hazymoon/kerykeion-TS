import { describe, expect, it } from "vitest";

import {
  ALL_ACTIVE_ASPECTS,
  ALL_ACTIVE_POINTS,
  AspectsFactory,
  AstrologicalSubjectFactory,
  ChartDataFactory,
  CompositeSubjectFactory,
  EphemerisDataFactory,
  HouseComparisonFactory,
  MoonPhaseDetailsFactory,
  PlanetaryReturnFactory,
  RelationshipScoreFactory,
  TransitsTimeRangeFactory,
} from "../../src/index";
import { runPythonJson, toPythonModelJson } from "../helpers/python-parity";

const WASM_NUMERIC_TOLERANCE = 5e-6;

function expectPythonParity(actual: unknown, expected: unknown, path = "$"): void {
  if (typeof actual === "number" && typeof expected === "number") {
    expect(Math.abs(actual - expected), `${path} differs`).toBeLessThanOrEqual(WASM_NUMERIC_TOLERANCE);
    return;
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    expect(actual.length, `${path}.length differs`).toBe(expected.length);
    for (const [index, value] of actual.entries()) {
      expectPythonParity(value, expected[index], `${path}[${index}]`);
    }
    return;
  }

  if (actual && expected && typeof actual === "object" && typeof expected === "object") {
    const actualRecord = actual as Record<string, unknown>;
    const expectedRecord = expected as Record<string, unknown>;
    expect(Object.keys(actualRecord).sort(), `${path} keys differ`).toEqual(Object.keys(expectedRecord).sort());
    for (const key of Object.keys(actualRecord)) {
      expectPythonParity(actualRecord[key], expectedRecord[key], `${path}.${key}`);
    }
    return;
  }

  expect(actual, `${path} differs`).toEqual(expected);
}

const PYTHON_RUNTIME_JSON_SCRIPT = `
import json
import sys
from datetime import datetime

from kerykeion import (
    AspectsFactory,
    AstrologicalSubjectFactory,
    ChartDataFactory,
    CompositeSubjectFactory,
    EphemerisDataFactory,
    HouseComparisonFactory,
    MoonPhaseDetailsFactory,
    PlanetaryReturnFactory,
    RelationshipScoreFactory,
    TransitsTimeRangeFactory,
)
from kerykeion.settings.config_constants import ALL_ACTIVE_ASPECTS, ALL_ACTIVE_POINTS


def to_data(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json")
    if isinstance(obj, dict):
        return {key: to_data(value) for key, value in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_data(item) for item in obj]
    return obj


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
        active_points=list(ALL_ACTIVE_POINTS),
    )
    params.update(kwargs)
    return AstrologicalSubjectFactory.from_birth_data(**params)


def planetary_return(subject, return_type, year=None, month=None):
    factory = PlanetaryReturnFactory(
        subject,
        city=subject.city,
        nation=subject.nation,
        lat=subject.lat,
        lng=subject.lng,
        tz_str=subject.tz_str,
        online=False,
    )
    if year is not None and month is not None:
        return factory.next_return_from_month_and_year(year, month, return_type)
    if year is not None:
        return factory.next_return_from_year(year, return_type)
    return factory.next_return_from_iso_formatted_time(subject.iso_formatted_local_datetime, return_type)


def emit(value):
    print(json.dumps(to_data(value), sort_keys=True, ensure_ascii=False))


def resolve_case(case):
    if case == "subject_tropical_all_points":
        return make_rome()
    if case == "subject_sidereal_lahiri_all_points":
        return make_rome(zodiac_type="Sidereal", sidereal_mode="LAHIRI")
    if case == "subject_topocentric_all_points":
        return make_rome(perspective_type="Topocentric")
    if case == "natal_chart_all_points_all_aspects":
        return ChartDataFactory.create_natal_chart_data(make_rome(), active_aspects=list(ALL_ACTIVE_ASPECTS))
    if case == "synastry_chart_all_points_all_aspects":
        return ChartDataFactory.create_synastry_chart_data(
            make_london(),
            make_paris(),
            active_aspects=list(ALL_ACTIVE_ASPECTS),
        )
    if case == "composite_chart_all_points_all_aspects":
        composite = CompositeSubjectFactory(
            make_london(),
            make_paris(),
            "Parity Composite",
        ).get_midpoint_composite_subject_model()
        return ChartDataFactory.create_composite_chart_data(composite, active_aspects=list(ALL_ACTIVE_ASPECTS))
    if case == "transit_chart_all_points_all_aspects":
        return ChartDataFactory.create_transit_chart_data(
            make_london(),
            make_transit(),
            active_aspects=list(ALL_ACTIVE_ASPECTS),
        )
    if case == "natal_aspects_all_points_all_aspects":
        return AspectsFactory.single_chart_aspects(make_rome(), active_aspects=list(ALL_ACTIVE_ASPECTS))
    if case == "synastry_aspects_all_points_all_aspects":
        return AspectsFactory.dual_chart_aspects(
            make_london(),
            make_paris(),
            active_aspects=list(ALL_ACTIVE_ASPECTS),
        )
    if case == "relationship_score":
        return RelationshipScoreFactory(make_london(), make_paris()).get_relationship_score()
    if case == "house_comparison":
        return HouseComparisonFactory(make_london(), make_paris(), list(ALL_ACTIVE_POINTS)).get_house_comparison()
    if case == "moon_phase_overview":
        return MoonPhaseDetailsFactory.from_subject(make_london())
    if case == "solar_return":
        return planetary_return(make_rome(), "Solar", year=2024)
    if case == "lunar_return":
        return planetary_return(make_rome(), "Lunar", year=2024, month=6)
    if case == "ephemeris_subjects":
        factory = EphemerisDataFactory(
            start_datetime=datetime(2024, 1, 1, 0, 0, 0),
            end_datetime=datetime(2024, 1, 3, 0, 0, 0),
            step_type="days",
            step=1,
            lat=41.9028,
            lng=12.4964,
            tz_str="Europe/Rome",
        )
        return factory.get_ephemeris_data_as_astrological_subjects()
    if case == "transit_moments":
        factory = EphemerisDataFactory(
            start_datetime=datetime(2024, 1, 1, 0, 0, 0),
            end_datetime=datetime(2024, 1, 3, 0, 0, 0),
            step_type="days",
            step=1,
            lat=41.9028,
            lng=12.4964,
            tz_str="Europe/Rome",
        )
        eph = factory.get_ephemeris_data_as_astrological_subjects()
        return TransitsTimeRangeFactory(
            make_london(),
            eph,
            active_points=list(ALL_ACTIVE_POINTS),
            active_aspects=list(ALL_ACTIVE_ASPECTS),
        ).get_transit_moments()
    raise SystemExit(f"Unknown case: {case}")

case = sys.argv[1]

if case == "__all__":
    cases = [
        "subject_tropical_all_points",
        "subject_sidereal_lahiri_all_points",
        "subject_topocentric_all_points",
        "natal_chart_all_points_all_aspects",
        "synastry_chart_all_points_all_aspects",
        "composite_chart_all_points_all_aspects",
        "transit_chart_all_points_all_aspects",
        "natal_aspects_all_points_all_aspects",
        "synastry_aspects_all_points_all_aspects",
        "relationship_score",
        "house_comparison",
        "moon_phase_overview",
        "solar_return",
        "lunar_return",
        "ephemeris_subjects",
        "transit_moments",
    ]
    emit({key: resolve_case(key) for key in cases})
else:
    emit(resolve_case(case))
`.trim();

const pythonRuntimeSnapshots = runPythonJson<Record<string, unknown>>(PYTHON_RUNTIME_JSON_SCRIPT, ["__all__"]);

async function makeRome(overrides: Partial<Parameters<typeof AstrologicalSubjectFactory.fromBirthData>[0]> = {}) {
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
    ...overrides,
  });
}

async function makeLondon(overrides: Partial<Parameters<typeof AstrologicalSubjectFactory.fromBirthData>[0]> = {}) {
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
    ...overrides,
  });
}

async function makeParis(overrides: Partial<Parameters<typeof AstrologicalSubjectFactory.fromBirthData>[0]> = {}) {
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
    ...overrides,
  });
}

async function makeTransit(overrides: Partial<Parameters<typeof AstrologicalSubjectFactory.fromBirthData>[0]> = {}) {
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
    active_points: ALL_ACTIVE_POINTS,
    ...overrides,
  });
}

async function makePlanetaryReturn(
  subject: Awaited<ReturnType<typeof makeLondon>>,
  returnType: "Solar" | "Lunar",
  year?: number,
  month?: number,
) {
  const factory = new PlanetaryReturnFactory(subject, {
    city: subject.city ?? undefined,
    nation: subject.nation ?? undefined,
    lat: subject.lat ?? undefined,
    lng: subject.lng ?? undefined,
    tz_str: subject.tz_str ?? undefined,
    online: false,
  });
  if (year != null && month != null) {
    return factory.nextReturnFromMonthAndYear(year, month, returnType);
  }
  if (year != null) {
    return factory.nextReturnFromYear(year, returnType);
  }
  return factory.nextReturnFromIsoFormattedTime(subject.iso_formatted_local_datetime, returnType);
}

const parityCases: Array<{
  name: string;
  getTsValue: () => Promise<unknown>;
}> = [
  {
    name: "subject_tropical_all_points",
    getTsValue: async () => makeRome(),
  },
  {
    name: "subject_sidereal_lahiri_all_points",
    getTsValue: async () => makeRome({ zodiac_type: "Sidereal", sidereal_mode: "LAHIRI" }),
  },
  {
    name: "subject_topocentric_all_points",
    getTsValue: async () => makeRome({ perspective_type: "Topocentric" }),
  },
  {
    name: "natal_chart_all_points_all_aspects",
    getTsValue: async () => ChartDataFactory.createNatalChartData(await makeRome(), null, ALL_ACTIVE_ASPECTS),
  },
  {
    name: "synastry_chart_all_points_all_aspects",
    getTsValue: async () => ChartDataFactory.createSynastryChartData(await makeLondon(), await makeParis(), null, ALL_ACTIVE_ASPECTS),
  },
  {
    name: "composite_chart_all_points_all_aspects",
    getTsValue: async () => {
      const composite = new CompositeSubjectFactory(await makeLondon(), await makeParis(), "Parity Composite")
        .getMidpointCompositeSubjectModel();
      return ChartDataFactory.createCompositeChartData(composite, null, ALL_ACTIVE_ASPECTS);
    },
  },
  {
    name: "transit_chart_all_points_all_aspects",
    getTsValue: async () => ChartDataFactory.createTransitChartData(await makeLondon(), await makeTransit(), null, ALL_ACTIVE_ASPECTS),
  },
  {
    name: "natal_aspects_all_points_all_aspects",
    getTsValue: async () =>
      AspectsFactory.singleChartAspects(await makeRome(), {
        active_aspects: ALL_ACTIVE_ASPECTS,
      }),
  },
  {
    name: "synastry_aspects_all_points_all_aspects",
    getTsValue: async () =>
      AspectsFactory.dualChartAspects(await makeLondon(), await makeParis(), {
        active_aspects: ALL_ACTIVE_ASPECTS,
      }),
  },
  {
    name: "relationship_score",
    getTsValue: async () => new RelationshipScoreFactory(await makeLondon(), await makeParis()).getRelationshipScore(),
  },
  {
    name: "house_comparison",
    getTsValue: async () =>
      new HouseComparisonFactory(await makeLondon(), await makeParis(), ALL_ACTIVE_POINTS).getHouseComparison(),
  },
  {
    name: "moon_phase_overview",
    getTsValue: async () => MoonPhaseDetailsFactory.fromSubject(await makeLondon()),
  },
  {
    name: "solar_return",
    getTsValue: async () => makePlanetaryReturn(await makeRome(), "Solar", 2024),
  },
  {
    name: "lunar_return",
    getTsValue: async () => makePlanetaryReturn(await makeRome(), "Lunar", 2024, 6),
  },
  {
    name: "ephemeris_subjects",
    getTsValue: async () =>
      new EphemerisDataFactory({
        start_datetime: "2024-01-01T00:00:00",
        end_datetime: "2024-01-03T00:00:00",
        step_type: "days",
        step: 1,
        lat: 41.9028,
        lng: 12.4964,
        tz_str: "Europe/Rome",
      }).getEphemerisDataAsAstrologicalSubjects(),
  },
  {
    name: "transit_moments",
    getTsValue: async () => {
      const ephemeris = await new EphemerisDataFactory({
        start_datetime: "2024-01-01T00:00:00",
        end_datetime: "2024-01-03T00:00:00",
        step_type: "days",
        step: 1,
        lat: 41.9028,
        lng: 12.4964,
        tz_str: "Europe/Rome",
      }).getEphemerisDataAsAstrologicalSubjects();

      return new TransitsTimeRangeFactory({
        natal_chart: await makeLondon(),
        ephemeris_data_points: ephemeris,
        active_points: ALL_ACTIVE_POINTS,
        active_aspects: ALL_ACTIVE_ASPECTS,
      }).getTransitMoments();
    },
  },
];

const tsRuntimeSnapshotsPromise = (async () => {
  const snapshots: Record<string, unknown> = {};
  for (const { name, getTsValue } of parityCases) {
    snapshots[name] = await getTsValue();
  }
  return snapshots;
})();

describe("python runtime parity", () => {
  it.each(parityCases)("$name matches Python within WASM tolerance", async ({ name }) => {
    const tsRuntimeSnapshots = await tsRuntimeSnapshotsPromise;
    const pythonValue = toPythonModelJson(pythonRuntimeSnapshots[name]);
    const tsValue = toPythonModelJson(tsRuntimeSnapshots[name]);
    expectPythonParity(tsValue, pythonValue);
  });
});
