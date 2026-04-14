import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_ACTIVE_ASPECTS,
  ALL_ACTIVE_POINTS,
  AstrologicalSubjectFactory,
  ChartDataFactory,
  CompositeSubjectFactory,
  DEFAULT_ACTIVE_ASPECTS,
  MoonPhaseDetailsFactory,
  PlanetaryReturnFactory,
  ReportGenerator,
  TRADITIONAL_ASTROLOGY_ACTIVE_POINTS,
} from "../../src/index";

const fixturesDir = path.join(process.cwd(), "vendor", "kerykeion", "tests", "fixtures");

async function makeOfflineSubject(
  params: Parameters<typeof AstrologicalSubjectFactory.fromBirthData>[0] & {
    name: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    lat: number;
    lng: number;
    tz_str: string;
  },
) {
  return AstrologicalSubjectFactory.fromBirthData({
    online: false,
    suppress_geonames_warning: true,
    ...params,
  });
}

async function snapshotSubject(params: Partial<Parameters<typeof AstrologicalSubjectFactory.fromBirthData>[0]> = {}) {
  return AstrologicalSubjectFactory.fromBirthData({
    name: "Sample Natal Subject",
    year: 1990,
    month: 7,
    day: 21,
    hour: 14,
    minute: 45,
    city: "Liverpool",
    nation: "GB",
    lat: 53.4084,
    lng: -2.9916,
    tz_str: "Europe/London",
    online: false,
    suppress_geonames_warning: true,
    ...params,
  });
}

async function snapshotPartner(params: Partial<Parameters<typeof AstrologicalSubjectFactory.fromBirthData>[0]> = {}) {
  return AstrologicalSubjectFactory.fromBirthData({
    name: "Yoko Ono",
    year: 1933,
    month: 2,
    day: 18,
    hour: 20,
    minute: 30,
    city: "Tokyo",
    nation: "JP",
    lat: 35.6762,
    lng: 139.6503,
    tz_str: "Asia/Tokyo",
    online: false,
    suppress_geonames_warning: true,
    ...params,
  });
}

async function snapshotTransit(params: Partial<Parameters<typeof AstrologicalSubjectFactory.fromBirthData>[0]> = {}) {
  return AstrologicalSubjectFactory.fromBirthData({
    name: "1980 Transit",
    year: 1980,
    month: 12,
    day: 8,
    hour: 22,
    minute: 50,
    city: "New York",
    nation: "US",
    lat: 40.7128,
    lng: -74.006,
    tz_str: "America/New_York",
    online: false,
    suppress_geonames_warning: true,
    ...params,
  });
}

async function makeMoonPhaseOverview() {
  const subject = await AstrologicalSubjectFactory.fromBirthData({
    name: "Moon Phase Test",
    year: 1993,
    month: 10,
    day: 10,
    hour: 12,
    minute: 12,
    lng: -0.1276,
    lat: 51.5074,
    tz_str: "Europe/London",
    online: false,
  });
  return MoonPhaseDetailsFactory.fromSubject(subject);
}

function loadFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf8");
}

