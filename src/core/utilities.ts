import type { AstrologicalPoint, House, LunarPhaseEmoji, LunarPhaseName, PointType, ZodiacType } from "./schemas/literals";

import type {
  AstrologicalBaseModel,
  AstrologicalSubjectModel,
  KerykeionPointModel,
  LunarPhaseModel,
  ZodiacSignModel,
} from "./schemas/models";
import { Temporal } from "@js-temporal/polyfill";
import { KerykeionException } from "./schemas/kerykeion-exception";
import {

  houses,

  lunarPhaseEmojis,
  lunarPhaseNames,

} from "./schemas/literals";

const pointNumberMap: Record<string, number> = {
  Sun: 0,
  Moon: 1,
  Mercury: 2,
  Venus: 3,
  Mars: 4,
  Jupiter: 5,
  Saturn: 6,
  Uranus: 7,
  Neptune: 8,
  Pluto: 9,
  Mean_North_Lunar_Node: 10,
  True_North_Lunar_Node: 11,
  Mean_South_Lunar_Node: 1000,
  True_South_Lunar_Node: 1100,
  Chiron: 15,
  Mean_Lilith: 12,
  Ascendant: 9900,
  Descendant: 9901,
  Medium_Coeli: 9902,
  Imum_Coeli: 9903,
};

const zodiacSigns: Record<number, ZodiacSignModel> = {
  0: { sign: "Ari", quality: "Cardinal", element: "Fire", emoji: "♈️", sign_num: 0 },
  1: { sign: "Tau", quality: "Fixed", element: "Earth", emoji: "♉️", sign_num: 1 },
  2: { sign: "Gem", quality: "Mutable", element: "Air", emoji: "♊️", sign_num: 2 },
  3: { sign: "Can", quality: "Cardinal", element: "Water", emoji: "♋️", sign_num: 3 },
  4: { sign: "Leo", quality: "Fixed", element: "Fire", emoji: "♌️", sign_num: 4 },
  5: { sign: "Vir", quality: "Mutable", element: "Earth", emoji: "♍️", sign_num: 5 },
  6: { sign: "Lib", quality: "Cardinal", element: "Air", emoji: "♎️", sign_num: 6 },
  7: { sign: "Sco", quality: "Fixed", element: "Water", emoji: "♏️", sign_num: 7 },
  8: { sign: "Sag", quality: "Mutable", element: "Fire", emoji: "♐️", sign_num: 8 },
  9: { sign: "Cap", quality: "Cardinal", element: "Earth", emoji: "♑️", sign_num: 9 },
  10: { sign: "Aqu", quality: "Fixed", element: "Air", emoji: "♒️", sign_num: 10 },
  11: { sign: "Pis", quality: "Mutable", element: "Water", emoji: "♓️", sign_num: 11 },
};

const houseNames: Record<number, House> = {
  1: "First_House",
  2: "Second_House",
  3: "Third_House",
  4: "Fourth_House",
  5: "Fifth_House",
  6: "Sixth_House",
  7: "Seventh_House",
  8: "Eighth_House",
  9: "Ninth_House",
  10: "Tenth_House",
  11: "Eleventh_House",
  12: "Twelfth_House",
};

const houseNumbers: Record<House, number> = Object.fromEntries(
  Object.entries(houseNames).map(([number, name]) => [name, Number(number)]),
) as Record<House, number>;

export function normalizeZodiacType(value: string): ZodiacType {
  const valueLower = value.toLowerCase();
  if (valueLower === "tropical" || valueLower === "tropic") {
    return "Tropical";
  }
  if (valueLower === "sidereal") {
    return "Sidereal";
  }
  throw new ValueError(
    `'${value}' is not a valid zodiac type. Accepted values are: Tropical, Sidereal (case-insensitive, 'tropic' also accepted as legacy).`,
  );
}

class ValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValueError";
  }
}

export function getNumberFromName(name: AstrologicalPoint): number {
  const pointNumber = pointNumberMap[String(name)];
  if (pointNumber === undefined) {
    throw new KerykeionException(`Error in getting number from name! Name: ${name}`);
  }
  return pointNumber;
}

export function getKerykeionPointFromDegree(
  degree: number,
  name: AstrologicalPoint | House,
  pointType: PointType,
  speed: number | null = null,
  declination: number | null = null,
  magnitude: number | null = null,
): KerykeionPointModel {
  let normalizedDegree = degree;
  if (normalizedDegree < 0) {
    normalizedDegree %= 360;
    if (normalizedDegree < 0) {
      normalizedDegree += 360;
    }
  }

  if (normalizedDegree >= 360) {
    throw new KerykeionException(`Error in calculating positions! Degrees: ${normalizedDegree}`);
  }

  const signIndex = Math.floor(normalizedDegree / 30);
  const signDegree = normalizedDegree % 30;
  const zodiacSign = zodiacSigns[signIndex];
  if (!zodiacSign) {
    throw new KerykeionException(`Invalid zodiac sign index: ${signIndex}`);
  }

  return {
    name,
    quality: zodiacSign.quality,
    element: zodiacSign.element,
    sign: zodiacSign.sign,
    sign_num: zodiacSign.sign_num,
    position: signDegree,
    abs_pos: normalizedDegree,
    emoji: zodiacSign.emoji,
    point_type: pointType,
    speed,
    declination,
    magnitude,
  };
}

