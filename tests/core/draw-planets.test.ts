import type { KerykeionPointModel } from "../../src/core/schemas/models";

import type { KerykeionSettingsCelestialPointModel } from "../../src/core/settings/chart-defaults";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  _apply_group_adjustments,
  _calculate_indicator_adjustments,
  _calculate_planet_adjustments,
  _calculate_point_offset,
  _calculate_text_rotation,
  _determine_point_radius,
  _generate_point_svg,
  _handle_multi_point_group,
  CHART_ANGLE_MAX_INDEX,
  CHART_ANGLE_MIN_INDEX,
  draw_planets,
  DUAL_CHART_TYPES,
  INDICATOR_GROUPING_THRESHOLD,
  logging,
  PLANET_GROUPING_THRESHOLD,
} from "../../src/core/charts/draw-planets";
import { KerykeionException } from "../../src/core/schemas/kerykeion-exception";

function makePoint(
  name: KerykeionPointModel["name"],
  abs_pos: number,
  overrides: Partial<KerykeionPointModel> = {},
): KerykeionPointModel {
  return {
    name,
    abs_pos,
    position: overrides.position ?? abs_pos % 30.0,
    house: overrides.house ?? "First_House",
    sign: overrides.sign ?? "Ari",
    quality: overrides.quality ?? "Cardinal",
    element: overrides.element ?? "Fire",
    sign_num: overrides.sign_num ?? 0,
    emoji: overrides.emoji ?? "glyph",
    point_type: overrides.point_type ?? "AstrologicalPoint",
    retrograde: overrides.retrograde ?? false,
    speed: overrides.speed ?? null,
    declination: overrides.declination ?? null,
    magnitude: overrides.magnitude ?? null,
  };
}

function makeSetting(
  id: number,
  name: KerykeionSettingsCelestialPointModel["name"],
  overrides: Partial<KerykeionSettingsCelestialPointModel> = {},
): KerykeionSettingsCelestialPointModel {
  return {
    id,
    name,
    color: overrides.color ?? "#000000",
    element_points: overrides.element_points ?? 3,
    label: overrides.label ?? String(name),
    is_active: overrides.is_active ?? true,
  };
}

const RADIUS = 200;
const THIRD_CIRCLE_RADIUS = 30;
const FIRST_HOUSE_DEG = 0.0;
const SEVENTH_HOUSE_DEG = 180.0;

function natalDraw(
  points: KerykeionPointModel[],
  settings: KerykeionSettingsCelestialPointModel[],
  overrides: Partial<{
    radius: number;
    thirdCircleRadius: number;
    mainSubjectFirstHouseDegreeUt: number;
    mainSubjectSeventhHouseDegreeUt: number;
    chartType: "Natal";
    secondSubjectAvailableKerykeionCelestialPoints: KerykeionPointModel[] | null;
    externalView: boolean;
    firstCircleRadius: number | null;
    secondCircleRadius: number | null;
    showDegreeIndicators: boolean;
  }> = {},
): string {
  return draw_planets(
    overrides.radius ?? RADIUS,
    points,
    settings,
    overrides.thirdCircleRadius ?? THIRD_CIRCLE_RADIUS,
    overrides.mainSubjectFirstHouseDegreeUt ?? FIRST_HOUSE_DEG,
    overrides.mainSubjectSeventhHouseDegreeUt ?? SEVENTH_HOUSE_DEG,
    overrides.chartType ?? "Natal",
    overrides.secondSubjectAvailableKerykeionCelestialPoints ?? null,
    overrides.externalView ?? false,
    overrides.firstCircleRadius ?? null,
    overrides.secondCircleRadius ?? null,
    overrides.showDegreeIndicators ?? true,
  );
}

const MOCK_POINTS_DATA: KerykeionPointModel[] = [
  makePoint("Sun", 15.5),
  makePoint("Moon", 45.2, {
    position: 15.2,
    house: "Second_House",
    sign: "Tau",
    quality: "Fixed",
    element: "Earth",
    sign_num: 1,
  }),
  makePoint("Mercury", 20.1, { retrograde: true }),
];