const PYTHON_REPORT_SCRIPT = [
  "import json",
  "import sys",
  "from kerykeion import AstrologicalSubjectFactory, ChartDataFactory, CompositeSubjectFactory, PlanetaryReturnFactory, ReportGenerator",
  "from kerykeion.settings.config_constants import ALL_ACTIVE_POINTS, ALL_ACTIVE_ASPECTS, DEFAULT_ACTIVE_ASPECTS",
  "def snapshot_subject(**kwargs):",
  "    params = dict(name='Sample Natal Subject', year=1990, month=7, day=21, hour=14, minute=45, city='Liverpool', nation='GB', lat=53.4084, lng=-2.9916, tz_str='Europe/London', online=False)",
  "    params.update(kwargs)",
  "    return AstrologicalSubjectFactory.from_birth_data(**params)",
  "def snapshot_partner(**kwargs):",
  "    params = dict(name='Yoko Ono', year=1933, month=2, day=18, hour=20, minute=30, city='Tokyo', nation='JP', lat=35.6762, lng=139.6503, tz_str='Asia/Tokyo', online=False)",
  "    params.update(kwargs)",
  "    return AstrologicalSubjectFactory.from_birth_data(**params)",
  "def snapshot_transit(**kwargs):",
  "    params = dict(name='1980 Transit', year=1980, month=12, day=8, hour=22, minute=50, city='New York', nation='US', lat=40.7128, lng=-74.006, tz_str='America/New_York', online=False)",
  "    params.update(kwargs)",
  "    return AstrologicalSubjectFactory.from_birth_data(**params)",
  "def create_solar_return(subject):",
  "    factory = PlanetaryReturnFactory(subject, city=subject.city, nation=subject.nation, lat=subject.lat, lng=subject.lng, tz_str=subject.tz_str, online=False)",
  "    return factory.next_return_from_iso_formatted_time(subject.iso_formatted_local_datetime, 'Solar')",
  "def render_case(case):",
  "    if case == 'natal_all_points_all_aspects':",
  "        subject = snapshot_subject(active_points=ALL_ACTIVE_POINTS)",
  "        chart = ChartDataFactory.create_natal_chart_data(subject, active_aspects=ALL_ACTIVE_ASPECTS)",
  "        return ReportGenerator(chart).generate_report()",
  "    if case == 'synastry_all_points_all_aspects':",
  "        natal = snapshot_subject(active_points=ALL_ACTIVE_POINTS)",
  "        partner = snapshot_partner(active_points=ALL_ACTIVE_POINTS)",
  "        chart = ChartDataFactory.create_synastry_chart_data(natal, partner, active_aspects=ALL_ACTIVE_ASPECTS)",
  "        return ReportGenerator(chart).generate_report()",
  "    if case == 'transit_all_points_all_aspects':",
  "        natal = snapshot_subject(active_points=ALL_ACTIVE_POINTS)",
  "        transit = snapshot_transit(active_points=ALL_ACTIVE_POINTS)",
  "        chart = ChartDataFactory.create_transit_chart_data(natal, transit, active_aspects=ALL_ACTIVE_ASPECTS)",
  "        return ReportGenerator(chart).generate_report()",
  "    if case == 'composite_all_points_all_aspects':",
  "        natal = snapshot_subject(active_points=ALL_ACTIVE_POINTS)",
  "        partner = snapshot_partner(active_points=ALL_ACTIVE_POINTS)",
  "        composite = CompositeSubjectFactory(natal, partner, 'John & Yoko Composite Chart').get_midpoint_composite_subject_model()",
  "        chart = ChartDataFactory.create_composite_chart_data(composite, active_aspects=ALL_ACTIVE_ASPECTS)",
  "        return ReportGenerator(chart).generate_report()",
  "    if case == 'solar_return_all_points':",
  "        natal = snapshot_subject(active_points=ALL_ACTIVE_POINTS)",
  "        solar = create_solar_return(natal)",
  "        chart = ChartDataFactory.create_single_wheel_return_chart_data(solar, active_aspects=DEFAULT_ACTIVE_ASPECTS)",
  "        return ReportGenerator(chart).generate_report()",
  "    raise SystemExit(f'Unknown case: {case}')",
  "case = sys.argv[1]",
  "if case == '__all__':",
  "    cases = ['natal_all_points_all_aspects', 'synastry_all_points_all_aspects', 'transit_all_points_all_aspects', 'composite_all_points_all_aspects', 'solar_return_all_points']",
  "    print(json.dumps({name: render_case(name) for name in cases}))",
  "else:",
  "    print(render_case(case), end='')",
].join("\n");

// The checked-in upstream all-points report fixtures drift on current Swiss Ephemeris builds,
// so these cases assert direct parity with the installed Python runtime instead.
const pythonReports = JSON.parse(
  execFileSync(path.join(process.cwd(), ".venv-pyref", "bin", "python"), ["-c", PYTHON_REPORT_SCRIPT, "__all__"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }),
) as Record<string, string>;

function loadPythonReport(caseName: string): string {
  return pythonReports[caseName] ?? "";
}

async function createSolarReturn(subject: Awaited<ReturnType<typeof snapshotSubject>>) {
  const factory = new PlanetaryReturnFactory(subject, {
    city: subject.city,
    nation: subject.nation,
    lat: subject.lat,
    lng: subject.lng,
    tz_str: subject.tz_str,
    online: false,
  });
  return factory.nextReturnFromIsoFormattedTime(subject.iso_formatted_local_datetime, "Solar");
}

