import type {
  AstrologicalPoint,
  ChartType,
} from "../schemas/literals";
import type {
  AspectModel,
  AstrologicalSubjectModel,
  CompositeSubjectModel,
  HouseComparisonModel,
  KerykeionPointModel,
  PlanetReturnModel,
} from "../schemas/models";
import type { KerykeionLanguageCelestialPointModel } from "../schemas/settings-models";
import type {
  ChartAspectSetting,
  KerykeionSettingsCelestialPointModel,
} from "../settings/chart-defaults";
import { KerykeionException } from "../schemas/kerykeion-exception";

export type ElementQualityDistributionMethod = "pure_count" | "weighted";
type NumberLike = number;
type SubjectForDistribution = AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
type ElementKey = (typeof ELEMENT_KEYS)[number];
type QualityKey = (typeof QUALITY_KEYS)[number];

const SECOND_COLUMN_THRESHOLD = 20;
const THIRD_COLUMN_THRESHOLD = 28;
const FOURTH_COLUMN_THRESHOLD = 36;
const DOUBLE_CHART_TYPES: readonly ChartType[] = ["Synastry", "Transit", "DualReturnChart"];
const GRID_COLUMN_WIDTH = 125;

const SIGN_TO_ELEMENT = [
  "fire",
  "earth",
  "air",
  "water",
  "fire",
  "earth",
  "air",
  "water",
  "fire",
  "earth",
  "air",
  "water",
] as const;

const SIGN_TO_QUALITY = [
  "cardinal",
  "fixed",
  "mutable",
  "cardinal",
  "fixed",
  "mutable",
  "cardinal",
  "fixed",
  "mutable",
  "cardinal",
  "fixed",
  "mutable",
] as const;

const ELEMENT_KEYS = ["fire", "earth", "air", "water"] as const;
const QUALITY_KEYS = ["cardinal", "fixed", "mutable"] as const;

function compensatedSum(values: readonly number[]): number {
  let sum = 0;
  let compensation = 0;

  for (const value of values) {
    const corrected = value - compensation;
    const next = sum + corrected;
    compensation = (next - sum) - corrected;
    sum = next;
  }

  return sum;
}
const DEFAULT_WEIGHTED_FALLBACK = 1.0;

export const DEFAULT_WEIGHTED_POINT_WEIGHTS: Record<string, number> = {
  sun: 2.0,
  moon: 2.0,
  ascendant: 2.0,
  medium_coeli: 1.5,
  descendant: 1.5,
  imum_coeli: 1.5,
  vertex: 0.8,
  anti_vertex: 0.8,
  mercury: 1.5,
  venus: 1.5,
  mars: 1.5,
  jupiter: 1.0,
  saturn: 1.0,
  uranus: 0.5,
  neptune: 0.5,
  pluto: 0.5,
  mean_north_lunar_node: 0.5,
  true_north_lunar_node: 0.5,
  mean_south_lunar_node: 0.5,
  true_south_lunar_node: 0.5,
  chiron: 0.6,
  mean_lilith: 0.5,
  true_lilith: 0.5,
  ceres: 0.5,
  pallas: 0.4,
  juno: 0.4,
  vesta: 0.4,
  pholus: 0.3,
  eris: 0.3,
  sedna: 0.3,
  haumea: 0.3,
  makemake: 0.3,
  ixion: 0.3,
  orcus: 0.3,
  quaoar: 0.3,
  pars_fortunae: 0.8,
  pars_spiritus: 0.7,
  pars_amoris: 0.6,
  pars_fidei: 0.6,
  regulus: 0.2,
  spica: 0.2,
  aldebaran: 0.2,
  antares: 0.2,
  sirius: 0.2,
  fomalhaut: 0.2,
  algol: 0.2,
  betelgeuse: 0.2,
  canopus: 0.2,
  procyon: 0.2,
  arcturus: 0.2,
  pollux: 0.2,
  deneb: 0.2,
  altair: 0.2,
  rigel: 0.2,
  achernar: 0.2,
  capella: 0.2,
  vega: 0.2,
  alcyone: 0.2,
  alphecca: 0.2,
  algorab: 0.2,
  deneb_algedi: 0.2,
  earth: 0.3,
};

export function selectPlanetGridThresholds(chartType: ChartType, numPoints = 0): [number, number, number] {
  if (DOUBLE_CHART_TYPES.includes(chartType)) {
    return [1_000_000, 1_000_008, 1_000_016];
  }

  if (numPoints <= SECOND_COLUMN_THRESHOLD) {
    return [SECOND_COLUMN_THRESHOLD, THIRD_COLUMN_THRESHOLD, FOURTH_COLUMN_THRESHOLD];
  }

  const maxRows = SECOND_COLUMN_THRESHOLD;
  const numColumns = Math.min(4, Math.max(1, Math.ceil(numPoints / maxRows)));
  const rowsPerCol = Math.ceil(numPoints / numColumns);
  return [rowsPerCol, rowsPerCol * 2, rowsPerCol * 3];
}

export function planetGridLayoutPosition(
  index: number,
  thresholds?: readonly [number, number, number] | null,
): [number, number] {
  const [secondThreshold, thirdThreshold, fourthThreshold] = thresholds ?? [
    SECOND_COLUMN_THRESHOLD,
    THIRD_COLUMN_THRESHOLD,
    FOURTH_COLUMN_THRESHOLD,
  ];

  let column = 0;
  let row = index;

  if (index < secondThreshold) {
    column = 0;
    row = index;
  }
  else if (index < thirdThreshold) {
    column = 1;
    row = index - secondThreshold;
  }
  else if (index < fourthThreshold) {
    column = 2;
    row = index - thirdThreshold;
  }
  else {
    column = 3;
    row = index - fourthThreshold;
  }

  return [-(GRID_COLUMN_WIDTH * column), row];
}

export function getDecodedKerykeionCelestialPointName(
  inputPlanetName: string,
  celestialPointLanguage: KerykeionLanguageCelestialPointModel,
): string {
  if (inputPlanetName in celestialPointLanguage) {
    return celestialPointLanguage[inputPlanetName as AstrologicalPoint];
  }

  throw new KerykeionException(`Celestial point ${inputPlanetName} not found in language model.`);
}

export function decHourJoin(inH: number, inM: number, inS: number): number {
  return Number(inH) + Number(inM) / 60 + Number(inS) / 3600;
}

export function degreeDiff(a: NumberLike, b: NumberLike): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

export function degreeSum(a: NumberLike, b: NumberLike): number {
  const sum = a + b;
  return sum % 360 !== 0 ? sum % 360 : 0.0;
}

export function normalizeDegree(angle: NumberLike): number {
  return angle % 360 !== 0 ? ((angle % 360) + 360) % 360 : 0.0;
}

export function offsetToTz(datetimeOffset: { days: number; seconds: number } | null): number {
  if (datetimeOffset == null) {
    throw new KerykeionException("datetime_offset is None");
  }

  return Number(datetimeOffset.days * 24) + Number(datetimeOffset.seconds / 3600.0);
}

export function sliceToX(slice: NumberLike, radius: NumberLike, offset: NumberLike): number {
  const plus = (Math.PI * offset) / 180;
  const radial = (Math.PI / 6) * slice + plus;
  return radius * (Math.cos(radial) + 1);
}

export function sliceToY(slice: NumberLike, radius: NumberLike, offset: NumberLike): number {
  const plus = (Math.PI * offset) / 180;
  const radial = (Math.PI / 6) * slice + plus;
  return radius * (-Math.sin(radial) + 1);
}