export function isPointBetween(startAngle: number, endAngle: number, candidate: number): boolean {
  const normalize = (value: number): number => ((value % 360) + 360) % 360;

  const start = normalize(startAngle);
  const end = normalize(endAngle);
  const target = normalize(candidate);
  const span = (end - start + 360) % 360;

  if (span > 180) {
    throw new KerykeionException(
      `The angle between start and end point is not allowed to exceed 180°, yet is: ${span}`,
    );
  }
  if (Math.abs(target - start) < 1e-12) {
    return true;
  }
  if (Math.abs(target - end) < 1e-12) {
    return false;
  }

  const distanceFromStart = (target - start + 360) % 360;
  return distanceFromStart < span;
}

export function getPlanetHouse(planetDegree: number, housesDegreeUtList: number[]): House {
  for (let index = 0; index < houses.length; index += 1) {
    const startDegree = housesDegreeUtList[index]!;
    const endDegree = housesDegreeUtList[(index + 1) % housesDegreeUtList.length]!;
    if (isPointBetween(startDegree, endDegree, planetDegree)) {
      return houses[index]!;
    }
  }
  throw new ValueError(
    `Error in house calculation, planet: ${planetDegree}, houses: ${JSON.stringify(housesDegreeUtList)}`,
  );
}

export function getHouseName(houseNumber: number): House {
  const name = houseNames[houseNumber];
  if (!name) {
    throw new ValueError(`Invalid house number: ${houseNumber}`);
  }
  return name;
}

export function getHouseNumber(houseName: House): number {
  const number = houseNumbers[houseName];
  if (!number) {
    throw new ValueError(`Invalid house name: ${houseName}`);
  }
  return number;
}

export function getHousesList(subject: AstrologicalBaseModel): KerykeionPointModel[] {
  return subject.houses_names_list.map((house) => {
    const point = subject[house.toLowerCase() as keyof AstrologicalBaseModel];
    return point as KerykeionPointModel;
  });
}

export function getAvailableAstrologicalPointsList(subject: AstrologicalSubjectModel): KerykeionPointModel[] {
  return subject.active_points.map((planet) => {
    const point = subject[planet.toLowerCase() as keyof AstrologicalSubjectModel];
    return point as KerykeionPointModel;
  });
}

export function findCommonActivePoints(
  firstPoints: AstrologicalPoint[],
  secondPoints: AstrologicalPoint[],
): AstrologicalPoint[] {
  return [...new Set(firstPoints.filter(point => secondPoints.includes(point)))].sort();
}

function getLunarPhaseIndex(phase: number): number {
  if (phase === 1) {
    return 0;
  }
  if (phase < 7) {
    return 1;
  }
  if (phase >= 7 && phase <= 9) {
    return 2;
  }
  if (phase < 14) {
    return 3;
  }
  if (phase === 14) {
    return 4;
  }
  if (phase < 20) {
    return 5;
  }
  if (phase >= 20 && phase <= 22) {
    return 6;
  }
  if (phase <= 28) {
    return 7;
  }
  throw new KerykeionException(`Error in lunar phase calculation! Phase: ${phase}`);
}

export function getMoonEmojiFromPhaseInt(phase: number): LunarPhaseEmoji {
  return lunarPhaseEmojis[getLunarPhaseIndex(phase)]!;
}

export function getMoonPhaseNameFromPhaseInt(phase: number): LunarPhaseName {
  return lunarPhaseNames[getLunarPhaseIndex(phase)]!;
}

export function checkAndAdjustPolarLatitude(latitude: number): number {
  if (latitude > 66.0) {
    return 66.0;
  }
  if (latitude < -66.0) {
    return -66.0;
  }
  return latitude;
}

export function circularMean(firstPosition: number, secondPosition: number): number {
  const x = (Math.cos((firstPosition * Math.PI) / 180) + Math.cos((secondPosition * Math.PI) / 180)) / 2;
  const y = (Math.sin((firstPosition * Math.PI) / 180) + Math.sin((secondPosition * Math.PI) / 180)) / 2;
  let meanPosition = (Math.atan2(y, x) * 180) / Math.PI;
  if (meanPosition < 0) {
    meanPosition += 360;
  }
  return meanPosition;
}

export function circularSort<T extends number>(degrees: T[]): T[] {
  if (!degrees.length) {
    throw new ValueError("Input list cannot be empty");
  }
  if (!degrees.every(degree => typeof degree === "number" && Number.isFinite(degree))) {
    const invalid = degrees.find(degree => typeof degree !== "number" || Number.isNaN(degree));
    throw new ValueError(`All elements must be numeric, found: ${String(invalid)}`);
  }
  if (degrees.length <= 1) {
    return [...degrees];
  }

  const reference = degrees[0]!;
  const clockwiseDistance = (angle: number): number => {
    const refNorm = ((reference % 360) + 360) % 360;
    const angleNorm = ((angle % 360) + 360) % 360;
    let distance = angleNorm - refNorm;
    if (distance < 0) {
      distance += 360;
    }
    return distance;
  };

  const remaining = degrees.slice(1).sort((left, right) => clockwiseDistance(left) - clockwiseDistance(right));
  return [reference, ...remaining] as T[];
}