const MOCK_SETTINGS_DATA: KerykeionSettingsCelestialPointModel[] = [
  makeSetting(0, "Sun", { color: "#FFA500", element_points: 5, label: "Sun" }),
  makeSetting(1, "Moon", { color: "#C0C0C0", element_points: 4, label: "Moon" }),
  makeSetting(4, "Mercury", { color: "#87CEEB", element_points: 3, label: "Mercury" }),
];

function mockPoints(data: KerykeionPointModel[] = MOCK_POINTS_DATA): KerykeionPointModel[] {
  return data.map(point => ({ ...point }));
}

function mockSettings(
  data: KerykeionSettingsCelestialPointModel[] = MOCK_SETTINGS_DATA,
): KerykeionSettingsCelestialPointModel[] {
  return data.map(setting => ({ ...setting }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("draw_planets", () => {
  describe("planet glyph positioning", () => {
    it("basic natal chart produces output", () => {
      const result = natalDraw(mockPoints(), mockSettings());
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("all planets are present in output", () => {
      const result = natalDraw(mockPoints(), mockSettings());
      expect(result).toContain("xlink:href=\"#Sun\"");
      expect(result).toContain("xlink:href=\"#Moon\"");
      expect(result).toContain("xlink:href=\"#Mercury\"");
    });

    it("planet use elements are unique", () => {
      const result = natalDraw(mockPoints(), mockSettings());
      expect(result.match(/xlink:href="#Sun"/g)?.length ?? 0).toBe(1);
      expect(result.match(/xlink:href="#Moon"/g)?.length ?? 0).toBe(1);
      expect(result.match(/xlink:href="#Mercury"/g)?.length ?? 0).toBe(1);
    });

    it("standard natal has no external-view lines", () => {
      const result = natalDraw(mockPoints(), mockSettings());
      expect(result).not.toContain("<line x1=");
    });

    it("external view natal has connecting lines", () => {
      const result = natalDraw(mockPoints(), mockSettings(), { externalView: true });
      expect(result).toContain("<line x1=");
      expect(result).toContain("stroke-opacity:.3");
      expect(result).toContain("stroke-opacity:.5");
    });

    it("external view still has glyphs", () => {
      const result = natalDraw(mockPoints(), mockSettings(), { externalView: true });
      expect(result).toContain("<g kr:node=\"ChartPoint\"");
      expect(result).toContain("xlink:href=\"#Sun\"");
    });

    it("small and large radii both work", () => {
      const pts = [mockPoints()[0]!];
      const stg = [mockSettings()[0]!];
      const small = natalDraw(pts, stg, { radius: 50, thirdCircleRadius: 10 });
      const large = natalDraw(pts, stg, { radius: 500, thirdCircleRadius: 50 });
      expect(small.length).toBeGreaterThan(0);
      expect(large.length).toBeGreaterThan(0);
    });

    it("float radii are accepted", () => {
      const result = natalDraw([mockPoints()[0]!], [mockSettings()[0]!], {
        radius: 200.5,
        thirdCircleRadius: 30.25,
        mainSubjectFirstHouseDegreeUt: 0.75,
        mainSubjectSeventhHouseDegreeUt: 180.33,
      });
      expect(result.length).toBeGreaterThan(0);
    });

    it("chart angles render with correct href", () => {
      const anglePoint = makePoint("First_House", 0.0, {
        position: 0.0,
        point_type: "House",
      });
      const angleSetting = makeSetting(23, "First_House", { label: "ASC" });
      const result = natalDraw([anglePoint], [angleSetting]);
      expect(result).toContain("xlink:href=\"#First_House\"");
    });

    it("determine radius for natal chart", () => {
      expect(_determine_point_radius(0, "Natal", false)).toBe(94);
      expect(_determine_point_radius(0, "Natal", true)).toBe(74);
      expect(_determine_point_radius(23, "Natal", false)).toBe(40);
    });

    it("determine radius for dual charts", () => {
      expect(_determine_point_radius(0, "Transit", false)).toBe(130);
      expect(_determine_point_radius(0, "Transit", true)).toBe(110);
      expect(_determine_point_radius(23, "Transit", false)).toBe(76);
    });

    it("determine radius for external view", () => {
      expect(_determine_point_radius(0, "Natal", false, true)).toBe(10);
      expect(_determine_point_radius(0, "Natal", true, true)).toBe(10);
      expect(_determine_point_radius(23, "Natal", false, true)).toBe(10);
    });

    it("calculates point offset", () => {
      expect(_calculate_point_offset(180, 45, 0)).toBe(-135);
      expect(_calculate_point_offset(180, 45, 5)).toBe(-130);
    });
  });

  describe("retrograde markers", () => {
    it("renders retrograde planet", () => {
      const result = natalDraw(
        [makePoint("Mercury", 20.1, { retrograde: true })],
        [makeSetting(4, "Mercury", { color: "#87CEEB" })],
      );
      expect(result).toContain("xlink:href=\"#Mercury\"");
    });

    it("renders direct planet", () => {
      const result = natalDraw([makePoint("Sun", 15.5)], [makeSetting(0, "Sun", { color: "#FFA500" })]);
      expect(result).toContain("xlink:href=\"#Sun\"");
    });

    it("mixed retrograde and direct planets render together", () => {
      const result = natalDraw(mockPoints(), mockSettings());
      expect(result).toContain("xlink:href=\"#Mercury\"");
      expect(result).toContain("xlink:href=\"#Sun\"");
      expect(result).toContain("xlink:href=\"#Moon\"");
    });

    it("stores retrograde flags on models", () => {
      const retro = makePoint("Saturn", 280.0, {
        retrograde: true,
        sign: "Cap",
        sign_num: 9,
        quality: "Cardinal",
        element: "Earth",
      });
      const direct = makePoint("Jupiter", 120.0, {
        retrograde: false,
        sign: "Leo",
        sign_num: 4,
        quality: "Fixed",
      });
      expect(retro.retrograde).toBe(true);
      expect(direct.retrograde).toBe(false);
    });

    it("multiple retrograde planets render", () => {
      const points = [
        makePoint("Mercury", 20.0, { retrograde: true }),
        makePoint("Saturn", 100.0, {
          retrograde: true,
          sign: "Can",
          sign_num: 3,
          quality: "Cardinal",
          element: "Water",
        }),
        makePoint("Jupiter", 200.0, {
          retrograde: true,
          sign: "Lib",
          sign_num: 6,
          quality: "Cardinal",
          element: "Air",
        }),
      ];
      const settings = [makeSetting(4, "Mercury"), makeSetting(6, "Saturn"), makeSetting(5, "Jupiter")];
      const result = natalDraw(points, settings);
      expect(result).toContain("xlink:href=\"#Mercury\"");
      expect(result).toContain("xlink:href=\"#Saturn\"");
      expect(result).toContain("xlink:href=\"#Jupiter\"");
    });

    it("preserves retrograde metadata in svg", () => {
      const result = natalDraw(
        [makePoint("Mercury", 20.1, { retrograde: true })],
        [makeSetting(4, "Mercury")],
      );
      expect(result).toContain("kr:slug=\"Mercury\"");
      expect(result).toContain("kr:retrograde=\"true\"");
    });
  });

  describe("degree labels", () => {
    it("natal chart with first circle radius shows indicators", () => {
      const result = natalDraw(mockPoints(), mockSettings(), { firstCircleRadius: 160, showDegreeIndicators: true });
      expect(result).toContain("class=\"planet-degree-line\"");
    });

    it("hides natal indicators when disabled", () => {
      const result = natalDraw(mockPoints(), mockSettings(), { firstCircleRadius: 160, showDegreeIndicators: false });
      expect(result).not.toContain("class=\"planet-degree-line\"");
    });

    it("hides natal indicators without firstCircleRadius", () => {
      const result = natalDraw(mockPoints(), mockSettings(), { showDegreeIndicators: true });
      expect(result).not.toContain("class=\"planet-degree-line\"");
    });

    it("external view suppresses primary indicators", () => {
      const result = natalDraw(mockPoints(), mockSettings(), {
        firstCircleRadius: 160,
        showDegreeIndicators: true,
        externalView: true,
      });
      expect(result).not.toContain("class=\"planet-degree-line\"");
    });

    it("contains degree text in natal indicators", () => {
      const result = natalDraw(mockPoints(), mockSettings(), { firstCircleRadius: 160, showDegreeIndicators: true });
      expect(result).toContain("°");
    });

    it("transit charts render degree text", () => {
      const secondary = [
        makePoint("Sun", 75.5, { position: 15.5, sign: "Gem", sign_num: 2, quality: "Mutable", element: "Air", house: "Third_House" }),
        makePoint("Moon", 105.2, { position: 15.2, sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water", house: "Fourth_House" }),
        makePoint("Mercury", 80.1, { position: 20.1, sign: "Gem", sign_num: 2, quality: "Mutable", element: "Air", house: "Third_House" }),
      ];
      const result = draw_planets(
        RADIUS,
        mockPoints(),
        mockSettings(),
        THIRD_CIRCLE_RADIUS,
        FIRST_HOUSE_DEG,
        SEVENTH_HOUSE_DEG,
        "Transit",
        secondary,
      );
      expect(result).toContain("°");
    });

    it("dual chart renders inner indicators", () => {
      const secondary = [
        makePoint("Sun", 105.3, { position: 15.3, sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water", house: "Fourth_House" }),
        makePoint("Moon", 135.2, { position: 15.2, sign: "Leo", sign_num: 4, quality: "Fixed", house: "Fifth_House" }),
        makePoint("Mercury", 110.1, { position: 20.1, sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water", house: "Fourth_House", retrograde: true }),
      ];
      const result = draw_planets(
        RADIUS,
        mockPoints(),
        mockSettings(),
        THIRD_CIRCLE_RADIUS,
        FIRST_HOUSE_DEG,
        SEVENTH_HOUSE_DEG,
        "Synastry",
        secondary,
      );
      expect(result).toContain("class=\"planet-degree-line-inner\"");
    });

    it("calculate text rotation keeps valid anchor on right and left side", () => {
      const right = _calculate_text_rotation(0.0, 350.0);
      const left = _calculate_text_rotation(0.0, 180.0);
      expect(["start", "end"]).toContain(right[1]);
      expect(["start", "end"]).toContain(left[1]);
      expect(left[0]).toBeGreaterThanOrEqual(-180);
      expect(left[0]).toBeLessThanOrEqual(180);
    });

    it("normalize text rotation to [-180, 180]", () => {
      for (const absPos of [0, 45, 90, 135, 180, 225, 270, 315, 359.9]) {
        const [rotation] = _calculate_text_rotation(10.0, absPos);
        expect(rotation).toBeGreaterThanOrEqual(-180);
        expect(rotation).toBeLessThanOrEqual(180);
      }
    });
  });

  describe("grouping", () => {
    it("two close planets render", () => {
      const points = [makePoint("Sun", 15.0), makePoint("Mercury", 16.5)];
      const settings = [makeSetting(0, "Sun", { color: "#FFA500" }), makeSetting(4, "Mercury", { color: "#87CEEB" })];
      const result = natalDraw(points, settings);
      expect(result).toContain("xlink:href=\"#Sun\"");
      expect(result).toContain("xlink:href=\"#Mercury\"");
    });

    it("three close planets render", () => {
      const points = [makePoint("Sun", 15.0), makePoint("Mercury", 16.5), makePoint("Venus", 18.0)];
      const settings = [makeSetting(0, "Sun"), makeSetting(4, "Mercury"), makeSetting(3, "Venus")];
      const result = natalDraw(points, settings);
      expect(result).toContain("xlink:href=\"#Sun\"");
      expect(result).toContain("xlink:href=\"#Mercury\"");
      expect(result).toContain("xlink:href=\"#Venus\"");
    });

    it("well separated planets have zero adjustments", () => {
      const points = [
        makePoint("Sun", 10.0),
        makePoint("Moon", 100.0, { sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water" }),
        makePoint("Mars", 250.0, { sign: "Sag", sign_num: 8, quality: "Mutable", element: "Fire" }),
      ];
      const settings = [makeSetting(0, "Sun"), makeSetting(1, "Moon"), makeSetting(2, "Mars")];
      const absPositions = points.map(point => point.abs_pos);
      const posMap = Object.fromEntries(absPositions.map((value, index) => [String(value), index]));
      const sorted = [...absPositions].sort((a, b) => a - b);
      const adjustments = _calculate_planet_adjustments(absPositions, settings, posMap, sorted);
      expect(adjustments.every(value => value === 0.0)).toBe(true);
    });

    it("apply group adjustments for 2/3/4/5 items", () => {
      const two = { 0: 0.0, 1: 0.0 };
      _apply_group_adjustments([0, 1], two);
      expect(two).toEqual({ 0: -1.5, 1: 1.5 });

      const three = { 0: 0.0, 1: 0.0, 2: 0.0 };
      _apply_group_adjustments([0, 1, 2], three);
      expect(three).toEqual({ 0: -2.0, 1: 0.0, 2: 2.0 });

      const four = { 0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0 };
      _apply_group_adjustments([0, 1, 2, 3], four);
      expect(four).toEqual({ 0: -3.0, 1: -1.0, 2: 1.0, 3: 3.0 });

      const five = { 0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0 };
      _apply_group_adjustments([0, 1, 2, 3, 4], five);
      expect(five[0]).toBeCloseTo(-3.0);
      expect(five[2]).toBeCloseTo(0.0);
      expect(five[4]).toBeCloseTo(3.0);
    });

    it("indicator adjustments are zero with no overlap", () => {
      const points = [
        makePoint("Sun", 10.0),
        makePoint("Moon", 100.0, { sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water" }),
      ];
      const settings = [makeSetting(0, "Sun"), makeSetting(1, "Moon")];
      const adjustments = _calculate_indicator_adjustments(points.map(point => point.abs_pos), settings);
      expect(adjustments[0]).toBe(0.0);
      expect(adjustments[1]).toBe(0.0);
    });

    it("indicator adjustments are non-zero with overlap", () => {
      const points = [makePoint("Sun", 10.0), makePoint("Mercury", 11.5)];
      const settings = [makeSetting(0, "Sun"), makeSetting(4, "Mercury")];
      const adjustments = _calculate_indicator_adjustments(points.map(point => point.abs_pos), settings);
      expect(adjustments[0] !== 0.0 || adjustments[1] !== 0.0).toBe(true);
    });

    it("exposes grouping constants", () => {
      expect(PLANET_GROUPING_THRESHOLD).toBe(3.4);
      expect(INDICATOR_GROUPING_THRESHOLD).toBe(2.5);
    });
  });

  describe("edge cases", () => {
    it("single planet renders", () => {
      const result = natalDraw([makePoint("Sun", 15.0)], [makeSetting(0, "Sun", { color: "#FFA500" })]);
      expect(result).toContain("xlink:href=\"#Sun\"");
    });

    it("empty planet list returns empty string", () => {
      expect(natalDraw([], [])).toBe("");
    });

    it("twelve evenly spaced planets all render", () => {
      const names: KerykeionPointModel["name"][] = [
        "Sun",
        "Moon",
        "Mercury",
        "Venus",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
        "Pluto",
        "Mean_North_Lunar_Node",
        "True_North_Lunar_Node",
      ];
      const signs = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"] as const;
      const qualities = ["Cardinal", "Fixed", "Mutable"] as const;
      const elements = ["Fire", "Earth", "Air", "Water"] as const;

      const points = names.map((name, index) =>
        makePoint(name, index * 30.0, {
          position: 0.0,
          sign: signs[index]!,
          sign_num: index as KerykeionPointModel["sign_num"],
          quality: qualities[index % 3]!,
          element: elements[index % 4]!,
        }),
      );
      const settings = names.map((name, index) => makeSetting(index, name));
      const result = natalDraw(points, settings);
      for (const name of names) {
        expect(result).toContain(`xlink:href="#${name}"`);
      }
    });

    it("all planets at same position still render", () => {
      const points = [makePoint("Sun", 0.0), makePoint("Moon", 0.1), makePoint("Mercury", 0.2)];
      const settings = [makeSetting(0, "Sun"), makeSetting(1, "Moon"), makeSetting(4, "Mercury")];
      const result = natalDraw(points, settings);
      expect(result).toContain("xlink:href=\"#Sun\"");
      expect(result).toContain("xlink:href=\"#Moon\"");
      expect(result).toContain("xlink:href=\"#Mercury\"");
    });

    it("handles 0 and 359 degrees", () => {
      expect(natalDraw([makePoint("Sun", 0.0, { position: 0.0 })], [makeSetting(0, "Sun")]).length).toBeGreaterThan(0);
      expect(
        natalDraw(
          [makePoint("Moon", 359.99, { position: 29.99, sign: "Pis", sign_num: 11, quality: "Mutable", element: "Water", house: "Twelfth_House" })],
          [makeSetting(0, "Moon")],
        ).length,
      ).toBeGreaterThan(0);
    });

    it("requires secondary points for transit and synastry", () => {
      expect(() =>
        draw_planets(RADIUS, mockPoints(), mockSettings(), THIRD_CIRCLE_RADIUS, FIRST_HOUSE_DEG, SEVENTH_HOUSE_DEG, "Transit"),
      ).toThrow(KerykeionException);
      expect(() =>
        draw_planets(RADIUS, mockPoints(), mockSettings(), THIRD_CIRCLE_RADIUS, FIRST_HOUSE_DEG, SEVENTH_HOUSE_DEG, "Synastry"),
      ).toThrow(KerykeionException);
    });

    it("does not require secondary points for return charts", () => {
      expect(
        draw_planets(RADIUS, mockPoints(), mockSettings(), THIRD_CIRCLE_RADIUS, FIRST_HOUSE_DEG, SEVENTH_HOUSE_DEG, "SingleReturnChart").length,
      ).toBeGreaterThan(0);
      expect(
        draw_planets(RADIUS, mockPoints(), mockSettings(), THIRD_CIRCLE_RADIUS, FIRST_HOUSE_DEG, SEVENTH_HOUSE_DEG, "DualReturnChart").length,
      ).toBeGreaterThan(0);
    });

    it("renders planets crossing zero boundary", () => {
      const points = [
        makePoint("Sun", 358.0, { position: 28.0, sign: "Pis", sign_num: 11, quality: "Mutable", element: "Water", house: "Twelfth_House" }),
        makePoint("Moon", 2.0, { position: 2.0 }),
      ];
      const settings = [makeSetting(0, "Sun"), makeSetting(1, "Moon")];
      const result = natalDraw(points, settings);
      expect(result).toContain("xlink:href=\"#Sun\"");
      expect(result).toContain("xlink:href=\"#Moon\"");
    });
  });

  describe("svg output", () => {
    it("contains expected g/use/transform metadata", () => {
      const result = natalDraw(mockPoints(), mockSettings());
      expect(result).toContain("<g kr:node=\"ChartPoint\"");
      expect(result).toContain("</g>");
      expect(result).toContain("<use ");
      expect(result).toContain("xlink:href=\"#");
      expect(result).toContain("transform=");
      expect(result).toContain("scale(");
      expect(result).toContain("kr:house=");
      expect(result).toContain("kr:sign=");
      expect(result).toContain("kr:slug=");
      expect(result).toContain("kr:absoluteposition=");
      expect(result).toContain("kr:signposition=");
    });

    it("contains text elements when degree indicators enabled", () => {
      const result = natalDraw(mockPoints(), mockSettings(), { firstCircleRadius: 160, showDegreeIndicators: true });
      expect(result).toContain("<text ");
      expect(result).toContain("text-anchor=");
    });

    it("contains line elements in external view", () => {
      const result = natalDraw(mockPoints(), mockSettings(), { externalView: true });
      expect(result).toContain("<line ");
      expect(result).toContain("x1=\"");
      expect(result).toContain("y1=\"");
      expect(result).toContain("x2=\"");
      expect(result).toContain("y2=\"");
    });

    it("transit output uses transit classes", () => {
      const secondary = [
        makePoint("Sun", 75.5, { position: 15.5, sign: "Gem", sign_num: 2, quality: "Mutable", element: "Air", house: "Third_House" }),
        makePoint("Moon", 105.2, { position: 15.2, sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water", house: "Fourth_House" }),
        makePoint("Mercury", 80.1, { position: 20.1, sign: "Gem", sign_num: 2, quality: "Mutable", element: "Air", house: "Third_House" }),
      ];
      const result = draw_planets(
        RADIUS,
        mockPoints(),
        mockSettings(),
        THIRD_CIRCLE_RADIUS,
        FIRST_HOUSE_DEG,
        SEVENTH_HOUSE_DEG,
        "Transit",
        secondary,
      );
      expect(result).toContain("class=\"transit-planet-name\"");
      expect(result).toContain("class=\"transit-planet-line\"");
    });

    it("generate point svg has expected structure", () => {
      const point = makePoint("Mars", 60.0, { sign: "Gem", sign_num: 2, quality: "Mutable", element: "Air" });
      const svg = _generate_point_svg(point, 100.0, 100.0, 1.0, "Mars");
      expect(svg.startsWith("<g kr:node=\"ChartPoint\"")).toBe(true);
      expect(svg.endsWith("</g>")).toBe(true);
      expect(svg).toContain("xlink:href=\"#Mars\"");
      expect(svg).toContain("kr:slug=\"Mars\"");
      expect(svg).toContain("kr:sign=\"Gem\"");
    });

    it("generate point svg scales coordinates", () => {
      const point = makePoint("Sun", 15.0);
      const svg1 = _generate_point_svg(point, 100.0, 100.0, 1.0, "Sun");
      const svg08 = _generate_point_svg(point, 100.0, 100.0, 0.8, "Sun");
      expect(svg1).toContain("scale(1.0)");
      expect(svg08).toContain("scale(0.8)");
      expect(svg08).toContain(`x="${(100 * (1 / 0.8)).toFixed(1)}"`);
    });

    it("returns pure string and numeric coordinates are parseable", () => {
      const result = natalDraw(mockPoints(), mockSettings());
      expect(typeof result).toBe("string");
      const xValues = [...result.matchAll(/x="([^"]+)"/g)].map(match => match[1]!);
      const yValues = [...result.matchAll(/y="([^"]+)"/g)].map(match => match[1]!);
      for (const value of [...xValues, ...yValues]) {
        expect(Number.isFinite(Number(value))).toBe(true);
      }
    });
  });

  describe("chart types", () => {
    const secondaryPoints = () => [
      makePoint("Sun", 75.5, { position: 15.5, sign: "Gem", sign_num: 2, quality: "Mutable", element: "Air", house: "Third_House" }),
      makePoint("Moon", 105.2, { position: 15.2, sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water", house: "Fourth_House" }),
      makePoint("Mercury", 80.1, { position: 20.1, sign: "Gem", sign_num: 2, quality: "Mutable", element: "Air", house: "Third_House" }),
    ];

    it("transit chart renders", () => {
      const result = draw_planets(
        RADIUS,
        mockPoints(),
        mockSettings(),
        THIRD_CIRCLE_RADIUS,
        FIRST_HOUSE_DEG,
        SEVENTH_HOUSE_DEG,
        "Transit",
        secondaryPoints(),
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("<g kr:node=\"ChartPoint\"");
      expect(result).toContain("class=\"transit-planet-name\"");
    });

    it("synastry chart renders", () => {
      const secondary = [
        makePoint("Sun", 105.3, { position: 15.3, sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water", house: "Fourth_House" }),
        makePoint("Moon", 135.2, { position: 15.2, sign: "Leo", sign_num: 4, quality: "Fixed", element: "Fire", house: "Fifth_House" }),
        makePoint("Mercury", 110.1, { position: 20.1, sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water", house: "Fourth_House", retrograde: true }),
      ];
      const result = draw_planets(
        RADIUS,
        mockPoints(),
        mockSettings(),
        THIRD_CIRCLE_RADIUS,
        FIRST_HOUSE_DEG,
        SEVENTH_HOUSE_DEG,
        "Synastry",
        secondary,
      );
      expect(result).toContain("style=\"stroke:");
    });

    it("return charts render", () => {
      const secondary = [
        makePoint("Sun", 15.5, { position: 15.5 }),
        makePoint("Moon", 45.2, { position: 15.2, sign: "Tau", sign_num: 1, quality: "Fixed", element: "Earth", house: "Second_House" }),
        makePoint("Mercury", 20.1, { position: 20.1, retrograde: true }),
      ];
      expect(
        draw_planets(RADIUS, mockPoints(), mockSettings(), THIRD_CIRCLE_RADIUS, FIRST_HOUSE_DEG, SEVENTH_HOUSE_DEG, "SingleReturnChart", secondary).length,
      ).toBeGreaterThan(0);
      expect(
        draw_planets(RADIUS, mockPoints(), mockSettings(), THIRD_CIRCLE_RADIUS, FIRST_HOUSE_DEG, SEVENTH_HOUSE_DEG, "DualReturnChart", secondary).length,
      ).toBeGreaterThan(0);
    });

    it("scale factors differ by chart type", () => {
      const points = [mockPoints()[0]!];
      const settings = [mockSettings()[0]!];
      const secondary = [makePoint("Moon", 105.2, { position: 15.2, sign: "Can", sign_num: 3, quality: "Cardinal", element: "Water", house: "Fourth_House" })];

      const natal = natalDraw(points, settings);
      const transit = draw_planets(
        RADIUS,
        points,
        settings,
        THIRD_CIRCLE_RADIUS,
        FIRST_HOUSE_DEG,
        SEVENTH_HOUSE_DEG,
        "Transit",
        secondary,
      );
      const external = natalDraw(points, settings, { externalView: true });

      expect(natal).toContain("scale(1.0)");
      expect(transit).toContain("scale(0.8)");
      expect(external).toContain("scale(0.8)");
    });
  });

  describe("logging", () => {
    it("debug logging is called", () => {
      const spy = vi.spyOn(logging, "debug").mockImplementation(() => {});
      natalDraw([mockPoints()[0]!], [mockSettings()[0]!]);
      expect(spy).toHaveBeenCalled();
    });

    it("debug logging is called multiple times for multiple planets", () => {
      const spy = vi.spyOn(logging, "debug").mockImplementation(() => {});
      natalDraw(mockPoints(), mockSettings());
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("internal helpers", () => {
    it("multi-point group produces adjustments", () => {
      const group = [
        [0, 20.0, 2.0, "Sun"],
        [1, 2.0, 2.0, "Mercury"],
        [2, 2.0, 20.0, "Venus"],
      ] as const;
      const adjustments = [0.0, 0.0, 0.0];
      _handle_multi_point_group([...group] as unknown as [number, number, number, string][], adjustments, PLANET_GROUPING_THRESHOLD);
      expect(adjustments.some(value => value !== 0.0)).toBe(true);
    });

    it("exposes expected constants and svg coordinate behavior", () => {
      expect(CHART_ANGLE_MIN_INDEX).toBe(22);
      expect(CHART_ANGLE_MAX_INDEX).toBe(27);
      expect(DUAL_CHART_TYPES).toContain("Transit");
      expect(DUAL_CHART_TYPES).toContain("Synastry");
      expect(DUAL_CHART_TYPES).toContain("DualReturnChart");
      expect(DUAL_CHART_TYPES).not.toContain("Natal");

      const svg = _generate_point_svg(makePoint("Sun", 15.0), 150.0, 120.0, 1.0, "Sun");
      expect(svg).toContain("x=\"150.0\"");
      expect(svg).toContain("y=\"120.0\"");

      const scaled = _generate_point_svg(makePoint("Sun", 15.0), 80.0, 80.0, 0.8, "Sun");
      expect(scaled).toContain(`x="${(80 / 0.8).toFixed(1)}"`);

      const houseSvg = _generate_point_svg(
        makePoint("Moon", 45.0, { house: "Second_House", sign: "Tau", sign_num: 1, quality: "Fixed", element: "Earth" }),
        100.0,
        100.0,
        1.0,
        "Moon",
      );
      expect(houseSvg).toContain("kr:house=\"Second_House\"");
    });
  });
});