export function drawZodiacSlice(
  c1: NumberLike,
  chartType: ChartType,
  seventhHouseDegreeUt: NumberLike,
  num: number,
  radius: NumberLike,
  style: string,
  type: string,
): string {
  let offset = 360 - seventhHouseDegreeUt;
  let dropin: NumberLike
    = chartType === "Transit" || chartType === "Synastry" || chartType === "DualReturnChart" ? 0 : c1;

  const slice
    = `<path d="M${String(radius)},${String(radius)} `
      + `L${String(dropin + sliceToX(num, radius - dropin, offset))},${String(dropin + sliceToY(num, radius - dropin, offset))} `
      + `A${String(radius - dropin)},${String(radius - dropin)} 0 0,0 `
      + `${String(dropin + sliceToX(num + 1, radius - dropin, offset))},${String(dropin + sliceToY(num + 1, radius - dropin, offset))} `
      + `z" style="${style}"/>`;

  offset += 15;
  dropin
    = chartType === "Transit" || chartType === "Synastry" || chartType === "DualReturnChart"
      ? 54
      : 18 + c1;

  const sign
    = `<g transform="translate(-16,-16)"><use x="${String(dropin + sliceToX(num, radius - dropin, offset))}" `
      + `y="${String(dropin + sliceToY(num, radius - dropin, offset))}" xlink:href="#${type}" /></g>`;

  return slice + sign;
}

export function convertLatitudeCoordinateToString(
  coord: NumberLike,
  northLabel: string,
  southLabel: string,
): string {
  let sign = northLabel;
  let value = coord;
  if (value < 0.0) {
    sign = southLabel;
    value = Math.abs(value);
  }

  const degrees = Math.trunc(value);
  const minutes = Math.trunc((value - degrees) * 60);
  const seconds = Math.trunc(Math.round((((value - degrees) * 60) - minutes) * 60.0));
  return `${degrees}°${minutes}'${seconds}" ${sign}`;
}

export function convertLongitudeCoordinateToString(
  coord: NumberLike,
  eastLabel: string,
  westLabel: string,
): string {
  let sign = eastLabel;
  let value = coord;
  if (value < 0.0) {
    sign = westLabel;
    value = Math.abs(value);
  }

  const degrees = Math.trunc(value);
  const minutes = Math.trunc((value - degrees) * 60);
  const seconds = Math.trunc(Math.round((((value - degrees) * 60) - minutes) * 60.0));
  return `${degrees}°${minutes}'${seconds}" ${sign}`;
}

export function convertDecimalToDegreeString(
  dec: number,
  formatType: "1" | "2" | "3" = "3",
): string {
  const value = Number(dec);
  const degrees = Math.trunc(value);
  const minutes = Math.trunc((value - degrees) * 60);
  const seconds = Math.trunc(Math.round((value - degrees - minutes / 60) * 3600));

  if (formatType === "1") {
    return `${degrees}°`;
  }

  if (formatType === "2") {
    return `${degrees}°${String(minutes).padStart(2, "0")}'`;
  }

  return `${degrees}°${String(minutes).padStart(2, "0")}'${String(seconds).padStart(2, "0")}"`;
}

export function drawAspectLine(
  r: number,
  ar: number,
  aspect: AspectModel,
  color: string,
  seventhHouseDegreeUt: number,
  showAspectIcon = true,
  renderedIconPositions: Array<[number, number, number]> | null = null,
  iconCollisionThreshold = 16.0,
): string {
  const firstOffset = Math.trunc(seventhHouseDegreeUt) / -1 + Math.trunc(aspect.p1_abs_pos);
  const x1 = sliceToX(0, ar, firstOffset) + (r - ar);
  const y1 = sliceToY(0, ar, firstOffset) + (r - ar);

  const secondOffset = Math.trunc(seventhHouseDegreeUt) / -1 + Math.trunc(aspect.p2_abs_pos);
  const x2 = sliceToX(0, ar, secondOffset) + (r - ar);
  const y2 = sliceToY(0, ar, secondOffset) + (r - ar);

  let aspectIconSvg = "";

  if (showAspectIcon) {
    let midX: number;
    let midY: number;

    if (aspect.aspect_degrees === 0) {
      const p1Rad = (aspect.p1_abs_pos * Math.PI) / 180;
      const p2Rad = (aspect.p2_abs_pos * Math.PI) / 180;
      const avgSin = (Math.sin(p1Rad) + Math.sin(p2Rad)) / 2;
      const avgCos = (Math.cos(p1Rad) + Math.cos(p2Rad)) / 2;
      const avgPos = ((((Math.atan2(avgSin, avgCos) * 180) / Math.PI) % 360) + 360) % 360;

      const offset = Math.trunc(seventhHouseDegreeUt) / -1 + avgPos;
      const iconRadius = ar + 4;
      midX = sliceToX(0, iconRadius, offset) + (r - iconRadius);
      midY = sliceToY(0, iconRadius, offset) + (r - iconRadius);
    }
    else {
      midX = (x1 + x2) / 2;
      midY = (y1 + y2) / 2;
    }

    let shouldRenderIcon = true;
    if (renderedIconPositions) {
      for (const [existingX, existingY, existingAspectDegrees] of renderedIconPositions) {
        if (existingAspectDegrees === aspect.aspect_degrees) {
          const distance = Math.sqrt((midX - existingX) ** 2 + (midY - existingY) ** 2);
          if (distance < iconCollisionThreshold) {
            shouldRenderIcon = false;
            break;
          }
        }
      }
    }

    if (shouldRenderIcon) {
      const aspectSymbolId = `orb${aspect.aspect_degrees}`;
      const iconOffset = 6;
      aspectIconSvg = `<use x="${midX - iconOffset}" y="${midY - iconOffset}" xlink:href="#${aspectSymbolId}" />`;
      renderedIconPositions?.push([midX, midY, aspect.aspect_degrees]);
    }
  }

  return [
    `<g kr:node="Aspect" kr:aspectname="${aspect.aspect}" kr:to="${aspect.p1_name}" kr:tooriginaldegrees="${aspect.p1_abs_pos}"`,
    ` kr:from="${aspect.p2_name}" kr:fromoriginaldegrees="${aspect.p2_abs_pos}" kr:orb="${aspect.orbit}"`,
    ` kr:aspectdegrees="${aspect.aspect_degrees}" kr:planetsdiff="${aspect.diff}" kr:aspectmovement="${aspect.aspect_movement}">`,
    `<line class="aspect" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke: ${color}; stroke-width: 1; stroke-opacity: .9;"/>`,
    aspectIconSvg,
    "</g>",
  ].join("");
}

function prepareWeightLookup(
  method: ElementQualityDistributionMethod,
  customWeights?: Readonly<Record<string, number>> | null,
): { weightLookup: Record<string, number>; fallbackWeight: number } {
  const normalizedCustom = Object.fromEntries(
    Object.entries(customWeights ?? {}).map(([key, value]) => [key.toLowerCase(), Number(value)]),
  );

  const weightLookup = method === "weighted" ? { ...DEFAULT_WEIGHTED_POINT_WEIGHTS } : {};
  let fallbackWeight = method === "weighted" ? DEFAULT_WEIGHTED_FALLBACK : 1.0;

  if ("__default__" in normalizedCustom) {
    fallbackWeight = normalizedCustom.__default__!;
  }

  for (const [key, value] of Object.entries(normalizedCustom)) {
    if (key !== "__default__") {
      weightLookup[key] = value;
    }
  }

  return { weightLookup, fallbackWeight };
}