export function datetimeToJulian(dt: Date): number {
  const zoned = Temporal.Instant.fromEpochMilliseconds(dt.getTime()).toZonedDateTimeISO("UTC");

  let year = zoned.year;
  let month = zoned.month;
  const day = zoned.day;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);

  let jd
    = Math.floor(365.25 * (year + 4716))
      + Math.floor(30.6001 * (month + 1))
      + day
      + b
      - 1524.5;

  const hour = zoned.hour;
  const minute = zoned.minute;
  const second = zoned.second;
  const microsecond = Math.floor(zoned.millisecond * 1000);

  jd += (hour + minute / 60 + second / 3600 + microsecond / 3600000000) / 24;
  return jd;
}

export function julianToDatetime(jd: number): Date {
  const jdPlus = jd + 0.5;
  const z = Math.trunc(jdPlus);
  const f = jdPlus - z;

  let a: number;
  if (z < 2299161) {
    a = z;
  }
  else {
    const alpha = Math.trunc((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.trunc(alpha / 4);
  }

  const b = a + 1524;
  const c = Math.trunc((b - 122.1) / 365.25);
  const d = Math.trunc(365.25 * c);
  const e = Math.trunc((b - d) / 30.6001);

  const day = b - d - Math.trunc(30.6001 * e) + f;
  const dayInt = Math.trunc(day);
  const dayFrac = day - dayInt;

  const hours = Math.trunc(dayFrac * 24);
  const minutes = Math.trunc((dayFrac * 24 - hours) * 60);
  const seconds = Math.trunc((dayFrac * 24 * 60 - hours * 60 - minutes) * 60);
  const microseconds = Math.trunc((((dayFrac * 24 * 60 - hours * 60 - minutes) * 60) - seconds) * 1_000_000);

  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;

  return new Date(Date.UTC(year, month - 1, dayInt, hours, minutes, seconds, Math.trunc(microseconds / 1000)));
}

export function inlineCssVariablesInSvg(svgContent: string): string {
  const cssVariableMap = new Map<string, string>();
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const styleTagPattern = /<style.*?>(.*?)<\/style>/gs;
  const styleBlocks = [...svgContent.matchAll(styleTagPattern)];

  for (const styleBlock of styleBlocks) {
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const cssVariablePattern = /--([\w-]+)\s*:\s*([^;]+);/g;
    const content = styleBlock[1] ?? "";
    for (const match of content.matchAll(cssVariablePattern)) {
      cssVariableMap.set(`--${match[1]}`, match[2]!.trim());
    }
  }

  let processedSvg = svgContent.replace(styleTagPattern, "");
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const variableUsagePattern = /var\(\s*(--[\w-]+)\s*(?:(,\s*([^)]+))\s*)?\)/g;

  while (variableUsagePattern.test(processedSvg)) {
    variableUsagePattern.lastIndex = 0;
    processedSvg = processedSvg.replace(variableUsagePattern, (_, variableName: string, __: string, fallbackValue?: string) => {
      const replacement = cssVariableMap.get(variableName);
      if (replacement !== undefined) {
        return replacement;
      }
      return fallbackValue?.trim() ?? "";
    });
  }

  return processedSvg;
}

export function distributePercentagesTo100(values: Record<string, number>): Record<string, number> {
  const keys = Object.keys(values);
  if (!keys.length) {
    return {};
  }

  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return Object.fromEntries(keys.map(key => [key, 0]));
  }

  const percentages = Object.fromEntries(keys.map(key => [key, (values[key] ?? 0) * 100 / total]));
  const integerParts = Object.fromEntries(keys.map(key => [key, Math.trunc(percentages[key] ?? 0)]));
  const remainders = Object.fromEntries(keys.map(key => [key, (percentages[key] ?? 0) - (integerParts[key] ?? 0)]));

  const currentSum = Object.values(integerParts).reduce((sum, value) => sum + value, 0);
  const needed = 100 - currentSum;

  const sortedByRemainder = Object.entries(remainders).sort((left, right) => right[1] - left[1]);
  const result = { ...integerParts };

  for (let index = 0; index < needed && index < sortedByRemainder.length; index += 1) {
    const [key] = sortedByRemainder[index]!;
    result[key] = (result[key] ?? 0) + 1;
  }

  return result;
}

export function calculateMoonPhase(moonAbsPos: number, sunAbsPos: number): LunarPhaseModel {
  const degreesBetween = ((moonAbsPos - sunAbsPos) % 360 + 360) % 360;
  const step = 360 / 28;
  const moonPhase = Math.trunc(degreesBetween / step) + 1;

  return {
    degrees_between_s_m: degreesBetween,
    moon_phase: moonPhase,
    moon_emoji: getMoonEmojiFromPhaseInt(moonPhase),
    moon_phase_name: getMoonPhaseNameFromPhaseInt(moonPhase),
  };
}

export { ValueError };
