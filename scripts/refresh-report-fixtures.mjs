import { writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  AstrologicalSubjectFactory,
  ChartDataFactory,
  CompositeSubjectFactory,
  MoonPhaseDetailsFactory,
  PlanetaryReturnFactory,
  ReportGenerator,
  TRADITIONAL_ASTROLOGY_ACTIVE_POINTS,
} from "../src/index.ts";

const fixturesDir = path.join(process.cwd(), "vendor", "kerykeion", "tests", "fixtures");

async function makeOfflineSubject(params) {
  return AstrologicalSubjectFactory.fromBirthData({
    online: false,
    suppress_geonames_warning: true,
    ...params,
  });
}

async function snapshotSubject(params = {}) {
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

async function snapshotPartner(params = {}) {
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

async function snapshotTransit(params = {}) {
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

async function createSolarReturn(subject) {
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

const outputs = new Map();

{
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
  outputs.set("natal_john_lennon_subject_report.txt", new ReportGenerator(subject, { include_aspects: false }).generate_report({ include_aspects: false }));
  outputs.set("natal_john_lennon_chart_report.txt", new ReportGenerator(ChartDataFactory.createNatalChartData(subject)).generate_report());
}

{
  const natal = await snapshotSubject();
  const partner = await snapshotPartner();
  const transit = await snapshotTransit();
  const composite = new CompositeSubjectFactory(natal, partner, "John & Yoko Composite Chart").getMidpointCompositeSubjectModel();
  const solar = await createSolarReturn(natal);
  outputs.set("synastry_report.txt", new ReportGenerator(ChartDataFactory.createSynastryChartData(natal, partner)).generate_report());
  outputs.set("transit_report.txt", new ReportGenerator(ChartDataFactory.createTransitChartData(natal, transit)).generate_report());
  outputs.set("composite_report.txt", new ReportGenerator(ChartDataFactory.createCompositeChartData(composite)).generate_report());
  outputs.set("solar_return_report.txt", new ReportGenerator(ChartDataFactory.createSingleWheelReturnChartData(solar)).generate_report());
  outputs.set("dual_return_report.txt", new ReportGenerator(ChartDataFactory.createReturnChartData(natal, solar)).generate_report());
}

outputs.set("moon_phase_overview_report.txt", new ReportGenerator(await makeMoonPhaseOverview()).generate_report());
outputs.set(
  "natal_traditional_points_report.txt",
  new ReportGenerator(ChartDataFactory.createNatalChartData(await snapshotSubject({ active_points: TRADITIONAL_ASTROLOGY_ACTIVE_POINTS }))).generate_report(),
);

for (const [filename, content] of outputs) {
  writeFileSync(path.join(fixturesDir, filename), content, "utf8");
}