function calculateDistributionForSubject<T extends string>(
  subject: SubjectForDistribution,
  celestialPointsNames: readonly string[],
  signToGroupMap: readonly T[],
  groupKeys: readonly T[],
  weightLookup: Readonly<Record<string, number>>,
  fallbackWeight: number,
): Record<T, number> {
  const totals = Object.fromEntries(groupKeys.map(key => [key, 0])) as Record<T, number>;

  for (const pointName of celestialPointsNames) {
    const point = subject[pointName as keyof SubjectForDistribution] as { sign_num?: number } | undefined;
    if (!point || point.sign_num == null) {
      continue;
    }

    const signIndex = point.sign_num;
    if (signIndex < 0 || signIndex >= signToGroupMap.length) {
      continue;
    }

    const groupKey = signToGroupMap[signIndex]!;
    totals[groupKey] += weightLookup[pointName] ?? fallbackWeight;
  }

  return totals;
}

export function calculateElementPoints(
  _availablePlanetsSetting: KerykeionSettingsCelestialPointModel[],
  celestialPointsNames: readonly string[],
  subject: SubjectForDistribution,
  method: ElementQualityDistributionMethod = "weighted",
  customWeights?: Readonly<Record<string, number>> | null,
): Record<ElementKey, number> {
  const { weightLookup, fallbackWeight } = prepareWeightLookup(method, customWeights);
  return calculateDistributionForSubject(
    subject,
    celestialPointsNames,
    SIGN_TO_ELEMENT,
    ELEMENT_KEYS,
    weightLookup,
    fallbackWeight,
  );
}

export function calculateSynastryElementPoints(
  _planetsSettings: KerykeionSettingsCelestialPointModel[],
  celestialPointsNames: readonly string[],
  firstSubject: AstrologicalSubjectModel,
  secondSubject: AstrologicalSubjectModel,
  method: ElementQualityDistributionMethod = "weighted",
  customWeights?: Readonly<Record<string, number>> | null,
): Record<ElementKey, number> {
  const { weightLookup, fallbackWeight } = prepareWeightLookup(method, customWeights);
  const subject1Totals = calculateDistributionForSubject(
    firstSubject,
    celestialPointsNames,
    SIGN_TO_ELEMENT,
    ELEMENT_KEYS,
    weightLookup,
    fallbackWeight,
  );
  const subject2Totals = calculateDistributionForSubject(
    secondSubject,
    celestialPointsNames,
    SIGN_TO_ELEMENT,
    ELEMENT_KEYS,
    weightLookup,
    fallbackWeight,
  );
  const combinedTotals = {
    fire: subject1Totals.fire + subject2Totals.fire,
    earth: subject1Totals.earth + subject2Totals.earth,
    air: subject1Totals.air + subject2Totals.air,
    water: subject1Totals.water + subject2Totals.water,
  };
  const totalPoints = compensatedSum([
    combinedTotals.fire,
    combinedTotals.earth,
    combinedTotals.air,
    combinedTotals.water,
  ]);

  if (totalPoints === 0) {
    return { fire: 0, earth: 0, air: 0, water: 0 };
  }

  return {
    fire: (combinedTotals.fire / totalPoints) * 100,
    earth: (combinedTotals.earth / totalPoints) * 100,
    air: (combinedTotals.air / totalPoints) * 100,
    water: (combinedTotals.water / totalPoints) * 100,
  };
}

export function calculateQualityPoints(
  _availablePlanetsSetting: KerykeionSettingsCelestialPointModel[],
  celestialPointsNames: readonly string[],
  subject: SubjectForDistribution,
  method: ElementQualityDistributionMethod = "weighted",
  customWeights?: Readonly<Record<string, number>> | null,
): Record<QualityKey, number> {
  const { weightLookup, fallbackWeight } = prepareWeightLookup(method, customWeights);
  return calculateDistributionForSubject(
    subject,
    celestialPointsNames,
    SIGN_TO_QUALITY,
    QUALITY_KEYS,
    weightLookup,
    fallbackWeight,
  );
}

export function calculateSynastryQualityPoints(
  _planetsSettings: KerykeionSettingsCelestialPointModel[],
  celestialPointsNames: readonly string[],
  firstSubject: AstrologicalSubjectModel,
  secondSubject: AstrologicalSubjectModel,
  method: ElementQualityDistributionMethod = "weighted",
  customWeights?: Readonly<Record<string, number>> | null,
): Record<QualityKey, number> {
  const { weightLookup, fallbackWeight } = prepareWeightLookup(method, customWeights);
  const subject1Totals = calculateDistributionForSubject(
    firstSubject,
    celestialPointsNames,
    SIGN_TO_QUALITY,
    QUALITY_KEYS,
    weightLookup,
    fallbackWeight,
  );
  const subject2Totals = calculateDistributionForSubject(
    secondSubject,
    celestialPointsNames,
    SIGN_TO_QUALITY,
    QUALITY_KEYS,
    weightLookup,
    fallbackWeight,
  );
  const combinedTotals = {
    cardinal: subject1Totals.cardinal + subject2Totals.cardinal,
    fixed: subject1Totals.fixed + subject2Totals.fixed,
    mutable: subject1Totals.mutable + subject2Totals.mutable,
  };
  const totalPoints = compensatedSum([
    combinedTotals.cardinal,
    combinedTotals.fixed,
    combinedTotals.mutable,
  ]);

  if (totalPoints === 0) {
    return { cardinal: 0, fixed: 0, mutable: 0 };
  }

  return {
    cardinal: (combinedTotals.cardinal / totalPoints) * 100,
    fixed: (combinedTotals.fixed / totalPoints) * 100,
    mutable: (combinedTotals.mutable / totalPoints) * 100,
  };
}

export function drawTransitRingDegreeSteps(r: number, seventhHouseDegreeUt: number): string {
  let output = "<g id=\"transitRingDegreeSteps\">";
  for (let i = 0; i < 72; i += 1) {
    let offset = i * 5 - seventhHouseDegreeUt;
    if (offset < 0) {
      offset += 360.0;
    }
    else if (offset > 360) {
      offset -= 360.0;
    }

    const x1 = sliceToX(0, r, offset);
    const y1 = sliceToY(0, r, offset);
    const x2 = sliceToX(0, r + 2, offset) - 2;
    const y2 = sliceToY(0, r + 2, offset) - 2;
    output += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke: #F00; stroke-width: 1px; stroke-opacity:.9;"/>`;
  }

  output += "</g>";
  return output;
}

export function drawDegreeRing(r: number, c1: number, seventhHouseDegreeUt: number, strokeColor: string): string {
  let output = "<g id=\"degreeRing\">";
  for (let i = 0; i < 72; i += 1) {
    let offset = i * 5 - seventhHouseDegreeUt;
    if (offset < 0) {
      offset += 360.0;
    }
    else if (offset > 360) {
      offset -= 360.0;
    }

    const x1 = sliceToX(0, r - c1, offset) + c1;
    const y1 = sliceToY(0, r - c1, offset) + c1;
    const x2 = sliceToX(0, r + 2 - c1, offset) - 2 + c1;
    const y2 = sliceToY(0, r + 2 - c1, offset) - 2 + c1;
    output += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke: ${strokeColor}; stroke-width: 1px; stroke-opacity:.9;"/>`;
  }

  output += "</g>";
  return output;
}

export function drawTransitRing(r: number, paper1Color: string, zodiacTransitRing3Color: string): string {
  const radiusOffset = 18;
  let output = `<circle cx="${r}" cy="${r}" r="${r - radiusOffset}" style="fill: none; stroke: ${paper1Color}; stroke-width: 36px; stroke-opacity: .4;"/>`;
  output += `<circle cx="${r}" cy="${r}" r="${r}" style="fill: none; stroke: ${zodiacTransitRing3Color}; stroke-width: 1px; stroke-opacity: .6;"/>`;
  return output;
}

