import type { ChartType } from "../schemas/literals";
import type { AspectModel, KerykeionPointModel } from "../schemas/models";
import type {
  ChartAspectSetting,
  KerykeionSettingsCelestialPointModel,
} from "../settings/chart-defaults";

export const CENTER = 50.0;

export const R_ASPECT = 19.5;
export const R_HOUSE_INNER = 19.5;
export const R_HOUSE_OUTER = 22.0;
export const R_PLANET_INNER = 22.0;
export const R_PLANET_OUTER = 43.5;
export const R_RULER_INNER = 43.5;
export const R_RULER_OUTER = 44.5;
export const R_CUSP_INNER = 44.5;
export const R_CUSP_OUTER = 50.0;
export const R_ZODIAC_BG_INNER = 46.0;
export const R_ZODIAC_BG_OUTER = 50.0;
export const ZODIAC_BG_SCALE = R_ZODIAC_BG_INNER / R_CUSP_OUTER;
export const HOUSE_LINE_OUTER_Y = 6.5;
export const HOUSE_LINE_INNER_Y = 28.0;
export const ANGULAR_HOUSES = new Set([1, 4, 7, 10]);
export const ANGULAR_STROKE_WIDTH = 0.6;
export const NORMAL_STROKE_WIDTH = 0.07;
export const PLANET_MIN_SEPARATION = 8.0;
export const CUSP_FONT_SIZE = 2.0;
export const PLANET_SCALE_BASE = 0.135;
export const DEGREES_FONT_SIZE = 2;
export const SIGN_SCALE_BASE = 0.078;
export const MINUTES_FONT_SIZE = 1.85;
export const RX_FONT_SIZE = 1.6;

export const SYN_R_ASPECT = 12.5;
export const SYN_R_HOUSE_INNER = 12.5;
export const SYN_R_HOUSE_OUTER = 15.5;
export const SYN_R_INNER_PLANET_INNER = 15.5;
export const SYN_R_INNER_PLANET_OUTER = 29.5;
export const SYN_R_OUTER_PLANET_INNER = 29.5;
export const SYN_R_OUTER_PLANET_OUTER = 43.5;
export const SYN_HOUSE_LINE_OUTER_Y1 = 6.5;
export const SYN_HOUSE_LINE_OUTER_Y2 = 20.5;
export const SYN_HOUSE_LINE_INNER_Y1 = 20.5;
export const SYN_HOUSE_LINE_INNER_Y2 = 34.5;
export const SYN_INDICATOR_START_Y = 20.5;
export const SYN_INDICATOR_TICK = 0.7;
export const SYN_INDICATOR_ARC_R_OUTWARD = 30.2;
export const SYN_INDICATOR_ARC_R_INWARD = 28.8;
export const SYN_OUTER_PLANET_GLYPH_Y = 9.0;
export const SYN_OUTER_DEGREES_Y = 12.0;
export const SYN_OUTER_SIGN_Y = 14.5;
export const SYN_OUTER_MINUTES_Y = 16.5;
export const SYN_OUTER_RX_Y = 18.5;
export const SYN_INNER_PLANET_GLYPH_Y = 22.5;
export const SYN_INNER_DEGREES_Y = 25.0;
export const SYN_INNER_SIGN_Y = 27.5;
export const SYN_INNER_MINUTES_Y = 29.5;
export const SYN_INNER_RX_Y = 31.5;
export const SYN_PLANET_SCALE = 0.115;
export const SYN_PLANET_SCALE_INNER = 0.095;
export const SYN_DEGREES_FONT_SIZE_INNER = 1.6;
export const SYN_DEGREES_FONT_SIZE = 1.9;
export const SYN_SIGN_SCALE = 0.062;
export const SYN_MINUTES_FONT_SIZE = 1.4;
export const SYN_RX_FONT_SIZE = 1.2;

export const COLOR_BACKGROUND = "var(--kerykeion-chart-color-paper-1, #ffffff)";
export const COLOR_PLANET_RING = "var(--kerykeion-modern-planet-ring, #e8e8ed)";
export const COLOR_OUTER_PLANET_RING = "var(--kerykeion-modern-planet-ring-outer, #d8d9e4)";
export const COLOR_HOUSE_RING = "var(--kerykeion-modern-house-ring, #d5d5dd)";
export const COLOR_STROKE = "var(--kerykeion-modern-stroke, #b0b0bf)";
export const COLOR_TEXT = "var(--kerykeion-chart-color-paper-0, #333333)";
export const COLOR_RETROGRADE = "var(--kerykeion-modern-retrograde, #c43a5e)";
export const COLOR_INDICATOR = "var(--kerykeion-modern-indicator, #8a8a9e)";
export const COLOR_WHITE = "var(--kerykeion-chart-color-paper-1, #ffffff)";
export const COLOR_ZODIAC_BG_OPACITY = "var(--kerykeion-modern-zodiac-bg-opacity, 0.5)";

export const GLYPH_SCALE_MAP: Record<string, number> = {
  Sun: 1.1,
  Moon: 1.0,
  Mercury: 1.0,
  Venus: 1.0,
  Mars: 0.95,
  Jupiter: 0.95,
  Saturn: 0.95,
  Uranus: 0.95,
  Neptune: 0.95,
  Pluto: 1.0,
  Chiron: 0.95,
  Mean_Lilith: 1.0,
  True_Lilith: 1.0,
  Mean_North_Lunar_Node: 0.95,
  True_North_Lunar_Node: 0.95,
  Ascendant: 0.95,
  Medium_Coeli: 0.95,
};