describe("reportGenerator fixtures", () => {
  it("matches natal_john_lennon_subject_report.txt", async () => {
    const subject = await makeOfflineSubject({
      name: "John Lennon",
      year: 1940,
      month: 10,
      day: 9,
      hour: 18,
      minute: 30,
      city: "Greenwich",
      nation: "GB",
      lat: 53.4084,
      lng: -2.9916,
      tz_str: "Europe/London",
    });
    const actual = new ReportGenerator(subject, { include_aspects: false }).generate_report({ include_aspects: false });
    expect(actual).toBe(loadFixture("natal_john_lennon_subject_report.txt"));
  });

  it("matches natal_john_lennon_chart_report.txt", async () => {
    const subject = await makeOfflineSubject({
      name: "John Lennon",
      year: 1940,
      month: 10,
      day: 9,
      hour: 18,
      minute: 30,
      city: "Greenwich",
      nation: "GB",
      lat: 53.4084,
      lng: -2.9916,
      tz_str: "Europe/London",
    });
    const chart = ChartDataFactory.createNatalChartData(subject);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadFixture("natal_john_lennon_chart_report.txt"));
  });

  it("matches synastry_report.txt", async () => {
    const natal = await snapshotSubject();
    const partner = await snapshotPartner();
    const chart = ChartDataFactory.createSynastryChartData(natal, partner);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadFixture("synastry_report.txt"));
  });

  it("matches transit_report.txt", async () => {
    const natal = await snapshotSubject();
    const transit = await snapshotTransit();
    const chart = ChartDataFactory.createTransitChartData(natal, transit);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadFixture("transit_report.txt"));
  });

  it("matches composite_report.txt", async () => {
    const natal = await snapshotSubject();
    const partner = await snapshotPartner();
    const composite = new CompositeSubjectFactory(natal, partner, "John & Yoko Composite Chart").getMidpointCompositeSubjectModel();
    const chart = ChartDataFactory.createCompositeChartData(composite);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadFixture("composite_report.txt"));
  });

  it("matches solar_return_report.txt", async () => {
    const natal = await snapshotSubject();
    const solar = await createSolarReturn(natal);
    const chart = ChartDataFactory.createSingleWheelReturnChartData(solar);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadFixture("solar_return_report.txt"));
  });

  it("matches dual_return_report.txt", async () => {
    const natal = await snapshotSubject();
    const solar = await createSolarReturn(natal);
    const chart = ChartDataFactory.createReturnChartData(natal, solar);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadFixture("dual_return_report.txt"));
  });

  it("matches moon_phase_overview_report.txt", async () => {
    const overview = await makeMoonPhaseOverview();
    const actual = new ReportGenerator(overview).generate_report();
    expect(actual).toBe(loadFixture("moon_phase_overview_report.txt"));
  });

  it("matches natal_traditional_points_report.txt", async () => {
    const subject = await snapshotSubject({ active_points: TRADITIONAL_ASTROLOGY_ACTIVE_POINTS });
    const chart = ChartDataFactory.createNatalChartData(subject);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadFixture("natal_traditional_points_report.txt"));
  });

  it("matches natal_all_points_all_aspects_report.txt", async () => {
    const subject = await snapshotSubject({ active_points: ALL_ACTIVE_POINTS });
    const chart = ChartDataFactory.createNatalChartData(subject, null, ALL_ACTIVE_ASPECTS);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadPythonReport("natal_all_points_all_aspects"));
  });

  it("matches synastry_all_points_all_aspects_report.txt", async () => {
    const natal = await snapshotSubject({ active_points: ALL_ACTIVE_POINTS });
    const partner = await snapshotPartner({ active_points: ALL_ACTIVE_POINTS });
    const chart = ChartDataFactory.createSynastryChartData(natal, partner, null, ALL_ACTIVE_ASPECTS);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadPythonReport("synastry_all_points_all_aspects"));
  });

  it("matches transit_all_points_all_aspects_report.txt", async () => {
    const natal = await snapshotSubject({ active_points: ALL_ACTIVE_POINTS });
    const transit = await snapshotTransit({ active_points: ALL_ACTIVE_POINTS });
    const chart = ChartDataFactory.createTransitChartData(natal, transit, null, ALL_ACTIVE_ASPECTS);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadPythonReport("transit_all_points_all_aspects"));
  });

  it("matches composite_all_points_all_aspects_report.txt", async () => {
    const natal = await snapshotSubject({ active_points: ALL_ACTIVE_POINTS });
    const partner = await snapshotPartner({ active_points: ALL_ACTIVE_POINTS });
    const composite = new CompositeSubjectFactory(natal, partner, "John & Yoko Composite Chart").getMidpointCompositeSubjectModel();
    const chart = ChartDataFactory.createCompositeChartData(composite, null, ALL_ACTIVE_ASPECTS);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadPythonReport("composite_all_points_all_aspects"));
  });

  it("matches solar_return_all_points_report.txt", async () => {
    const natal = await snapshotSubject({ active_points: ALL_ACTIVE_POINTS });
    const solar = await createSolarReturn(natal);
    const chart = ChartDataFactory.createSingleWheelReturnChartData(solar, null, DEFAULT_ACTIVE_ASPECTS);
    const actual = new ReportGenerator(chart).generate_report();
    expect(actual).toBe(loadPythonReport("solar_return_all_points"));
  });
});