export function drawFirstCircle(
  r: number,
  strokeColor: string,
  chartType: ChartType,
  c1: number | null = null,
): string {
  if (chartType === "Synastry" || chartType === "Transit" || chartType === "DualReturnChart") {
    return `<circle cx="${r}" cy="${r}" r="${r - 36}" style="fill: none; stroke: ${strokeColor}; stroke-width: 1px; stroke-opacity:.4;" />`;
  }

  if (c1 == null) {
    throw new KerykeionException("c1 is None");
  }

  return `<circle cx="${r}" cy="${r}" r="${r - c1}" style="fill: none; stroke: ${strokeColor}; stroke-width: 1px; " />`;
}

export function drawBackgroundCircle(r: number, strokeColor: string, fillColor: string): string {
  return `<circle cx="${r}" cy="${r}" r="${r}" style="fill: ${fillColor}; stroke: ${strokeColor}; stroke-width: 1px;" />`;
}

export function drawSecondCircle(
  r: number,
  strokeColor: string,
  fillColor: string,
  chartType: ChartType,
  c2: number | null = null,
): string {
  if (chartType === "Synastry" || chartType === "Transit" || chartType === "DualReturnChart") {
    return `<circle cx="${r}" cy="${r}" r="${r - 72}" style="fill: ${fillColor}; fill-opacity:.4; stroke: ${strokeColor}; stroke-opacity:.4; stroke-width: 1px" />`;
  }

  if (c2 == null) {
    throw new KerykeionException("c2 is None");
  }

  return `<circle cx="${r}" cy="${r}" r="${r - c2}" style="fill: ${fillColor}; fill-opacity:.2; stroke: ${strokeColor}; stroke-opacity:.4; stroke-width: 1px" />`;
}

export function drawThirdCircle(
  radius: number,
  strokeColor: string,
  fillColor: string,
  chartType: ChartType,
  c3: number,
): string {
  if (chartType === "Synastry" || chartType === "Transit" || chartType === "DualReturnChart") {
    return `<circle cx="${radius}" cy="${radius}" r="${radius - 160}" style="fill: ${fillColor}; fill-opacity:.8; stroke: ${strokeColor}; stroke-width: 1px" />`;
  }

  return `<circle cx="${radius}" cy="${radius}" r="${radius - c3}" style="fill: ${fillColor}; fill-opacity:.8; stroke: ${strokeColor}; stroke-width: 1px" />`;
}

