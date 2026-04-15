import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  AspectsFactory,
  AstrologicalSubject,
  AstrologicalSubjectFactory,
  ChartDataFactory,
  CompositeSubjectFactory,
  EphemerisDataFactory,
  get_translations,
  HouseComparisonFactory,
  KerykeionChartSVG,
  KerykeionException,
  LANGUAGE_SETTINGS,
  load_language_settings,
  load_settings_mapping,
  MoonPhaseDetailsFactory,
  NatalAspects,
  PlanetaryReturnFactory,
  RelationshipScoreFactory,
  SynastryAspects,
  TransitsTimeRangeFactory,
} from "../../src/index";

async function makeSubject(
  name: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  lng: number,
  lat: number,
  tz_str: string,
) {
  return AstrologicalSubjectFactory.fromBirthData({
    name,
    year,
    month,
    day,
    hour,
    minute,
    city: "Rome",
    nation: "IT",
    lng,
    lat,
    tz_str,
    online: false,
  });
}

describe("public compatibility surface", () => {
  it("exports legacy wrappers and settings helpers from the root module", () => {
    expect(AstrologicalSubject).toBeTypeOf("function");
    expect(KerykeionChartSVG).toBeTypeOf("function");
    expect(NatalAspects).toBeTypeOf("function");
    expect(SynastryAspects).toBeTypeOf("function");
    expect(KerykeionException).toBeTypeOf("function");
    expect(LANGUAGE_SETTINGS.EN).toBeTruthy();
    expect(load_settings_mapping).toBeTypeOf("function");
    expect(load_language_settings).toBeTypeOf("function");
    expect(get_translations).toBeTypeOf("function");
  });

  it("supports snake_case aliases for static factories", async () => {
    const subject = await AstrologicalSubjectFactory.from_birth_data({
      name: "Alias Subject",
      year: 1990,
      month: 6,
      day: 15,
      hour: 10,
      minute: 30,
      city: "Rome",
      nation: "IT",
      lng: 12.4964,
      lat: 41.9028,
      tz_str: "Europe/Rome",
      online: false,
    });

    expect(subject.sun?.sign).toBeTruthy();

    const sameFromIso = await AstrologicalSubjectFactory.from_iso_utc_time({
      name: "Alias Subject",
      iso_utc_time: subject.iso_formatted_utc_datetime,
      city: "Rome",
      nation: "IT",
      lng: 12.4964,
      lat: 41.9028,
      tz_str: "Europe/Rome",
      online: false,
    });
    expect(sameFromIso.iso_formatted_utc_datetime).toBe(subject.iso_formatted_utc_datetime);

    const current = await AstrologicalSubjectFactory.from_current_time({
      name: "Current Alias",
      city: "Rome",
      nation: "IT",
      lng: 12.4964,
      lat: 41.9028,
      tz_str: "Europe/Rome",
      online: false,
    });
    expect(current.name).toBe("Current Alias");
  });

  it("supports the legacy AstrologicalSubject wrapper", async () => {
    const legacy = new AstrologicalSubject(
      "Legacy Subject",
      1990,
      6,
      15,
      10,
      30,
      "Rome",
      "IT",
      12.4964,
      41.9028,
      "Europe/Rome",
      undefined,
      "Tropical",
      false,
    );

    await legacy.ready;
    const model = await legacy.model();

    expect((legacy.sun as typeof model.sun)?.sign).toBe(model.sun?.sign);
    expect(legacy.mean_node?.name).toBe("Mean_North_Lunar_Node");
    expect(legacy.true_node?.name).toBe("True_North_Lunar_Node");
    expect(legacy.mean_south_node?.name).toBe("Mean_South_Lunar_Node");
    expect(legacy.true_south_node?.name).toBe("True_South_Lunar_Node");
    expect(legacy.utc_time).toBeCloseTo(8.5, 4);
    expect(legacy.local_time).toBeCloseTo(10.5, 4);
    expect(legacy.get("name")).toBe("Legacy Subject");

    const json = await legacy.json();
    expect((JSON.parse(json) as { name?: string }).name).toBe("Legacy Subject");

    const fromIso = await AstrologicalSubject.get_from_iso_utc_time({
      name: "Legacy Subject",
      iso_utc_time: model.iso_formatted_utc_datetime,
      city: "Rome",
      nation: "IT",
      tz_str: "Europe/Rome",
      lng: 12.4964,
      lat: 41.9028,
      online: false,
    });
    expect((await fromIso.model()).iso_formatted_utc_datetime).toBe(model.iso_formatted_utc_datetime);
  });

  it("supports snake_case aliases on chart, aspect, ephemeris and analysis APIs", async () => {
    const first = await makeSubject("First", 1990, 6, 15, 10, 30, 12.4964, 41.9028, "Europe/Rome");
    const second = await makeSubject("Second", 1992, 9, 20, 8, 45, -0.1276, 51.5072, "Europe/London");

    const compositeFactory = new CompositeSubjectFactory(first, second, "Alias Composite");
    const composite = compositeFactory.get_midpoint_composite_subject_model();
    expect(composite.name).toBe("Alias Composite");

    expect(ChartDataFactory.create_natal_chart_data(first).chart_type).toBe("Natal");
    expect(ChartDataFactory.create_synastry_chart_data(first, second).chart_type).toBe("Synastry");
    expect(ChartDataFactory.create_transit_chart_data(first, second).chart_type).toBe("Transit");
    expect(ChartDataFactory.create_composite_chart_data(composite).chart_type).toBe("Composite");

    const singleAspects = AspectsFactory.single_chart_aspects(first);
    const dualAspects = AspectsFactory.dual_chart_aspects(first, second);
    expect(singleAspects.aspects.length).toBeGreaterThan(0);
    expect(dualAspects.aspects.length).toBeGreaterThan(0);

    const houseComparison = new HouseComparisonFactory(first, second).get_house_comparison();
    expect(houseComparison.first_subject_name).toBe("First");
    expect(houseComparison.second_subject_name).toBe("Second");

    const relationshipScore = new RelationshipScoreFactory(first, second).get_relationship_score();
    expect(relationshipScore.score_value).toBeGreaterThanOrEqual(0);
    expect(relationshipScore.score_description).toBeTruthy();

    const ephemerisFactory = new EphemerisDataFactory({
      start_datetime: "2024-01-01T00:00:00",
      end_datetime: "2024-01-03T00:00:00",
      step_type: "days",
      step: 1,
      lat: 41.9028,
      lng: 12.4964,
      tz_str: "Europe/Rome",
    });
    const ephemerisSubjects = await ephemerisFactory.get_ephemeris_data_as_astrological_subjects();
    const ephemerisData = await ephemerisFactory.get_ephemeris_data();
    expect(ephemerisSubjects).toHaveLength(3);
    expect(ephemerisData).toHaveLength(3);

    const transits = new TransitsTimeRangeFactory({
      natal_chart: first,
      ephemeris_data_points: ephemerisSubjects,
    }).get_transit_moments();
    expect(transits.transits).toHaveLength(3);

    const moonPhase = MoonPhaseDetailsFactory.from_subject(first);
    expect(moonPhase.moon.phase_name).toBeTruthy();

    const returnFactory = new PlanetaryReturnFactory(first, {
      city: first.city ?? undefined,
      nation: first.nation ?? undefined,
      lng: first.lng ?? undefined,
      lat: first.lat ?? undefined,
      tz_str: first.tz_str ?? undefined,
      online: false,
    });
    const solarReturn = await returnFactory.next_return_from_iso_formatted_time(
      first.iso_formatted_local_datetime,
      "Solar",
    );
    expect(solarReturn.return_type).toBe("Solar");
    expect((await returnFactory.next_return_from_year(1991, "Solar")).return_type).toBe("Solar");
    expect((await returnFactory.next_return_from_date(1991, 6, 1, { return_type: "Solar" })).return_type).toBe("Solar");
    expect((await returnFactory.next_return_from_month_and_year(1991, 6, "Solar")).return_type).toBe("Solar");

    expect(ChartDataFactory.create_return_chart_data(first, solarReturn).chart_type).toBe("DualReturnChart");
    expect(ChartDataFactory.create_single_wheel_return_chart_data(solarReturn).chart_type).toBe("SingleReturnChart");
  });

  it("supports legacy chart and aspect wrappers", async () => {
    const first = await makeSubject("Chart First", 1990, 6, 15, 10, 30, 12.4964, 41.9028, "Europe/Rome");
    const second = await makeSubject("Chart Second", 1992, 9, 20, 8, 45, -0.1276, 51.5072, "Europe/London");
    const tempDir = mkdtempSync(path.join(tmpdir(), "kerykeion-ts-"));

    try {
      const chart = new KerykeionChartSVG(first, "ExternalNatal", null, tempDir);
      await chart.ready;

      expect((await chart.makeTemplate(true, true)).includes("<svg")).toBe(true);
      expect((await chart.makeWheelOnlyTemplate(true, true)).includes("<svg")).toBe(true);
      expect((await chart.makeAspectGridOnlyTemplate(true, true)).includes("<svg")).toBe(true);

      await chart.makeSVG(true, true);
      await chart.save_wheel_only_svg_file(true, true);
      await chart.makeGridOnlySVG(true, true);

      const createdFiles = readdirSync(tempDir).filter(file => file.endsWith(".svg"));
      expect(createdFiles.length).toBeGreaterThanOrEqual(3);
      expect(chart.width).toBeGreaterThan(0);
      expect(chart.height).toBeGreaterThan(0);

      const natalAspects = new NatalAspects(first);
      await natalAspects.ready;
      expect((await natalAspects.all_aspects).length).toBeGreaterThan(0);
      expect((await natalAspects.relevant_aspects).length).toBeGreaterThan(0);

      const synastryAspects = new SynastryAspects(first, second);
      await synastryAspects.ready;
      expect((await synastryAspects.all_aspects).length).toBeGreaterThan(0);
      expect((await synastryAspects.get_relevant_aspects()).length).toBeGreaterThan(0);
    }
    finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("preserves settings helper behavior through snake_case aliases", () => {
    const mapping = load_settings_mapping({
      language_settings: {
        EN: {
          weekdays: {
            monday: "Monday++",
          },
        },
      },
    });

    const languages = load_language_settings(mapping);
    const translation = get_translations("weekdays.monday", "Monday", {
      language: "EN",
      language_dict: languages.EN,
    });

    expect(translation).toBe("Monday++");
  });
});