export const ZODIAC_OUTER_SCALE_MAP: Record<string, number> = {
  Ari: 0.9,
  Tau: 0.9,
  Gem: 0.9,
  Can: 0.9,
  Leo: 0.9,
  Vir: 0.9,
  Lib: 0.9,
  Sco: 0.9,
  Sag: 0.9,
  Cap: 0.9,
  Aqu: 0.9,
  Pis: 0.9,
};

export const ZODIAC_INNER_SCALE_MAP = { ...ZODIAC_OUTER_SCALE_MAP };

const ZODIAC_SIGN_IDS = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"];

export interface PlanetRingConfig {
  glyph_y?: number;
  degrees_y?: number;
  sign_y?: number;
  minutes_y?: number;
  rx_y?: number;
}

export interface IndicatorConfig {
  start_y?: number;
  tick_length?: number;
  arc_radius?: number | null;
}

export interface PlanetScaleConfig {
  planet_scale_base?: number;
  degrees_font_size?: number;
  sign_scale_base?: number;
  minutes_font_size?: number;
  rx_font_size?: number;
}

interface ResolvedPlanet {
  angle: number;
  display_angle: number;
  point: KerykeionPointModel;
  color: string;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

export function pointOnCircle(angleDeg: number, radius: number): [number, number] {
  const rad = degToRad(-angleDeg - 90);
  const x = CENTER + radius * Math.cos(rad);
  const y = CENTER + radius * Math.sin(rad);
  return [x, y];
}

export function normalizeAngle(angle: number): number {
  return ((angle % 360.0) + 360.0) % 360.0;
}

export function zodiacToWheelAngle(absPos: number, seventhHouseDegreeUt: number): number {
  return normalizeAngle(absPos - seventhHouseDegreeUt + 180);
}

export function annulusPath(outerR: number, innerR: number): string {
  let path
    = `M ${CENTER - outerR},${CENTER} `
      + `A ${outerR},${outerR} 0 1,1 ${CENTER + outerR},${CENTER} `
      + `A ${outerR},${outerR} 0 1,1 ${CENTER - outerR},${CENTER} `;

  if (innerR > 0) {
    path
      += `M ${CENTER - innerR},${CENTER} `
        + `A ${innerR},${innerR} 0 1,1 ${CENTER + innerR},${CENTER} `
        + `A ${innerR},${innerR} 0 1,1 ${CENTER - innerR},${CENTER} `;
  }

  path += "Z";
  return path;
}

export function drawZodiacBackgroundRing(seventhHouseDegreeUt: number): string {
  let output = "<g kr:node=\"ZodiacBackgrounds\">\n";
  const rMid = (R_ZODIAC_BG_INNER + R_ZODIAC_BG_OUTER) / 2.0;
  const glyphScale = 0.09;

  for (let signNum = 0; signNum < 12; signNum += 1) {
    const startAbs = signNum * 30.0;
    const endAbs = startAbs + 30.0;
    const midAbs = startAbs + 15.0;
    const startAngle = zodiacToWheelAngle(startAbs, seventhHouseDegreeUt);
    const endAngle = zodiacToWheelAngle(endAbs, seventhHouseDegreeUt);
    const midAngle = zodiacToWheelAngle(midAbs, seventhHouseDegreeUt);
    const color = `var(--kerykeion-modern-zodiac-bg-${signNum})`;

    const startRad = (-startAngle - 90) * (Math.PI / 180);
    const endRad = (-endAngle - 90) * (Math.PI / 180);

    const ox1 = CENTER + R_ZODIAC_BG_OUTER * Math.cos(startRad);
    const oy1 = CENTER + R_ZODIAC_BG_OUTER * Math.sin(startRad);
    const ox2 = CENTER + R_ZODIAC_BG_OUTER * Math.cos(endRad);
    const oy2 = CENTER + R_ZODIAC_BG_OUTER * Math.sin(endRad);
    const ix1 = CENTER + R_ZODIAC_BG_INNER * Math.cos(endRad);
    const iy1 = CENTER + R_ZODIAC_BG_INNER * Math.sin(endRad);
    const ix2 = CENTER + R_ZODIAC_BG_INNER * Math.cos(startRad);
    const iy2 = CENTER + R_ZODIAC_BG_INNER * Math.sin(startRad);

    output
      += `  <path d="M ${ox1.toFixed(6)},${oy1.toFixed(6)} `
        + `A ${R_ZODIAC_BG_OUTER},${R_ZODIAC_BG_OUTER} 0 0,0 ${ox2.toFixed(6)},${oy2.toFixed(6)} `
        + `L ${ix1.toFixed(6)},${iy1.toFixed(6)} `
        + `A ${R_ZODIAC_BG_INNER},${R_ZODIAC_BG_INNER} 0 0,1 ${ix2.toFixed(6)},${iy2.toFixed(6)} `
        + `Z" fill="${color}" style="fill-opacity: ${COLOR_ZODIAC_BG_OPACITY}" />\n`;

    const signId = ZODIAC_SIGN_IDS[signNum]!;
    const counterRot = midAngle + 90;
    output
      += `  <g transform="rotate(${(-midAngle).toFixed(6)} ${CENTER} ${CENTER})">\n`
        + `    <g transform="translate(${CENTER} ${CENTER - rMid}) rotate(${counterRot.toFixed(6)}) scale(${glyphScale}) translate(-16 -16)">\n`
        + `      <use xlink:href="#${signId}" />\n`
        + "    </g>\n"
        + "  </g>\n";
  }

  output += `  <circle r="${R_ZODIAC_BG_INNER}" cx="${CENTER}" cy="${CENTER}" fill="none" stroke="${COLOR_STROKE}" stroke-width="0.15"/>\n`;
  output += `  <circle r="${R_ZODIAC_BG_OUTER}" cx="${CENTER}" cy="${CENTER}" fill="none" stroke="${COLOR_STROKE}" stroke-width="0.15"/>\n`;
  output += "</g>\n";
  return output;
}

export function drawCuspRing(
  houses: KerykeionPointModel[],
  seventhHouseDegreeUt: number,
  showZodiacBackgroundRing = true,
): string {
  let output = "<g kr:node=\"CuspRing\">\n";
  output += `<path d="${annulusPath(R_CUSP_OUTER, R_CUSP_INNER)}" fill="${COLOR_BACKGROUND}" fill-rule="evenodd"/>\n`;

  for (const house of houses) {
    const cuspAngle = zodiacToWheelAngle(house.abs_pos, seventhHouseDegreeUt);
    const signAbbrev = house.sign;
    const degrees = Math.trunc(house.position);
    const minutes = Math.trunc((house.position - degrees) * 60);
    const textOffset = 4.669;
    const isUpperHalf = cuspAngle >= 0 && cuspAngle < 180;
    const angleUpright = 90 + cuspAngle;

    output += `  <g kr:node="Cusp" kr:absoluteposition="${house.abs_pos}" kr:signposition="${house.position}" kr:sign="${signAbbrev}" kr:slug="${house.name}" transform="rotate(-${cuspAngle.toFixed(6)} ${CENTER} ${CENTER})">\n`;

    const signScale = 0.12 * (ZODIAC_OUTER_SCALE_MAP[signAbbrev] ?? 1.0);
    if (isUpperHalf) {
      output += `    <text text-anchor="middle" dominant-baseline="middle" x="${CENTER}" y="2.75" font-size="${CUSP_FONT_SIZE}" fill="${COLOR_TEXT}" font-weight="500" transform="rotate(${(-textOffset).toFixed(6)} ${CENTER} ${CENTER}) rotate(${(angleUpright + textOffset).toFixed(6)} ${CENTER} 2.75)">${minutes}'</text>\n`;
      output += `    <g transform="translate(${CENTER} 2.75) rotate(${angleUpright.toFixed(6)}) scale(${signScale}) translate(-16 -16)">\n      <use xlink:href="#${signAbbrev}" fill="${COLOR_TEXT}" />\n    </g>\n`;
      output += `    <text text-anchor="middle" dominant-baseline="middle" x="${CENTER}" y="2.75" font-size="${CUSP_FONT_SIZE}" fill="${COLOR_TEXT}" font-weight="500" transform="rotate(${textOffset.toFixed(6)} ${CENTER} ${CENTER}) rotate(${(angleUpright - textOffset).toFixed(6)} ${CENTER} 2.75)">${degrees}º</text>\n`;
    }
    else {
      output += `    <text text-anchor="middle" dominant-baseline="middle" x="${CENTER}" y="2.75" font-size="${CUSP_FONT_SIZE}" fill="${COLOR_TEXT}" font-weight="500" transform="rotate(${textOffset.toFixed(6)} ${CENTER} ${CENTER}) rotate(${(angleUpright - textOffset).toFixed(6)} ${CENTER} 2.75)">${minutes}'</text>\n`;
      output += `    <g transform="translate(${CENTER} 2.75) rotate(${angleUpright.toFixed(6)}) scale(${signScale}) translate(-16 -16)">\n      <use xlink:href="#${signAbbrev}" fill="${COLOR_TEXT}" />\n    </g>\n`;
      output += `    <text text-anchor="middle" dominant-baseline="middle" x="${CENTER}" y="2.75" font-size="${CUSP_FONT_SIZE}" fill="${COLOR_TEXT}" font-weight="500" transform="rotate(${(-textOffset).toFixed(6)} ${CENTER} ${CENTER}) rotate(${(angleUpright + textOffset).toFixed(6)} ${CENTER} 2.75)">${degrees}º</text>\n`;
    }

    output += "  </g>\n";
  }

  if (!showZodiacBackgroundRing) {
    const cuspSigns = new Set(houses.map(house => house.sign_num));
    for (let signNum = 0; signNum < 12; signNum += 1) {
      if (cuspSigns.has(signNum as KerykeionPointModel["sign_num"])) {
        continue;
      }

      const midSignAbs = signNum * 30.0 + 15.0;
      const signAngle = zodiacToWheelAngle(midSignAbs, seventhHouseDegreeUt);
      const signAbbrev = ZODIAC_SIGN_IDS[signNum] as KerykeionPointModel["sign"];
      const uprightAngle = 90 + signAngle;
      const signScale = 0.12 * (ZODIAC_OUTER_SCALE_MAP[signAbbrev] ?? 1.0);
      output += `<g transform="rotate(-${signAngle.toFixed(6)} ${CENTER} ${CENTER}) translate(${CENTER} 2.75) rotate(${uprightAngle.toFixed(6)}) scale(${signScale}) translate(-16 -16)">\n  <use xlink:href="#${signAbbrev}" fill="${COLOR_TEXT}"/>\n</g>\n`;
    }
  }

  output += "</g>\n";
  return output;
}

export function drawRulerRing(): string {
  let output = "<g kr:node=\"RulerRing\">\n";
  output += `<path d="${annulusPath(R_RULER_OUTER, R_RULER_INNER)}" fill="${COLOR_WHITE}" fill-rule="evenodd" stroke="${COLOR_STROKE}" stroke-width="0.2"/>\n`;

  const rFine = R_RULER_INNER + 0.15;
  const rMedium = R_RULER_INNER + 0.35;
  const rThick = R_RULER_INNER + 0.5;

  const circFine = 2 * Math.PI * rFine;
  const dashLenFine = 0.0975;
  const gapFine = circFine / 360 - dashLenFine;
  output += `<circle r="${rFine}" cx="${CENTER}" cy="${CENTER}" fill="none" stroke="${COLOR_STROKE}" stroke-dasharray="${dashLenFine.toFixed(4)} ${gapFine.toFixed(6)}" stroke-width="0.3"/>\n`;

  const circMedium = 2 * Math.PI * rMedium;
  const dashLenMed = 0.13;
  const gapMed = circMedium / 72 - dashLenMed;
  output += `<circle r="${rMedium}" cx="${CENTER}" cy="${CENTER}" fill="none" stroke="${COLOR_STROKE}" stroke-dasharray="${dashLenMed.toFixed(4)} ${gapMed.toFixed(6)}" stroke-width="0.7"/>\n`;

  const circThick = 2 * Math.PI * rThick;
  const dashLenThick = 0.26;
  const gapThick = circThick / 36 - dashLenThick;
  output += `<circle r="${rThick}" cx="${CENTER}" cy="${CENTER}" fill="none" stroke="${COLOR_STROKE}" stroke-dasharray="${dashLenThick.toFixed(4)} ${gapThick.toFixed(6)}" stroke-width="1"/>\n`;

  output += "</g>\n";
  return output;
}

export function resolvePlanetCollisions(
  planetsWithAngles: Array<{ angle: number; point: KerykeionPointModel; color: string; display_angle?: number }>,
  minSeparation = PLANET_MIN_SEPARATION,
): ResolvedPlanet[] {
  if (planetsWithAngles.length === 0) {
    return planetsWithAngles as ResolvedPlanet[];
  }

  const maxPossibleSeparation = 320.0 / planetsWithAngles.length;
  const sep = Math.min(minSeparation, maxPossibleSeparation);
  const sortedPlanets = [...planetsWithAngles].sort((a, b) => a.angle - b.angle) as ResolvedPlanet[];
  const n = sortedPlanets.length;

  for (const planet of sortedPlanets) {
    planet.display_angle = planet.angle;
  }

  for (let pass = 0; pass < 5; pass += 1) {
    let changed = false;
    const indices = Array.from({ length: n }, (_, index) => index).sort(
      (a, b) => sortedPlanets[a]!.display_angle - sortedPlanets[b]!.display_angle,
    );

    let bestGap = -1.0;
    let bestGapPos = 0;
    for (let k = 0; k < n; k += 1) {
      const kNext = (k + 1) % n;
      const gap = normalizeAngle(
        sortedPlanets[indices[kNext]!]!.display_angle - sortedPlanets[indices[k]!]!.display_angle,
      );
      if (gap > bestGap) {
        bestGap = gap;
        bestGapPos = k;
      }
    }

    const startK = (bestGapPos + 1) % n;
    const walk = Array.from({ length: n }, (_, index) => (startK + index) % n);

    for (let j = 1; j < n; j += 1) {
      const prevI = indices[walk[j - 1]!]!;
      const currI = indices[walk[j]!]!;
      const prevA = sortedPlanets[prevI]!.display_angle;
      const currA = sortedPlanets[currI]!.display_angle;
      const diff = normalizeAngle(currA - prevA);
      if (diff < sep) {
        sortedPlanets[currI]!.display_angle = normalizeAngle(prevA + sep);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return sortedPlanets;
}

export function drawIndicatorLine(
  realAngle: number,
  displayAngle: number,
  startY = HOUSE_LINE_OUTER_Y,
  tickLength = 1.075,
  arcRadius: number | null = null,
): string {
  const resolvedArcRadius = arcRadius ?? R_PLANET_OUTER - 1;
  let output = `<g kr:node="Indicator" transform="rotate(-${realAngle.toFixed(6)} ${CENTER} ${CENTER})">\n`;
  let angleDiff = normalizeAngle(displayAngle - realAngle);
  if (angleDiff > 180) {
    angleDiff -= 360;
  }

  if (Math.abs(angleDiff) < 0.5) {
    output += `  <path d="M ${CENTER} ${startY} l 0 ${tickLength}" fill="transparent" stroke="${COLOR_INDICATOR}" stroke-width="0.1"/>\n`;
  }
  else {
    const sweep = angleDiff > 0 ? 0 : 1;
    const endRad = degToRad(angleDiff);
    const endX = CENTER - resolvedArcRadius * Math.sin(endRad);
    const endY = CENTER - resolvedArcRadius * Math.cos(endRad);
    const tickSign = tickLength >= 0 ? 1.0 : -1.0;
    const endXInner = CENTER - (resolvedArcRadius - tickSign * Math.abs(tickLength)) * Math.sin(endRad);
    const endYInner = CENTER - (resolvedArcRadius - tickSign * Math.abs(tickLength)) * Math.cos(endRad);
    output += `  <path d="M ${CENTER} ${startY} l 0 ${tickLength} A ${resolvedArcRadius} ${resolvedArcRadius} 0 0 ${sweep} ${endX.toFixed(10)} ${endY.toFixed(10)} L ${endXInner.toFixed(10)} ${endYInner.toFixed(10)}" fill="transparent" stroke="${COLOR_INDICATOR}" stroke-width="0.1"/>\n`;
  }

  output += "</g>\n";
  return output;
}

export function drawSinglePlanetInRing(
  point: KerykeionPointModel,
  displayAngle: number,
  counterRotation: number,
  color: string,
  {
    glyph_y = 11.0,
    degrees_y = 14.5,
    sign_y = 18.0,
    minutes_y = 22.0,
    rx_y = 25.0,
    planet_scale_base = PLANET_SCALE_BASE,
    degrees_font_size = DEGREES_FONT_SIZE,
    sign_scale_base = SIGN_SCALE_BASE,
    minutes_font_size = MINUTES_FONT_SIZE,
    rx_font_size = RX_FONT_SIZE,
  }: PlanetRingConfig
    & PlanetScaleConfig & {
      planet_scale_base?: number;
      degrees_font_size?: number;
      sign_scale_base?: number;
      minutes_font_size?: number;
      rx_font_size?: number;
    } = {},
): string {
  const degrees = Math.trunc(point.position);
  const minutes = Math.trunc((point.position - degrees) * 60);
  const sign = point.sign;
  const isRetro = point.retrograde === true;
  const fillColor = isRetro ? COLOR_RETROGRADE : color;
  const planetId = point.name;
  const retroAttr = isRetro ? " kr:retrograde=\"true\"" : "";

  let output
    = `<g kr:node="ChartPoint" kr:house="${point.house}" kr:sign="${sign}" kr:absoluteposition="${point.abs_pos}" `
      + `kr:signposition="${point.position}" kr:slug="${planetId}"${retroAttr} transform="rotate(-${displayAngle.toFixed(6)} ${CENTER} ${CENTER})">\n`;

  const planetScale = planet_scale_base * (GLYPH_SCALE_MAP[planetId] ?? 1.0);
  output += `  <g transform="translate(${CENTER} ${glyph_y}) rotate(${counterRotation.toFixed(6)}) scale(${planetScale}) translate(-14 -14)">\n    <use xlink:href="#${planetId}" kr:slug="${planetId}" kr:node="Glyph" fill="${fillColor}" />\n  </g>\n`;
  output += `  <text text-anchor="middle" dominant-baseline="middle" x="${CENTER}" y="${degrees_y}" font-size="${degrees_font_size}" fill="${fillColor}" font-weight="500" transform="rotate(${counterRotation.toFixed(6)} ${CENTER} ${degrees_y})">${degrees}º</text>\n`;

  const signScale = sign_scale_base * (ZODIAC_INNER_SCALE_MAP[sign] ?? 1.0);
  output += `  <g transform="translate(${CENTER} ${sign_y}) rotate(${counterRotation.toFixed(6)}) scale(${signScale}) translate(-16 -16)">\n    <use xlink:href="#${sign}" fill="${fillColor}" />\n  </g>\n`;
  output += `  <text text-anchor="middle" dominant-baseline="middle" x="${CENTER}" y="${minutes_y}" font-size="${minutes_font_size}" fill="${fillColor}" font-weight="500" transform="rotate(${counterRotation.toFixed(6)} ${CENTER} ${minutes_y})">${minutes}'</text>\n`;

  if (isRetro) {
    output += `  <text text-anchor="middle" dominant-baseline="middle" x="${CENTER}" y="${rx_y}" font-size="${rx_font_size}" fill="${fillColor}" font-weight="500" transform="rotate(${counterRotation.toFixed(6)} ${CENTER} ${rx_y})">RX</text>\n`;
  }

  output += "</g>\n";
  return output;
}

export function drawHouseDivisionLines(
  houses: KerykeionPointModel[],
  seventhHouseDegreeUt: number,
  lineOuterY = HOUSE_LINE_OUTER_Y,
  lineInnerY = HOUSE_LINE_INNER_Y,
): string {
  let output = "";
  for (let i = 0; i < houses.length; i += 1) {
    const houseNum = i + 1;
    const cuspAngle = zodiacToWheelAngle(houses[i]!.abs_pos, seventhHouseDegreeUt);
    const strokeWidth = ANGULAR_HOUSES.has(houseNum) ? ANGULAR_STROKE_WIDTH : NORMAL_STROKE_WIDTH;
    output += `<line x1="${CENTER}" y1="${lineOuterY}" x2="${CENTER}" y2="${lineInnerY}" stroke="${COLOR_STROKE}" stroke-width="${strokeWidth}" transform="rotate(-${cuspAngle.toFixed(6)} ${CENTER} ${CENTER})"/>\n`;
  }
  return output;
}

export function drawPlanetRing(
  planets: KerykeionPointModel[],
  planetsSettings: KerykeionSettingsCelestialPointModel[],
  seventhHouseDegreeUt: number,
  houses: KerykeionPointModel[],
  minSeparation = PLANET_MIN_SEPARATION,
  ringInnerR = R_PLANET_INNER,
  ringOuterR = R_PLANET_OUTER,
  ringFillColor = COLOR_PLANET_RING,
  lineOuterY = HOUSE_LINE_OUTER_Y,
  lineInnerY = HOUSE_LINE_INNER_Y,
  planetYConfig: PlanetRingConfig | null = null,
  indicatorConfig: IndicatorConfig | null = null,
  horoscopeId: string | null = null,
  scaleConfig: PlanetScaleConfig | null = null,
): string {
  const horoscopeAttr = horoscopeId ? ` kr:horoscope="${horoscopeId}"` : "";
  let output = `<g kr:node="PlanetRing"${horoscopeAttr}>\n`;
  output += `<path d="${annulusPath(ringOuterR, ringInnerR)}" fill="${ringFillColor}" fill-rule="evenodd" stroke="${COLOR_STROKE}" stroke-width="0.25"/>\n`;
  output += drawHouseDivisionLines(houses, seventhHouseDegreeUt, lineOuterY, lineInnerY);

  const colorMap = Object.fromEntries(
    planetsSettings.map(setting => [normalizePointKey(setting.name), setting.color ?? COLOR_TEXT]),
  );

  const planetsWithAngles = planets.map((point) => {
    const angle = zodiacToWheelAngle(point.abs_pos, seventhHouseDegreeUt);
    const color = colorMap[normalizePointKey(point.name)] ?? COLOR_TEXT;
    return { angle, point, color };
  });

  const resolved = resolvePlanetCollisions(planetsWithAngles, minSeparation);
  const planetKwargs = {
    glyph_y: planetYConfig?.glyph_y ?? 11.0,
    degrees_y: planetYConfig?.degrees_y ?? 14.5,
    sign_y: planetYConfig?.sign_y ?? 18.0,
    minutes_y: planetYConfig?.minutes_y ?? 22.0,
    rx_y: planetYConfig?.rx_y ?? 25.0,
    planet_scale_base: scaleConfig?.planet_scale_base ?? PLANET_SCALE_BASE,
    degrees_font_size: scaleConfig?.degrees_font_size ?? DEGREES_FONT_SIZE,
    sign_scale_base: scaleConfig?.sign_scale_base ?? SIGN_SCALE_BASE,
    minutes_font_size: scaleConfig?.minutes_font_size ?? MINUTES_FONT_SIZE,
    rx_font_size: scaleConfig?.rx_font_size ?? RX_FONT_SIZE,
  };

  const indicatorKwargs = {
    start_y: indicatorConfig?.start_y ?? HOUSE_LINE_OUTER_Y,
    tick_length: indicatorConfig?.tick_length ?? 1.075,
    arc_radius: indicatorConfig?.arc_radius ?? null,
  };

  for (const planet of resolved) {
    const counterRotation = planet.display_angle + 90;
    output += drawSinglePlanetInRing(planet.point, planet.display_angle, counterRotation, planet.color, planetKwargs);
    output += drawIndicatorLine(
      planet.angle,
      planet.display_angle,
      indicatorKwargs.start_y,
      indicatorKwargs.tick_length,
      indicatorKwargs.arc_radius,
    );
  }

  output += "</g>\n";
  return output;
}

export function drawHouseRing(
  houses: KerykeionPointModel[],
  seventhHouseDegreeUt: number,
  lineInnerRadius = R_HOUSE_INNER,
  showNumbers = true,
  houseInnerR = R_HOUSE_INNER,
  houseOuterR = R_HOUSE_OUTER,
  textY = 29.25,
): string {
  let output = "<g kr:node=\"HouseRing\">\n";
  output += `<path d="${annulusPath(houseOuterR, houseInnerR)}" fill="${COLOR_HOUSE_RING}" fill-rule="evenodd"/>\n`;

  for (let i = 0; i < houses.length; i += 1) {
    const houseNum = i + 1;
    const cuspAngle = zodiacToWheelAngle(houses[i]!.abs_pos, seventhHouseDegreeUt);
    const nextHouse = houses[(i + 1) % 12]!;
    const nextAngle = zodiacToWheelAngle(nextHouse.abs_pos, seventhHouseDegreeUt);
    const span = normalizeAngle(nextAngle - cuspAngle);
    const midAngleAbs = normalizeAngle(cuspAngle + span / 2);
    const strokeWidth = ANGULAR_HOUSES.has(houseNum) ? ANGULAR_STROKE_WIDTH : NORMAL_STROKE_WIDTH;
    const houseLineY1 = CENTER - houseOuterR;
    const houseLineY2 = CENTER - lineInnerRadius;
    output += `<line x1="${CENTER}" y1="${houseLineY1}" x2="${CENTER}" y2="${houseLineY2}" stroke="${COLOR_STROKE}" stroke-width="${strokeWidth}" transform="rotate(-${cuspAngle.toFixed(6)} ${CENTER} ${CENTER})"/>\n`;

    if (showNumbers) {
      const angleUpright = 90 + midAngleAbs;
      output += `<text text-anchor="middle" dominant-baseline="middle" x="${CENTER}" y="${textY}" font-size="1.5" fill="${COLOR_TEXT}" font-weight="500" transform="rotate(-${midAngleAbs.toFixed(6)} ${CENTER} ${CENTER}) rotate(${angleUpright.toFixed(6)} ${CENTER} ${textY})">${houseNum}</text>\n`;
    }
  }

  output += "</g>\n";
  return output;
}

const ASPECT_DEGREE_MAP: Record<string, number> = {
  "conjunction": 0,
  "opposition": 180,
  "square": 90,
  "trine": 120,
  "sextile": 60,
  "semi-square": 45,
  "sesquiquadrate": 135,
  "inconjunct": 150,
  "quincunx": 150,
  "semi-sextile": 30,
  "quintile": 72,
  "bi-quintile": 144,
};

export function drawAspectCore(
  aspectsList: Array<AspectModel | Record<string, unknown>>,
  aspectsSettings: ReadonlyArray<ChartAspectSetting>,
  seventhHouseDegreeUt: number,
  coreRadius = R_ASPECT,
): string {
  let output = "<g kr:node=\"AspectCore\">\n";
  output += `<path d="${annulusPath(coreRadius, 0)}" fill="${COLOR_BACKGROUND}" fill-rule="evenodd"/>\n`;

  const colorMap = Object.fromEntries(aspectsSettings.map(setting => [setting.name, setting.color ?? COLOR_STROKE]));
  const aspectScale = 0.37;
  const renderedIconPositions: Array<[number, number, number]> = [];
  const iconCollisionThreshold = 8.0;

  for (const rawAspect of aspectsList) {
    const aspect = rawAspect as AspectModel;
    const aspectName = aspect.aspect ?? "";
    const color = colorMap[aspectName] ?? COLOR_STROKE;
    const p1Abs = aspect.p1_abs_pos ?? 0;
    const p2Abs = aspect.p2_abs_pos ?? 0;
    const a1 = zodiacToWheelAngle(p1Abs, seventhHouseDegreeUt);
    const a2 = zodiacToWheelAngle(p2Abs, seventhHouseDegreeUt);
    const [x1, y1] = pointOnCircle(a1, coreRadius);
    const [x2, y2] = pointOnCircle(a2, coreRadius);
    const sx1 = (x1 - CENTER) / aspectScale + CENTER;
    const sy1 = (y1 - CENTER) / aspectScale + CENTER;
    const sx2 = (x2 - CENTER) / aspectScale + CENTER;
    const sy2 = (y2 - CENTER) / aspectScale + CENTER;
    const mx = (sx1 + sx2) / 2;
    const my = (sy1 + sy2) / 2;
    const aspectDegrees = ASPECT_DEGREE_MAP[aspectName];
    const symbolId = aspectDegrees != null ? `orb${aspectDegrees}` : "";

    output += `<g kr:node="Aspect" kr:aspectname="${aspectName}" kr:to="${aspect.p1_name}" kr:tooriginaldegrees="${p1Abs}" kr:from="${aspect.p2_name}" kr:fromoriginaldegrees="${p2Abs}" kr:orb="${aspect.orbit}" kr:aspectdegrees="${aspect.aspect_degrees}" kr:planetsdiff="${aspect.diff}" kr:aspectmovement="${aspect.aspect_movement}" transform="translate(${CENTER} ${CENTER}) scale(${aspectScale}) translate(-${CENTER} -${CENTER})">\n`;
    output += `  <line x1="${sx1.toFixed(6)}" y1="${sy1.toFixed(6)}" x2="${sx2.toFixed(6)}" y2="${sy2.toFixed(6)}" stroke="${color}" stroke-width="0.25"/>\n`;

    if (symbolId) {
      let shouldRenderIcon = true;
      for (const [existingX, existingY, existingDegrees] of renderedIconPositions) {
        if (existingDegrees === aspectDegrees) {
          const distance = Math.hypot(mx - existingX, my - existingY);
          if (distance < iconCollisionThreshold) {
            shouldRenderIcon = false;
            break;
          }
        }
      }

      if (shouldRenderIcon) {
        output += `  <g transform="translate(${mx.toFixed(6)} ${my.toFixed(6)}) rotate(90) scale(0.45) translate(-5 -5)">\n    <use xlink:href="#${symbolId}" fill="${color}"/>\n  </g>\n`;
        renderedIconPositions.push([mx, my, aspectDegrees!]);
      }
    }

    output += "</g>\n";
  }

  output += "</g>\n";
  return output;
}

export function drawModernHoroscope(
  planets: KerykeionPointModel[],
  houses: KerykeionPointModel[],
  aspectsList: Array<AspectModel | Record<string, unknown>>,
  seventhHouseDegreeUt: number,
  planetsSettings: KerykeionSettingsCelestialPointModel[],
  aspectsSettings: ReadonlyArray<ChartAspectSetting>,
  showZodiacBackgroundRing = true,
): string {
  let output = `<g kr:node="ModernHoroscope" transform="rotate(-90 ${CENTER} ${CENTER})">\n`;

  if (showZodiacBackgroundRing) {
    output += drawZodiacBackgroundRing(seventhHouseDegreeUt);
    const s = ZODIAC_BG_SCALE;
    const tx = CENTER * (1 - s);
    const ty = CENTER * (1 - s);
    output += `<g transform="translate(${tx.toFixed(6)} ${ty.toFixed(6)}) scale(${s.toFixed(6)})">\n`;
  }

  output += `<circle fill="${COLOR_BACKGROUND}" r="${R_CUSP_OUTER}" cx="${CENTER}" cy="${CENTER}" stroke="${COLOR_STROKE}" stroke-width="0.15"/>\n`;
  output += drawCuspRing(houses, seventhHouseDegreeUt, showZodiacBackgroundRing);
  output += drawRulerRing();
  output += drawPlanetRing(planets, planetsSettings, seventhHouseDegreeUt, houses);
  output += drawHouseRing(houses, seventhHouseDegreeUt);
  output += drawAspectCore(aspectsList, aspectsSettings, seventhHouseDegreeUt);

  if (showZodiacBackgroundRing) {
    output += "</g>\n";
  }

  output += "</g>\n";
  return output;
}

export function drawModernDualHoroscope(
  planets1: KerykeionPointModel[],
  houses1: KerykeionPointModel[],
  planets2: KerykeionPointModel[],
  aspectsList: Array<AspectModel | Record<string, unknown>>,
  seventhHouseDegreeUt: number,
  planetsSettings: KerykeionSettingsCelestialPointModel[],
  aspectsSettings: ReadonlyArray<ChartAspectSetting>,
  chartType: ChartType = "Transit",
  showZodiacBackgroundRing = true,
): string {
  let output = `<g kr:node="ModernDualHoroscope" kr:charttype="${chartType}" transform="rotate(-90 ${CENTER} ${CENTER})">\n`;

  if (showZodiacBackgroundRing) {
    output += drawZodiacBackgroundRing(seventhHouseDegreeUt);
    const s = ZODIAC_BG_SCALE;
    const tx = CENTER * (1 - s);
    const ty = CENTER * (1 - s);
    output += `<g transform="translate(${tx.toFixed(6)} ${ty.toFixed(6)}) scale(${s.toFixed(6)})">\n`;
  }

  output += `<circle fill="${COLOR_BACKGROUND}" r="${R_CUSP_OUTER}" cx="${CENTER}" cy="${CENTER}" stroke="${COLOR_STROKE}" stroke-width="0.15"/>\n`;
  output += drawCuspRing(houses1, seventhHouseDegreeUt, showZodiacBackgroundRing);
  output += drawRulerRing();
  output += drawPlanetRing(
    planets2,
    planetsSettings,
    seventhHouseDegreeUt,
    houses1,
    10.0,
    SYN_R_OUTER_PLANET_INNER,
    SYN_R_OUTER_PLANET_OUTER,
    COLOR_OUTER_PLANET_RING,
    SYN_HOUSE_LINE_OUTER_Y1,
    SYN_HOUSE_LINE_OUTER_Y2,
    {
      glyph_y: SYN_OUTER_PLANET_GLYPH_Y,
      degrees_y: SYN_OUTER_DEGREES_Y,
      sign_y: SYN_OUTER_SIGN_Y,
      minutes_y: SYN_OUTER_MINUTES_Y,
      rx_y: SYN_OUTER_RX_Y,
    },
    {
      start_y: SYN_INDICATOR_START_Y,
      tick_length: -SYN_INDICATOR_TICK,
      arc_radius: SYN_INDICATOR_ARC_R_OUTWARD,
    },
    "1",
    {
      planet_scale_base: SYN_PLANET_SCALE,
      degrees_font_size: SYN_DEGREES_FONT_SIZE,
      sign_scale_base: SYN_SIGN_SCALE,
      minutes_font_size: SYN_MINUTES_FONT_SIZE,
      rx_font_size: SYN_RX_FONT_SIZE,
    },
  );
  output += drawPlanetRing(
    planets1,
    planetsSettings,
    seventhHouseDegreeUt,
    houses1,
    10.0,
    SYN_R_INNER_PLANET_INNER,
    SYN_R_INNER_PLANET_OUTER,
    COLOR_PLANET_RING,
    SYN_HOUSE_LINE_INNER_Y1,
    SYN_HOUSE_LINE_INNER_Y2,
    {
      glyph_y: SYN_INNER_PLANET_GLYPH_Y,
      degrees_y: SYN_INNER_DEGREES_Y,
      sign_y: SYN_INNER_SIGN_Y,
      minutes_y: SYN_INNER_MINUTES_Y,
      rx_y: SYN_INNER_RX_Y,
    },
    {
      start_y: SYN_INDICATOR_START_Y,
      tick_length: SYN_INDICATOR_TICK,
      arc_radius: SYN_INDICATOR_ARC_R_INWARD,
    },
    "0",
    {
      planet_scale_base: SYN_PLANET_SCALE_INNER,
      degrees_font_size: SYN_DEGREES_FONT_SIZE_INNER,
      sign_scale_base: SYN_SIGN_SCALE,
      minutes_font_size: SYN_MINUTES_FONT_SIZE,
      rx_font_size: SYN_RX_FONT_SIZE,
    },
  );
  output += drawHouseRing(houses1, seventhHouseDegreeUt, SYN_R_ASPECT, true, SYN_R_HOUSE_INNER, SYN_R_HOUSE_OUTER, 36.0);
  output += drawAspectCore(aspectsList, aspectsSettings, seventhHouseDegreeUt, SYN_R_ASPECT);

  if (showZodiacBackgroundRing) {
    output += "</g>\n";
  }

  output += "</g>\n";
  return output;
}

function normalizePointKey(name: string): string {
  return name.toLowerCase().replaceAll(" ", "_").replaceAll("'", "").replaceAll("\u2019", "");
}

export {
  annulusPath as _annulus_path,
  degToRad as _deg_to_rad,
  drawAspectCore as _draw_aspect_core,
  drawCuspRing as _draw_cusp_ring,
  drawHouseDivisionLines as _draw_house_division_lines,
  drawHouseRing as _draw_house_ring,
  drawIndicatorLine as _draw_indicator_line,
  drawPlanetRing as _draw_planet_ring,
  drawRulerRing as _draw_ruler_ring,
  drawSinglePlanetInRing as _draw_single_planet_in_ring,
  drawZodiacBackgroundRing as _draw_zodiac_background_ring,
  normalizeAngle as _normalize_angle,
  pointOnCircle as _point_on_circle,
  resolvePlanetCollisions as _resolve_planet_collisions,
  zodiacToWheelAngle as _zodiac_to_wheel_angle,
  drawModernDualHoroscope as draw_modern_dual_horoscope,
  drawModernHoroscope as draw_modern_horoscope,
};