function formatScaledGlyphCoordinate(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

export function drawAspectGrid(
  strokeColor: string,
  availablePlanets: ReadonlyArray<KerykeionSettingsCelestialPointModel>,
  aspects: ReadonlyArray<AspectModel>,
  xStart = 510,
  yStart = 468,
): string {
  let output = "";
  const style = `stroke:${strokeColor}; stroke-width: 1px; stroke-width: 0.5px; fill:none`;
  const boxSize = 14;
  const activePlanets = availablePlanets.filter(planet => planet.is_active);
  const reversedPlanets = [...activePlanets].reverse();

  let currentX = xStart;
  let currentY = yStart;

  for (let index = 0; index < reversedPlanets.length; index += 1) {
    const planetA = reversedPlanets[index]!;
    output += `<rect kr:node="AspectsGridRect" x="${currentX}" y="${currentY}" width="${boxSize}" height="${boxSize}" style="${style}"/>`;
    output += `<use transform="scale(0.4)" x="${formatScaledGlyphCoordinate((currentX + 2) * 2.5)}" y="${formatScaledGlyphCoordinate((currentY + 1) * 2.5)}" xlink:href="#${planetA.name}" />`;

    currentX += boxSize;
    currentY -= boxSize;

    let aspectX = currentX;
    const aspectY = currentY + boxSize;

    for (const planetB of reversedPlanets.slice(index + 1)) {
      output += `<rect kr:node="AspectsGridRect" x="${aspectX}" y="${aspectY}" width="${boxSize}" height="${boxSize}" style="${style}"/>`;
      aspectX += boxSize;

      for (const aspect of aspects) {
        if (
          (aspect.p1 === planetA.id && aspect.p2 === planetB.id)
          || (aspect.p1 === planetB.id && aspect.p2 === planetA.id)
        ) {
          output += `<use  x="${aspectX - boxSize + 1}" y="${aspectY + 1}" xlink:href="#orb${aspect.aspect_degrees}" />`;
        }
      }
    }
  }

  return output;
}

export function drawHousesCuspsAndTextNumber(
  r: number,
  firstSubjectHousesList: KerykeionPointModel[],
  standardHouseCuspColor: string,
  firstHouseColor: string,
  tenthHouseColor: string,
  seventhHouseColor: string,
  fourthHouseColor: string,
  c1: number,
  c3: number,
  chartType: ChartType,
  secondSubjectHousesList: KerykeionPointModel[] | null = null,
  transitHouseCuspColor: string | null = null,
  externalView = false,
): string {
  let path = "";
  const xr = 12;

  for (let i = 0; i < xr; i += 1) {
    let dropin: number;
    let roff: number;
    let tRoff: number | false;
    if (chartType === "Transit" || chartType === "Synastry" || chartType === "DualReturnChart") {
      dropin = 160;
      roff = 72;
      tRoff = 36;
    }
    else {
      dropin = c3;
      roff = c1;
      tRoff = false;
    }

    const offset
      = Math.trunc(firstSubjectHousesList[Math.trunc(xr / 2)]!.abs_pos) * -1
        + Math.trunc(firstSubjectHousesList[i]!.abs_pos);

    const x1 = sliceToX(0, r - dropin, offset) + dropin;
    const y1 = sliceToY(0, r - dropin, offset) + dropin;
    const x2 = sliceToX(0, r - roff, offset) + roff;
    const y2 = sliceToY(0, r - roff, offset) + roff;

    const nextIndex = (i + 1) % xr;
    const textOffset
      = offset
        + Math.trunc(
          degreeDiff(firstSubjectHousesList[nextIndex]!.abs_pos, firstSubjectHousesList[i]!.abs_pos) / 2,
        );

    const lineColor
      = {
        0: firstHouseColor,
        9: tenthHouseColor,
        6: seventhHouseColor,
        3: fourthHouseColor,
      }[i] ?? standardHouseCuspColor;

    if (chartType === "Transit" || chartType === "Synastry" || chartType === "DualReturnChart") {
      if (secondSubjectHousesList == null || transitHouseCuspColor == null || tRoff === false) {
        throw new KerykeionException("second_subject_houses_list_ut or transit_house_cusp_color is None");
      }

      const zeroPoint = 360 - firstSubjectHousesList[6]!.abs_pos;
      const tOffset = (zeroPoint + secondSubjectHousesList[i]!.abs_pos) % 360;

      const tX1 = sliceToX(0, r - tRoff, tOffset) + tRoff;
      const tY1 = sliceToY(0, r - tRoff, tOffset) + tRoff;
      const tX2 = sliceToX(0, r, tOffset);
      const tY2 = sliceToY(0, r, tOffset);

      const tTextOffset
        = tOffset
          + Math.trunc(
            degreeDiff(secondSubjectHousesList[nextIndex]!.abs_pos, secondSubjectHousesList[i]!.abs_pos) / 2,
          );
      const tLineColor = i === 0 || i === 9 || i === 6 || i === 3 ? lineColor : transitHouseCuspColor;
      const xText = sliceToX(0, r - 8, tTextOffset) + 8;
      const yText = sliceToY(0, r - 8, tTextOffset) + 8;
      const fillOpacity = chartType === "Transit" ? "0" : ".4";
      path += "<g kr:node=\"HouseNumber\">";
      path += `<text style="fill: var(--kerykeion-chart-color-house-number); fill-opacity: ${fillOpacity}; font-size: 14px"><tspan x="${xText - 3}" y="${yText + 3}">${i + 1}</tspan></text>`;
      path += "</g>";

      const strokeOpacity = chartType === "Transit" ? "0" : ".3";
      path += `<g kr:node="Cusp" kr:absoluteposition="${secondSubjectHousesList[i]!.abs_pos}" kr:signposition="${secondSubjectHousesList[i]!.position}" kr:sing="${secondSubjectHousesList[i]!.sign}" kr:slug="${secondSubjectHousesList[i]!.name}">`;
      path += `<line x1='${tX1}' y1='${tY1}' x2='${tX2}' y2='${tY2}' style='stroke: ${tLineColor}; stroke-width: 1px; stroke-opacity:${strokeOpacity};'/>`;
      path += "</g>";
    }

    const dropinMap: Partial<Record<ChartType, number>> = {
      Transit: 84,
      Synastry: 84,
      DualReturnChart: 84,
    };
    if (externalView) {
      dropin = 100;
    }
    else {
      dropin = dropinMap[chartType] ?? 48;
    }
    const xText = sliceToX(0, r - dropin, textOffset) + dropin;
    const yText = sliceToY(0, r - dropin, textOffset) + dropin;

    path += `<g kr:node="Cusp" kr:absoluteposition="${firstSubjectHousesList[i]!.abs_pos}" kr:signposition="${firstSubjectHousesList[i]!.position}" kr:sing="${firstSubjectHousesList[i]!.sign}" kr:slug="${firstSubjectHousesList[i]!.name}">`;
    path += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke: ${lineColor}; stroke-width: 1px; stroke-dasharray:3,2; stroke-opacity:.4;"/>`;
    path += "</g>";
    path += "<g kr:node=\"HouseNumber\">";
    path += `<text style="fill: var(--kerykeion-chart-color-house-number); fill-opacity: .6; font-size: 14px"><tspan x="${xText - 3}" y="${yText + 3}">${i + 1}</tspan></text>`;
    path += "</g>";
  }

  return path;
}

export function drawTransitAspectList(
  gridTitle: string,
  aspectsList: ReadonlyArray<AspectModel | Record<string, unknown>>,
  _celestialPointLanguage: KerykeionLanguageCelestialPointModel,
  aspectsSettings: ReadonlyArray<ChartAspectSetting>,
  {
    aspectsPerColumn = 14,
    columnWidth = 100,
    lineHeight = 14,
    maxColumns = 6,
    chartHeight,
    xOffset = 565,
    yOffset = 273,
  }: {
    aspectsPerColumn?: number;
    columnWidth?: number;
    lineHeight?: number;
    maxColumns?: number;
    chartHeight?: number | null;
    xOffset?: number;
    yOffset?: number;
  } = {},
): string {
  const typedAspectsList = aspectsList.map(aspect => aspect as AspectModel);
  const translateX = xOffset;
  const translateY = yOffset;
  const titleClearance = 18;
  const topLimitY = -translateY + titleClearance;
  const bottomPadding = 40;
  const baselineIndex = aspectsPerColumn - 1;
  const topLimitIndex = Math.ceil(topLimitY / lineHeight);
  const maxCapacityByTop = baselineIndex - topLimitIndex + 1;

  let innerPath = "";
  const fullHeightColumnIndex = 10;
  let fullHeightCapacity = aspectsPerColumn;

  if (chartHeight != null) {
    const availableHeight = Math.max(chartHeight - translateY - bottomPadding, lineHeight);
    const allowedCapacity = Math.max(aspectsPerColumn, Math.trunc(availableHeight / lineHeight));
    fullHeightCapacity = Math.max(aspectsPerColumn, Math.min(allowedCapacity, maxCapacityByTop));
  }

  const columns: AspectModel[][] = [];
  const columnCapacities: number[] = [];

  for (const aspect of typedAspectsList) {
    if (columns.length === 0 || columns[columns.length - 1]!.length >= columnCapacities[columnCapacities.length - 1]!) {
      const newColIndex = columns.length;
      let capacity = newColIndex < fullHeightColumnIndex ? aspectsPerColumn : fullHeightCapacity;
      capacity = Math.max(capacity, 1);
      columns.push([]);
      columnCapacities.push(capacity);
    }

    columns[columns.length - 1]!.push(aspect);
  }

  for (let colIdx = 0; colIdx < columns.length; colIdx += 1) {
    const column = columns[colIdx]!;
    const capacity = columnCapacities[colIdx]!;
    const horizontalPosition = colIdx * columnWidth;
    const columnLength = column.length;

    for (let rowIdx = 0; rowIdx < column.length; rowIdx += 1) {
      const aspect = column[rowIdx]!;
      let verticalPosition = rowIdx * lineHeight;

      if (colIdx >= fullHeightColumnIndex) {
        const verticalIndex = baselineIndex - (columnLength - 1 - rowIdx);
        verticalPosition = verticalIndex * lineHeight;
      }
      else if (colIdx >= maxColumns && capacity === aspectsPerColumn) {
        const topOffsetLines = Math.max(0, capacity - column.length);
        verticalPosition = (topOffsetLines + rowIdx) * lineHeight;
      }

      innerPath += `<g transform="translate(${horizontalPosition},${verticalPosition})">`;
      innerPath += `<use transform="scale(0.4)" x="0" y="3" xlink:href="#${aspect.p1_name}" />`;
      const idValue = aspectsSettings.find(setting => setting.name === aspect.aspect)?.degree;
      innerPath += `<use x="15" y="0" xlink:href="#orb${idValue}" />`;
      innerPath += "<g transform=\"translate(30,0)\">";
      innerPath += `<use transform="scale(0.4)" x="0" y="3" xlink:href="#${aspect.p2_name}" />`;
      innerPath += "</g>";
      innerPath += `<text y="8" x="45" style="fill: var(--kerykeion-chart-color-paper-0); font-size: 10px;">${convertDecimalToDegreeString(aspect.orbit)}</text>`;
      innerPath += "</g>";
    }
  }

  let output = `<g transform="translate(${translateX},${translateY})">`;
  output += `<text y="-15" x="0" style="fill: var(--kerykeion-chart-color-paper-0); font-size: 14px;">${gridTitle}:</text>`;
  output += innerPath;
  output += "</g>";
  return output;
}

export function calculateMoonPhaseChartParams(degreesBetweenSunAndMoon: number): {
  phase_angle: number;
  illuminated_fraction: number;
  shadow_ellipse_rx: number;
} {
  if (!Number.isFinite(degreesBetweenSunAndMoon)) {
    throw new KerykeionException(`Invalid degree value: ${degreesBetweenSunAndMoon}`);
  }

  const phaseAngle = ((degreesBetweenSunAndMoon % 360) + 360) % 360;
  const radians = (phaseAngle * Math.PI) / 180.0;
  const cosine = Math.cos(radians);
  const illuminatedFraction = Math.max(0.0, Math.min(1.0, (1.0 - cosine) / 2.0));

  return {
    phase_angle: phaseAngle,
    illuminated_fraction: illuminatedFraction,
    shadow_ellipse_rx: 10.0 * cosine,
  };
}

export function drawMainHouseGrid(
  mainSubjectHousesList: KerykeionPointModel[],
  houseCuspGeneraleNameLabel = "Cusp",
  textColor = "#000000",
  xPosition = 750,
  yPosition = 30,
): string {
  let output = `<g transform="translate(${xPosition},${yPosition})">`;
  let lineIncrement = 10;
  for (let i = 0; i < mainSubjectHousesList.length; i += 1) {
    const house = mainSubjectHousesList[i]!;
    const cuspNumber = i < 9 ? `&#160;&#160;${i + 1}` : String(i + 1);
    output += `<g transform="translate(0,${lineIncrement})"><text text-anchor="end" x="40" style="fill:${textColor}; font-size: 10px;">${houseCuspGeneraleNameLabel} ${cuspNumber}:</text><g transform="translate(40,-8)"><use transform="scale(0.3)" xlink:href="#${house.sign}" /></g><text x="53" style="fill:${textColor}; font-size: 10px;"> ${convertDecimalToDegreeString(house.position)}</text></g>`;
    lineIncrement += 14;
  }
  output += "</g>";
  return output;
}

export function drawSecondaryHouseGrid(
  secondarySubjectHousesList: KerykeionPointModel[],
  houseCuspGeneraleNameLabel = "Cusp",
  textColor = "#000000",
  xPosition = 1015,
  yPosition = 30,
): string {
  let output = `<g transform="translate(${xPosition},${yPosition})">`;
  let lineIncrement = 10;
  for (let i = 0; i < secondarySubjectHousesList.length; i += 1) {
    const house = secondarySubjectHousesList[i]!;
    const cuspNumber = i < 9 ? `&#160;&#160;${i + 1}` : String(i + 1);
    output += `<g transform="translate(0,${lineIncrement})"><text text-anchor="end" x="40" style="fill:${textColor}; font-size: 10px;">${houseCuspGeneraleNameLabel} ${cuspNumber}:</text><g transform="translate(40,-8)"><use transform="scale(0.3)" xlink:href="#${house.sign}" /></g><text x="53" style="fill:${textColor}; font-size: 10px;"> ${convertDecimalToDegreeString(house.position)}</text></g>`;
    lineIncrement += 14;
  }
  output += "</g>";
  return output;
}

export function drawMainPlanetGrid(
  planetsAndHousesGridTitle: string,
  subjectName: string,
  availableKerykeionCelestialPoints: KerykeionPointModel[],
  chartType: ChartType,
  celestialPointLanguage: KerykeionLanguageCelestialPointModel,
  textColor = "#000000",
  xPosition = 645,
  yPosition = 0,
): string {
  const baseY = 30;
  const headerY = 15;
  const lineStart = 10;
  const lineStep = 14;
  let output = `<g transform="translate(${xPosition},${yPosition})">`;

  if (chartType === "Synastry" || chartType === "Transit" || chartType === "DualReturnChart") {
    output += `<g transform="translate(0, ${headerY})"><text style="fill:${textColor}; font-size: 14px;">${planetsAndHousesGridTitle} ${subjectName}</text></g>`;
  }

  const columnThresholds = selectPlanetGridThresholds(chartType, availableKerykeionCelestialPoints.length);

  for (let i = 0; i < availableKerykeionCelestialPoints.length; i += 1) {
    const planet = availableKerykeionCelestialPoints[i]!;
    const [offset, rowIndex] = planetGridLayoutPosition(i, columnThresholds);
    const lineHeight = lineStart + rowIndex * lineStep;
    const decodedName = getDecodedKerykeionCelestialPointName(planet.name as AstrologicalPoint, celestialPointLanguage);
    output += `<g transform="translate(${offset},${baseY + lineHeight})"><text text-anchor="end" style="fill:${textColor}; font-size: 10px;">${decodedName}</text><g transform="translate(5,-8)"><use transform="scale(0.4)" xlink:href="#${planet.name}" /></g><text text-anchor="start" x="19" style="fill:${textColor}; font-size: 10px;">${convertDecimalToDegreeString(planet.position)}</text><g transform="translate(60,-8)"><use transform="scale(0.3)" xlink:href="#${planet.sign}" /></g>`;
    if (planet.retrograde) {
      output += "<g transform=\"translate(74,-6)\"><use transform=\"scale(.5)\" xlink:href=\"#retrograde\" /></g>";
    }
    output += "</g>";
  }

  output += "</g>";
  return output;
}

export function drawSecondaryPlanetGrid(
  planetsAndHousesGridTitle: string,
  secondSubjectName: string,
  secondSubjectAvailableKerykeionCelestialPoints: KerykeionPointModel[],
  chartType: ChartType,
  celestialPointLanguage: KerykeionLanguageCelestialPointModel,
  textColor = "#000000",
  xPosition = 910,
  yPosition = 0,
): string {
  const baseY = 30;
  const headerY = 15;
  const lineStart = 10;
  const lineStep = 14;
  let output = `<g transform="translate(${xPosition},${yPosition})">`;
  const headerText
    = chartType === "Transit" ? secondSubjectName : `${planetsAndHousesGridTitle} ${secondSubjectName}`;
  const headerXOffset = chartType === "Transit" ? -50 : 0;
  output += `<g transform="translate(${headerXOffset}, ${headerY})"><text style="fill:${textColor}; font-size: 14px;">${headerText}</text></g>`;

  const columnThresholds = selectPlanetGridThresholds(
    chartType,
    secondSubjectAvailableKerykeionCelestialPoints.length,
  );

  for (let i = 0; i < secondSubjectAvailableKerykeionCelestialPoints.length; i += 1) {
    const point = secondSubjectAvailableKerykeionCelestialPoints[i]!;
    const [offset, rowIndex] = planetGridLayoutPosition(i, columnThresholds);
    const lineHeight = lineStart + rowIndex * lineStep;
    const decodedName = getDecodedKerykeionCelestialPointName(point.name as AstrologicalPoint, celestialPointLanguage);
    output += `<g transform="translate(${offset},${baseY + lineHeight})"><text text-anchor="end" style="fill:${textColor}; font-size: 10px;">${decodedName}</text><g transform="translate(5,-8)"><use transform="scale(0.4)" xlink:href="#${point.name}" /></g><text text-anchor="start" x="19" style="fill:${textColor}; font-size: 10px;">${convertDecimalToDegreeString(point.position)}</text><g transform="translate(60,-8)"><use transform="scale(0.3)" xlink:href="#${point.sign}" /></g>`;
    if (point.retrograde) {
      output += "<g transform=\"translate(74,-6)\"><use transform=\"scale(.5)\" xlink:href=\"#retrograde\" /></g>";
    }
    output += "</g>";
  }

  output += "</g>";
  return output;
}

export function drawTransitAspectGrid(
  strokeColor: string,
  availablePlanets: ReadonlyArray<KerykeionSettingsCelestialPointModel>,
  aspects: ReadonlyArray<AspectModel>,
  xIndent = 50,
  yIndent = 250,
  boxSize = 14,
): string {
  let output = "";
  const style = `stroke:${strokeColor}; stroke-width: 1px; stroke-width: 0.5px; fill:none`;
  let xStart = xIndent;
  let yStart = yIndent;
  const activePlanets = availablePlanets.filter(planet => planet.is_active);
  const reversedPlanets = [...activePlanets].reverse();

  for (const planetA of reversedPlanets) {
    output += `<rect x="${xStart}" y="${yStart}" width="${boxSize}" height="${boxSize}" style="${style}"/>`;
    output += `<use transform="scale(0.4)" x="${formatScaledGlyphCoordinate((xStart + 2) * 2.5)}" y="${formatScaledGlyphCoordinate((yStart + 1) * 2.5)}" xlink:href="#${planetA.name}" />`;
    xStart += boxSize;
  }

  xStart = xIndent - boxSize;
  yStart = yIndent - boxSize;
  for (const planetA of reversedPlanets) {
    output += `<rect x="${xStart}" y="${yStart}" width="${boxSize}" height="${boxSize}" style="${style}"/>`;
    output += `<use transform="scale(0.4)" x="${formatScaledGlyphCoordinate((xStart + 2) * 2.5)}" y="${formatScaledGlyphCoordinate((yStart + 1) * 2.5)}" xlink:href="#${planetA.name}" />`;
    yStart -= boxSize;
  }

  xStart = xIndent;
  yStart = yIndent - boxSize;

  for (const planetA of reversedPlanets) {
    output += `<rect x="${xStart}" y="${yStart}" width="${boxSize}" height="${boxSize}" style="${style}"/>`;
    yStart -= boxSize;
    let xAspect = xStart;
    const yAspect = yStart + boxSize;

    for (const planetB of reversedPlanets) {
      output += `<rect x="${xAspect}" y="${yAspect}" width="${boxSize}" height="${boxSize}" style="${style}"/>`;
      xAspect += boxSize;

      for (const aspect of aspects) {
        if (aspect.p1 === planetA.id && aspect.p2 === planetB.id) {
          output += `<use  x="${xAspect - boxSize + 1}" y="${yAspect + 1}" xlink:href="#orb${aspect.aspect_degrees}" />`;
        }
      }
    }
  }

  return output;
}

export function formatLocationString(location: string, maxLength = 35): string {
  if (location.length > maxLength) {
    const splitLocation = location.split(",");
    if (splitLocation.length > 1) {
      const shortened = `${splitLocation[0]}, ${splitLocation[splitLocation.length - 1]}`;
      if (shortened.length > maxLength) {
        return `${shortened.slice(0, maxLength)}...`;
      }
      return shortened;
    }

    return `${location.slice(0, maxLength)}...`;
  }

  return location;
}

export function formatDatetimeWithTimezone(isoDatetimeString: string): string {
  const match = isoDatetimeString.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
  );
  if (match) {
    const [, datePart, timePart, offsetPart] = match;
    const formattedOffset = offsetPart === "Z" ? "+00:00" : offsetPart;
    return `${datePart} ${timePart} [${formattedOffset}]`;
  }

  return isoDatetimeString.replace("T", " ");
}

export function drawHouseComparisonGrid(
  houseComparison: HouseComparisonModel,
  celestialPointLanguage: KerykeionLanguageCelestialPointModel,
  activePoints: AstrologicalPoint[],
  {
    pointsOwnerSubjectNumber = 1,
    textColor = "var(--kerykeion-color-neutral-content)",
    housePositionComparisonLabel = "House Position Comparison",
    returnPointLabel = "Return Point",
    returnLabel = "DualReturnChart",
    radixLabel = "Radix",
    xPosition = 1100,
    yPosition = 0,
  }: {
    pointsOwnerSubjectNumber?: 1 | 2;
    textColor?: string;
    housePositionComparisonLabel?: string;
    returnPointLabel?: string;
    returnLabel?: string;
    radixLabel?: string;
    xPosition?: number;
    yPosition?: number;
  } = {},
): string {
  const comparisonData
    = pointsOwnerSubjectNumber === 1
      ? houseComparison.first_points_in_second_houses
      : houseComparison.second_points_in_first_houses;

  let output = `<g transform="translate(${xPosition},${yPosition})">`;
  output += `<text text-anchor="start" x="0" y="-15" style="fill:${textColor}; font-size: 14px;">${housePositionComparisonLabel}</text>`;

  let lineIncrement = 10;
  output += `<g transform="translate(0,${lineIncrement})"><text text-anchor="start" x="0" style="fill:${textColor}; font-weight: bold; font-size: 10px;">${returnPointLabel}</text><text text-anchor="start" x="77" style="fill:${textColor}; font-weight: bold; font-size: 10px;">${returnLabel}</text><text text-anchor="start" x="132" style="fill:${textColor}; font-weight: bold; font-size: 10px;">${radixLabel}</text></g>`;
  lineIncrement += 15;

  const allPointsByName: Record<string, { name: string; secondary_house: number | string; native_house: number | string }> = {};
  for (const point of comparisonData) {
    if (activePoints.includes(point.point_name as AstrologicalPoint) && !(point.point_name in allPointsByName)) {
      allPointsByName[point.point_name] = {
        name: point.point_name,
        secondary_house: point.projected_house_number ?? "-",
        native_house: point.point_owner_house_number ?? "-",
      };
    }
  }

  for (const [name, pointData] of Object.entries(allPointsByName)) {
    output += `<g transform="translate(0,${lineIncrement})"><g transform="translate(0,-9)"><use transform="scale(0.4)" xlink:href="#${name}" /></g><text text-anchor="start" x="15" style="fill:${textColor}; font-size: 10px;">${getDecodedKerykeionCelestialPointName(name, celestialPointLanguage)}</text><text text-anchor="start" x="90" style="fill:${textColor}; font-size: 10px;">${pointData.native_house}</text><text text-anchor="start" x="140" style="fill:${textColor}; font-size: 10px;">${pointData.secondary_house}</text></g>`;
    lineIncrement += 12;
  }

  output += "</g>";
  return output;
}

export function drawSingleHouseComparisonGrid(
  houseComparison: HouseComparisonModel,
  celestialPointLanguage: KerykeionLanguageCelestialPointModel,
  activePoints: AstrologicalPoint[],
  {
    pointsOwnerSubjectNumber = 1,
    textColor = "var(--kerykeion-color-neutral-content)",
    housePositionComparisonLabel = "House Position Comparison",
    returnPointLabel = "Return Point",
    natalHouseLabel = "Natal House",
    xPosition = 1030,
    yPosition = 0,
  }: {
    pointsOwnerSubjectNumber?: 1 | 2;
    textColor?: string;
    housePositionComparisonLabel?: string;
    returnPointLabel?: string;
    natalHouseLabel?: string;
    xPosition?: number;
    yPosition?: number;
  } = {},
): string {
  const comparisonData
    = pointsOwnerSubjectNumber === 1
      ? houseComparison.first_points_in_second_houses
      : houseComparison.second_points_in_first_houses;

  let output = `<g transform="translate(${xPosition},${yPosition})">`;
  output += `<text text-anchor="start" x="0" y="-15" style="fill:${textColor}; font-size: 14px;">${housePositionComparisonLabel}</text>`;

  let lineIncrement = 10;
  output += `<g transform="translate(0,${lineIncrement})"><text text-anchor="start" x="0" style="fill:${textColor}; font-weight: bold; font-size: 10px;">${returnPointLabel}</text><text text-anchor="start" x="77" style="fill:${textColor}; font-weight: bold; font-size: 10px;">${natalHouseLabel}</text></g>`;
  lineIncrement += 15;

  const allPointsByName: Record<string, { name: string; house: number | string }> = {};
  for (const point of comparisonData) {
    if (activePoints.includes(point.point_name as AstrologicalPoint) && !(point.point_name in allPointsByName)) {
      allPointsByName[point.point_name] = { name: point.point_name, house: point.projected_house_number ?? "-" };
    }
  }

  for (const [name, pointData] of Object.entries(allPointsByName)) {
    output += `<g transform="translate(0,${lineIncrement})"><g transform="translate(0,-9)"><use transform="scale(0.4)" xlink:href="#${name}" /></g><text text-anchor="start" x="15" style="fill:${textColor}; font-size: 10px;">${getDecodedKerykeionCelestialPointName(name, celestialPointLanguage)}</text><text text-anchor="start" x="90" style="fill:${textColor}; font-size: 10px;">${pointData.house}</text></g>`;
    lineIncrement += 12;
  }

  output += "</g>";
  return output;
}

export function drawCuspComparisonGrid(
  houseComparison: HouseComparisonModel,
  _celestialPointLanguage: KerykeionLanguageCelestialPointModel,
  {
    cuspsOwnerSubjectNumber = 1,
    textColor = "var(--kerykeion-color-neutral-content)",
    cuspPositionComparisonLabel = "Cusp Position Comparison",
    ownerCuspLabel = "Owner Cusp",
    projectedHouseLabel = "Projected House",
    xPosition = 1030,
    yPosition = 0,
  }: {
    cuspsOwnerSubjectNumber?: 1 | 2;
    textColor?: string;
    cuspPositionComparisonLabel?: string;
    ownerCuspLabel?: string;
    projectedHouseLabel?: string;
    xPosition?: number;
    yPosition?: number;
  } = {},
): string {
  const cuspsData
    = cuspsOwnerSubjectNumber === 1
      ? houseComparison.first_cusps_in_second_houses
      : houseComparison.second_cusps_in_first_houses;

  if (cuspsData.length === 0) {
    return "";
  }

  let output = `<g transform="translate(${xPosition},${yPosition})"><text text-anchor="start" x="0" y="-15" style="fill:${textColor}; font-size: 12px; font-weight: bold;">${cuspPositionComparisonLabel}</text>`;
  let lineIncrement = 10;
  output += `<g transform="translate(0,${lineIncrement})"><text text-anchor="start" x="0" style="fill:${textColor}; font-weight: bold; font-size: 10px;">${ownerCuspLabel}</text><text text-anchor="start" x="70" style="fill:${textColor}; font-weight: bold; font-size: 10px;">${projectedHouseLabel}</text></g>`;
  lineIncrement += 15;

  const cuspCellLabel = ownerCuspLabel ? ownerCuspLabel.split(" ").slice(-1)[0]! : "Cusp";
  for (const cusp of cuspsData) {
    const ownerHouseNumber = cusp.point_owner_house_number ?? 0;
    const ownerHouseDisplay = ownerHouseNumber ? `${cuspCellLabel} ${ownerHouseNumber}` : "-";
    const projectedHouseDisplay = String(cusp.projected_house_number ?? "-");
    output += `<g transform="translate(0,${lineIncrement})"><text text-anchor="start" x="0" style="fill:${textColor}; font-size: 10px;">${ownerHouseDisplay}</text><text text-anchor="start" x="70" style="fill:${textColor}; font-size: 10px;">${projectedHouseDisplay}</text></g>`;
    lineIncrement += 12;
  }

  output += "</g>";
  return output;
}

export function drawSingleCuspComparisonGrid(
  houseComparison: HouseComparisonModel,
  celestialPointLanguage: KerykeionLanguageCelestialPointModel,
  options: {
    cuspsOwnerSubjectNumber?: 1 | 2;
    textColor?: string;
    cuspPositionComparisonLabel?: string;
    ownerCuspLabel?: string;
    projectedHouseLabel?: string;
    xPosition?: number;
    yPosition?: number;
  } = {},
): string {
  return drawCuspComparisonGrid(houseComparison, celestialPointLanguage, options);
}

export function makeLunarPhase(degreesBetweenSunAndMoon: number, latitude: number): string {
  void latitude;
  const params = calculateMoonPhaseChartParams(degreesBetweenSunAndMoon);
  const phaseAngle = params.phase_angle;
  const illuminatedFraction = 1.0 - params.illuminated_fraction;
  const shadowEllipseRx = Math.abs(params.shadow_ellipse_rx);
  const radius = 10.0;
  const centerX = 20.0;
  const centerY = 10.0;

  const brightColor = "var(--kerykeion-chart-color-lunar-phase-1)";
  const shadowColor = "var(--kerykeion-chart-color-lunar-phase-0)";
  const isWaxing = phaseAngle < 180.0;

  let baseFill: string;
  let overlayPath = "";
  let overlayFill = "";

  if (illuminatedFraction <= 1e-6) {
    baseFill = shadowColor;
  }
  else if (1.0 - illuminatedFraction <= 1e-6) {
    baseFill = brightColor;
  }
  else {
    const isLitMajor = illuminatedFraction >= 0.5;
    if (isLitMajor) {
      baseFill = brightColor;
      overlayFill = shadowColor;
    }
    else {
      baseFill = shadowColor;
      overlayFill = brightColor;
    }

    const overlaySide = isLitMajor ? (isWaxing ? "left" : "right") : isWaxing ? "right" : "left";

    const buildLunePath = (side: "left" | "right", ellipseRx: number): string => {
      const normalizedRx = Math.max(0.0, Math.min(radius, ellipseRx));
      const topY = centerY - radius;
      const bottomY = centerY + radius;
      const circleSweep = side === "right" ? 1 : 0;

      if (normalizedRx <= 1e-6) {
        return `M ${centerX.toFixed(4)} ${topY.toFixed(4)} A ${radius.toFixed(4)} ${radius.toFixed(4)} 0 0 ${circleSweep} ${centerX.toFixed(4)} ${bottomY.toFixed(4)} L ${centerX.toFixed(4)} ${topY.toFixed(4)} Z`;
      }

      return `M ${centerX.toFixed(4)} ${topY.toFixed(4)} A ${radius.toFixed(4)} ${radius.toFixed(4)} 0 0 ${circleSweep} ${centerX.toFixed(4)} ${bottomY.toFixed(4)} A ${normalizedRx.toFixed(4)} ${radius.toFixed(4)} 0 0 ${circleSweep} ${centerX.toFixed(4)} ${topY.toFixed(4)} Z`;
    };

    overlayPath = buildLunePath(overlaySide, shadowEllipseRx);
  }

  const lines = [
    "<g transform=\"rotate(0 20 10)\">",
    "    <defs>",
    "        <clipPath id=\"moonPhaseCutOffCircle\">",
    "            <circle cx=\"20\" cy=\"10\" r=\"10\" />",
    "        </clipPath>",
    "    </defs>",
    `    <circle cx="20" cy="10" r="10" style="fill: ${baseFill}" />`,
  ];

  if (overlayPath) {
    lines.push(
      `    <path d="${overlayPath}" style="fill: ${overlayFill}" clip-path="url(#moonPhaseCutOffCircle)" />`,
    );
  }

  lines.push(
    "    <circle cx=\"20\" cy=\"10\" r=\"10\" style=\"fill: none; stroke: var(--kerykeion-chart-color-lunar-phase-0); stroke-width: 0.5px; stroke-opacity: 0.5\" />",
  );
  lines.push("</g>");
  return lines.join("\n");
}

export {
  planetGridLayoutPosition as _planet_grid_layout_position,
  selectPlanetGridThresholds as _select_planet_grid_thresholds,
  calculateMoonPhaseChartParams as calculate_moon_phase_chart_params,
  convertDecimalToDegreeString as convert_decimal_to_degree_string,
  convertLatitudeCoordinateToString as convert_latitude_coordinate_to_string,
  convertLongitudeCoordinateToString as convert_longitude_coordinate_to_string,
  drawAspectGrid as draw_aspect_grid,
  drawAspectLine as draw_aspect_line,
  drawBackgroundCircle as draw_background_circle,
  drawCuspComparisonGrid as draw_cusp_comparison_grid,
  drawDegreeRing as draw_degree_ring,
  drawFirstCircle as draw_first_circle,
  drawHouseComparisonGrid as draw_house_comparison_grid,
  drawHousesCuspsAndTextNumber as draw_houses_cusps_and_text_number,
  drawMainHouseGrid as draw_main_house_grid,
  drawMainPlanetGrid as draw_main_planet_grid,
  drawSecondCircle as draw_second_circle,
  drawSecondaryHouseGrid as draw_secondary_house_grid,
  drawSecondaryPlanetGrid as draw_secondary_planet_grid,
  drawSingleCuspComparisonGrid as draw_single_cusp_comparison_grid,
  drawSingleHouseComparisonGrid as draw_single_house_comparison_grid,
  drawThirdCircle as draw_third_circle,
  drawTransitAspectGrid as draw_transit_aspect_grid,
  drawTransitAspectList as draw_transit_aspect_list,
  drawTransitRing as draw_transit_ring,
  drawTransitRingDegreeSteps as draw_transit_ring_degree_steps,
  drawZodiacSlice as draw_zodiac_slice,
  formatDatetimeWithTimezone as format_datetime_with_timezone,
  formatLocationString as format_location_string,
  getDecodedKerykeionCelestialPointName as get_decoded_kerykeion_celestial_point_name,
};
