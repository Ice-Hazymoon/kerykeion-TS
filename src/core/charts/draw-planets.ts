import type { ChartType, House } from "../schemas/literals";
import type { KerykeionPointModel } from "../schemas/models";
import type { KerykeionSettingsCelestialPointModel } from "../settings/chart-defaults";
import { KerykeionException } from "../schemas/kerykeion-exception";
import { houses } from "../schemas/literals";
import { convertDecimalToDegreeString, degreeDiff, sliceToX, sliceToY } from "./charts-utils";

export const PLANET_GROUPING_THRESHOLD = 3.4;
export const INDICATOR_GROUPING_THRESHOLD = 2.5;
export const CHART_ANGLE_MIN_INDEX = 22;
export const CHART_ANGLE_MAX_INDEX = 27;
export const NATAL_INDICATOR_OFFSET = 72;
export const DUAL_CHART_ANGLE_RADIUS = 76;
export const DUAL_CHART_PLANET_RADIUS_A = 110;
export const DUAL_CHART_PLANET_RADIUS_B = 130;
export const DUAL_CHART_TYPES = ["Transit", "Synastry", "DualReturnChart"] as const;

export const logging = {
  debug: (..._args: unknown[]) => undefined,
};

type PointSetting = KerykeionSettingsCelestialPointModel;
type PointGroupEntry = [number, number, number, string];
type PositionRecord = [number, number, number];

export function drawPlanets(
  radius: number,
  availableKerykeionCelestialPoints: KerykeionPointModel[],
  availablePlanetsSetting: ReadonlyArray<PointSetting>,
  thirdCircleRadius: number,
  mainSubjectFirstHouseDegreeUt: number,
  mainSubjectSeventhHouseDegreeUt: number,
  chartType: ChartType,
  secondSubjectAvailableKerykeionCelestialPoints: KerykeionPointModel[] | null = null,
  externalView = false,
  firstCircleRadius: number | null = null,
  _secondCircleRadius: number | null = null,
  showDegreeIndicators = true,
): string {
  const transitRingExcludePoints = [...houses] as House[];
  let output = "";

  validateDualChartInputs(chartType, secondSubjectAvailableKerykeionCelestialPoints);

  const mainPointsAbsPositions = availableKerykeionCelestialPoints.map(point => point.abs_pos);
  let secondaryPointsAbsPositions: number[] = [];
  let secondaryPointsRelPositions: number[] = [];

  if (DUAL_CHART_TYPES.includes(chartType as (typeof DUAL_CHART_TYPES)[number]) && secondSubjectAvailableKerykeionCelestialPoints) {
    secondaryPointsAbsPositions = secondSubjectAvailableKerykeionCelestialPoints.map(point => point.abs_pos);
    secondaryPointsRelPositions = secondSubjectAvailableKerykeionCelestialPoints.map(point => point.position);
  }

  const positionIndexMap: Record<string, number> = {};
  for (let i = 0; i < availablePlanetsSetting.length; i += 1) {
    positionIndexMap[String(mainPointsAbsPositions[i])] = i;
  }

  const sortedPositions = Object.keys(positionIndexMap)
    .map(Number)
    .sort((a, b) => a - b);

  for (const position of sortedPositions) {
    logging.debug(`Planet index: ${positionIndexMap[String(position)]}, degree: ${position}`);
  }

  const positionAdjustments = calculatePlanetAdjustments(
    mainPointsAbsPositions,
    availablePlanetsSetting,
    positionIndexMap,
    sortedPositions,
  );

  let adjustedOffset = 0.0;
  for (let positionIdx = 0; positionIdx < sortedPositions.length; positionIdx += 1) {
    const absPosition = sortedPositions[positionIdx]!;
    const pointIdx = positionIndexMap[String(absPosition)]!;
    const pointRadius = determinePointRadius(pointIdx, chartType, Boolean(positionIdx % 2), externalView);

    adjustedOffset = calculatePointOffset(
      mainSubjectSeventhHouseDegreeUt,
      mainPointsAbsPositions[pointIdx]!,
      positionAdjustments[positionIdx] ?? 0,
    );
    const trueOffset = calculatePointOffset(
      mainSubjectSeventhHouseDegreeUt,
      mainPointsAbsPositions[pointIdx]!,
      0,
    );

    const pointX = sliceToX(0, radius - pointRadius, adjustedOffset) + pointRadius;
    const pointY = sliceToY(0, radius - pointRadius, adjustedOffset) + pointRadius;
    const scaleFactor
      = DUAL_CHART_TYPES.includes(chartType as (typeof DUAL_CHART_TYPES)[number]) || externalView ? 0.8 : 1.0;

    if (externalView) {
      output = drawExternalNatalLines(
        output,
        radius,
        thirdCircleRadius,
        pointRadius,
        trueOffset,
        adjustedOffset,
        availablePlanetsSetting[pointIdx]!.color,
      );
    }

    output += generatePointSvg(
      availableKerykeionCelestialPoints[pointIdx]!,
      pointX,
      pointY,
      scaleFactor,
      availablePlanetsSetting[pointIdx]!.name,
    );
  }

  if (chartType === "Natal" || chartType === "Composite" || chartType === "SingleReturnChart") {
    if (showDegreeIndicators && firstCircleRadius != null && !externalView) {
      output = drawPrimaryPointIndicators(
        output,
        radius,
        firstCircleRadius,
        thirdCircleRadius,
        mainSubjectFirstHouseDegreeUt,
        mainSubjectSeventhHouseDegreeUt,
        mainPointsAbsPositions,
        availableKerykeionCelestialPoints.map(point => point.position),
        availablePlanetsSetting,
      );
    }
  }
  else if (DUAL_CHART_TYPES.includes(chartType)) {
    if (showDegreeIndicators) {
      if (secondaryPointsAbsPositions.length && secondaryPointsRelPositions.length) {
        output = drawSecondaryPoints(
          output,
          radius,
          mainSubjectFirstHouseDegreeUt,
          mainSubjectSeventhHouseDegreeUt,
          secondaryPointsAbsPositions,
          secondaryPointsRelPositions,
          availablePlanetsSetting,
          chartType,
          transitRingExcludePoints,
          adjustedOffset,
          secondSubjectAvailableKerykeionCelestialPoints,
        );
      }

      output = drawInnerPointIndicators(
        output,
        radius,
        thirdCircleRadius,
        mainSubjectFirstHouseDegreeUt,
        mainSubjectSeventhHouseDegreeUt,
        mainPointsAbsPositions,
        availableKerykeionCelestialPoints.map(point => point.position),
        availablePlanetsSetting,
      );
    }
  }

  return output;
}

function validateDualChartInputs(
  chartType: ChartType,
  secondaryPoints: KerykeionPointModel[] | null,
): void {
  const errorMessages: Partial<Record<ChartType, string>> = {
    Transit: "Secondary celestial points are required for Transit charts",
    Synastry: "Secondary celestial points are required for Synastry charts",
  };

  if (chartType in errorMessages && !secondaryPoints) {
    throw new KerykeionException(errorMessages[chartType]!);
  }
}

export function calculatePlanetAdjustments(
  pointsAbsPositions: ReadonlyArray<number>,
  pointsSettings: ReadonlyArray<PointSetting>,
  positionIndexMap: Record<string, number>,
  sortedPositions: ReadonlyArray<number>,
): number[] {
  const planetsByPosition = Array.from({ length: Object.keys(positionIndexMap).length }).fill(null) as Array<PositionRecord | null>;
  const pointGroups: PointGroupEntry[][] = [];
  const positionAdjustments = Array.from({ length: pointsSettings.length }).fill(0) as number[];
  let isGroupOpen = false;

  for (let positionIdx = 0; positionIdx < sortedPositions.length; positionIdx += 1) {
    const absPosition = sortedPositions[positionIdx]!;
    const pointIdx = positionIndexMap[String(absPosition)]!;

    let distanceToPrev = 360.0;
    let distanceToNext = 360.0;

    if (sortedPositions.length > 1) {
      const [prevPos, nextPos] = getAdjacentPositions(
        positionIdx,
        sortedPositions,
        positionIndexMap,
        pointsAbsPositions,
      );
      distanceToPrev = degreeDiff(prevPos, pointsAbsPositions[pointIdx]!);
      distanceToNext = degreeDiff(nextPos, pointsAbsPositions[pointIdx]!);
    }

    planetsByPosition[positionIdx] = [pointIdx, distanceToPrev, distanceToNext];
    const label = pointsSettings[pointIdx]!.label;
    logging.debug(`${label}, distance_to_prev: ${distanceToPrev}, distance_to_next: ${distanceToNext}`);

    if (distanceToNext < PLANET_GROUPING_THRESHOLD) {
      const pointData: PointGroupEntry = [positionIdx, distanceToPrev, distanceToNext, label];
      if (isGroupOpen) {
        pointGroups[pointGroups.length - 1]!.push(pointData);
      }
      else {
        isGroupOpen = true;
        pointGroups.push([pointData]);
      }
    }
    else {
      if (isGroupOpen) {
        const pointData: PointGroupEntry = [positionIdx, distanceToPrev, distanceToNext, label];
        pointGroups[pointGroups.length - 1]!.push(pointData);
      }
      isGroupOpen = false;
    }
  }

  for (const group of pointGroups) {
    if (group.length === 2) {
      handleTwoPointGroup(group, planetsByPosition, positionAdjustments, PLANET_GROUPING_THRESHOLD);
    }
    else if (group.length >= 3) {
      handleMultiPointGroup(group, positionAdjustments, PLANET_GROUPING_THRESHOLD);
    }
  }

  return positionAdjustments;
}

function getAdjacentPositions(
  positionIdx: number,
  sortedPositions: ReadonlyArray<number>,
  positionIndexMap: Record<string, number>,
  pointsAbsPositions: ReadonlyArray<number>,
): [number, number] {
  const total = sortedPositions.length;
  let prevIdx: number;
  let nextIdx: number;

  if (positionIdx === 0) {
    prevIdx = positionIndexMap[String(sortedPositions[total - 1]!)]!;
    nextIdx = positionIndexMap[String(sortedPositions[1]!)]!;
  }
  else if (positionIdx === total - 1) {
    prevIdx = positionIndexMap[String(sortedPositions[positionIdx - 1]!)]!;
    nextIdx = positionIndexMap[String(sortedPositions[0]!)]!;
  }
  else {
    prevIdx = positionIndexMap[String(sortedPositions[positionIdx - 1]!)]!;
    nextIdx = positionIndexMap[String(sortedPositions[positionIdx + 1]!)]!;
  }

  return [pointsAbsPositions[prevIdx]!, pointsAbsPositions[nextIdx]!];
}

export function handleTwoPointGroup(
  group: PointGroupEntry[],
  planetsByPosition: Array<PositionRecord | null>,
  positionAdjustments: number[],
  threshold: number,
): void {
  const nextToA = group[0]![0] - 1;
  const nextToB = group[1]![0] === planetsByPosition.length - 1 ? 0 : group[1]![0] + 1;

  if (group[0]![1] > 2 * threshold && group[1]![2] > 2 * threshold) {
    positionAdjustments[group[0]![0]] = -(threshold - group[0]![2]) / 2;
    positionAdjustments[group[1]![0]] = +(threshold - group[0]![2]) / 2;
  }
  else if (group[0]![1] > 2 * threshold) {
    positionAdjustments[group[0]![0]] = -threshold;
  }
  else if (group[1]![2] > 2 * threshold) {
    positionAdjustments[group[1]![0]] = +threshold;
  }
  else if (
    (planetsByPosition[nextToA]?.[1] ?? 0) > 2.4 * threshold
    && (planetsByPosition[nextToB]?.[2] ?? 0) > 2.4 * threshold
  ) {
    positionAdjustments[nextToA] = (planetsByPosition[nextToA]?.[1] ?? 0) - threshold * 2;
    positionAdjustments[group[0]![0]] = -threshold * 0.5;
    positionAdjustments[nextToB] = -((planetsByPosition[nextToB]?.[2] ?? 0) - threshold * 2);
    positionAdjustments[group[1]![0]] = +threshold * 0.5;
  }
  else if ((planetsByPosition[nextToA]?.[1] ?? 0) > 2 * threshold) {
    positionAdjustments[nextToA] = (planetsByPosition[nextToA]?.[1] ?? 0) - threshold * 2.5;
    positionAdjustments[group[0]![0]] = -threshold * 1.2;
  }
  else if ((planetsByPosition[nextToB]?.[2] ?? 0) > 2 * threshold) {
    positionAdjustments[nextToB] = -((planetsByPosition[nextToB]?.[2] ?? 0) - threshold * 2.5);
    positionAdjustments[group[1]![0]] = +threshold * 1.2;
  }
}

export function handleMultiPointGroup(
  group: PointGroupEntry[],
  positionAdjustments: number[],
  threshold: number,
): void {
  const groupSize = group.length;
  let availableSpace = group[0]![1];

  for (let i = 0; i < groupSize; i += 1) {
    availableSpace += group[i]![2];
  }

  const neededSpace = 3 * threshold + 1.2 * (groupSize - 1) * threshold;
  const leftoverSpace = availableSpace - neededSpace;
  const spaceBeforeFirst = group[0]![1];
  const spaceAfterLast = group[groupSize - 1]![2];

  let startPosition: number;
  if (spaceBeforeFirst > neededSpace * 0.5 && spaceAfterLast > neededSpace * 0.5) {
    startPosition = spaceBeforeFirst - neededSpace * 0.5;
  }
  else {
    startPosition = (leftoverSpace / (spaceBeforeFirst + spaceAfterLast)) * spaceBeforeFirst;
  }

  if (availableSpace > neededSpace) {
    positionAdjustments[group[0]![0]] = startPosition - group[0]![1] + 1.5 * threshold;
    for (let i = 0; i < groupSize - 1; i += 1) {
      positionAdjustments[group[i + 1]![0]]
        = 1.2 * threshold + positionAdjustments[group[i]![0]]! - group[i]![2];
    }
  }
}

export function calculatePointOffset(
  seventhHouseDegree: number,
  pointDegree: number,
  adjustment: number,
): number {
  return Math.trunc(seventhHouseDegree) / -1 + Math.trunc(pointDegree + adjustment);
}

export function determinePointRadius(
  pointIdx: number,
  chartType: string,
  isAlternatePosition: boolean,
  externalView = false,
): number {
  const isChartAngle = CHART_ANGLE_MIN_INDEX < pointIdx && pointIdx < CHART_ANGLE_MAX_INDEX;

  if (DUAL_CHART_TYPES.includes(chartType as (typeof DUAL_CHART_TYPES)[number])) {
    if (isChartAngle) {
      return DUAL_CHART_ANGLE_RADIUS;
    }
    return isAlternatePosition ? DUAL_CHART_PLANET_RADIUS_A : DUAL_CHART_PLANET_RADIUS_B;
  }

  if (externalView) {
    if (isChartAngle) {
      return 40 - (40 - 10);
    }
    if (isAlternatePosition) {
      return 74 - (74 - 10);
    }
    return 94 - (94 - 10);
  }

  if (isChartAngle) {
    return 40;
  }
  return isAlternatePosition ? 74 : 94;
}

export function calculateIndicatorAdjustments(
  pointsAbsPositions: ReadonlyArray<number>,
  pointsSettings: ReadonlyArray<PointSetting>,
  chartType = "",
  excludePoints: string[] = [],
): Record<number, number> {
  const positionAdjustments: Record<number, number> = Object.fromEntries(
    pointsSettings.map((_, index) => [index, 0.0]),
  );

  const positionIndexMap: Record<string, number> = {};
  for (let i = 0; i < pointsSettings.length; i += 1) {
    if (chartType === "Transit" && excludePoints.includes(pointsSettings[i]!.name)) {
      continue;
    }
    positionIndexMap[String(pointsAbsPositions[i])] = i;
  }

  const sortedPositions = Object.keys(positionIndexMap)
    .map(Number)
    .sort((a, b) => a - b);

  const pointGroups: number[][] = [];
  let inGroup = false;

  for (let posIdx = 0; posIdx < sortedPositions.length; posIdx += 1) {
    const pointAIdx = positionIndexMap[String(sortedPositions[posIdx]!)]!;
    const pointBIdx
      = positionIndexMap[
        String(sortedPositions[posIdx === sortedPositions.length - 1 ? 0 : posIdx + 1]!)
      ]!;

    const distance = degreeDiff(pointsAbsPositions[pointAIdx]!, pointsAbsPositions[pointBIdx]!);
    if (distance <= INDICATOR_GROUPING_THRESHOLD) {
      if (inGroup) {
        pointGroups[pointGroups.length - 1]!.push(pointBIdx);
      }
      else {
        pointGroups.push([pointAIdx, pointBIdx]);
        inGroup = true;
      }
    }
    else {
      inGroup = false;
    }
  }

  for (const group of pointGroups) {
    applyGroupAdjustments(group, positionAdjustments);
  }

  return positionAdjustments;
}

export function applyGroupAdjustments(group: number[], adjustments: Record<number, number>): void {
  const size = group.length;
  if (size === 2) {
    adjustments[group[0]!] = -1.5;
    adjustments[group[1]!] = 1.5;
  }
  else if (size === 3) {
    adjustments[group[0]!] = -2.0;
    adjustments[group[1]!] = 0.0;
    adjustments[group[2]!] = 2.0;
  }
  else if (size === 4) {
    adjustments[group[0]!] = -3.0;
    adjustments[group[1]!] = -1.0;
    adjustments[group[2]!] = 1.0;
    adjustments[group[3]!] = 3.0;
  }
  else if (size >= 5) {
    const spread = 1.5;
    const mid = (size - 1) / 2;
    for (let i = 0; i < size; i += 1) {
      adjustments[group[i]!] = (i - mid) * spread;
    }
  }
}

function applySecondaryGroupAdjustments(group: number[], adjustments: Record<number, number>): void {
  const size = group.length;
  if (size === 2) {
    adjustments[group[0]!] = -1.0;
    adjustments[group[1]!] = 1.0;
  }
  else if (size === 3) {
    adjustments[group[0]!] = -1.5;
    adjustments[group[1]!] = 0.0;
    adjustments[group[2]!] = 1.5;
  }
  else if (size === 4) {
    adjustments[group[0]!] = -2.0;
    adjustments[group[1]!] = -1.0;
    adjustments[group[2]!] = 1.0;
    adjustments[group[3]!] = 2.0;
  }
}

function calculateSecondaryIndicatorAdjustments(
  pointsAbsPositions: ReadonlyArray<number>,
  pointsSettings: ReadonlyArray<PointSetting>,
  chartType = "",
  excludePoints: string[] = [],
): Record<number, number> {
  const positionAdjustments: Record<number, number> = Object.fromEntries(
    pointsSettings.map((_, index) => [index, 0.0]),
  );

  const positionIndexMap: Record<string, number> = {};
  for (let i = 0; i < pointsSettings.length; i += 1) {
    if (chartType === "Transit" && excludePoints.includes(pointsSettings[i]!.name)) {
      continue;
    }
    positionIndexMap[String(pointsAbsPositions[i])] = i;
  }

  const sortedPositions = Object.keys(positionIndexMap)
    .map(Number)
    .sort((a, b) => a - b);

  const pointGroups: number[][] = [];
  let inGroup = false;

  for (let posIdx = 0; posIdx < sortedPositions.length; posIdx += 1) {
    const pointAIdx = positionIndexMap[String(sortedPositions[posIdx]!)]!;
    const pointBIdx
      = positionIndexMap[
        String(sortedPositions[posIdx === sortedPositions.length - 1 ? 0 : posIdx + 1]!)
      ]!;

    const distance = degreeDiff(pointsAbsPositions[pointAIdx]!, pointsAbsPositions[pointBIdx]!);
    if (distance <= INDICATOR_GROUPING_THRESHOLD) {
      if (inGroup) {
        pointGroups[pointGroups.length - 1]!.push(pointBIdx);
      }
      else {
        pointGroups.push([pointAIdx, pointBIdx]);
        inGroup = true;
      }
    }
    else {
      inGroup = false;
    }
  }

  for (const group of pointGroups) {
    applySecondaryGroupAdjustments(group, positionAdjustments);
  }

  return positionAdjustments;
}

export function calculateTextRotation(
  firstHouseDegree: number,
  pointAbsPosition: number,
): [number, "start" | "end"] {
  let rotation = firstHouseDegree - pointAbsPosition;
  let textAnchor: "start" | "end" = "end";

  while (rotation > 180) {
    rotation -= 360;
  }
  while (rotation < -180) {
    rotation += 360;
  }

  if (rotation < -90 || rotation > 90) {
    rotation += rotation < 0 ? 180 : -180;
    textAnchor = "start";
  }

  return [rotation, textAnchor];
}

export function generatePointSvg(
  pointDetails: KerykeionPointModel,
  x: number,
  y: number,
  scale: number,
  pointName: string,
): string {
  const pyNum = (value: number) => (Number.isInteger(value) ? value.toFixed(1) : String(value));
  const isRetrograde = pointDetails.retrograde === true;
  const retroAttr = isRetrograde ? " kr:retrograde=\"true\"" : "";

  let svg = `<g kr:node="ChartPoint" kr:house="${pointDetails.house}" kr:sign="${pointDetails.sign}"`;
  svg += ` kr:absoluteposition="${pointDetails.abs_pos}" kr:signposition="${pointDetails.position}"`;
  svg += ` kr:slug="${pointDetails.name}"${retroAttr} transform="translate(-${pyNum(12 * scale)},-${pyNum(12 * scale)}) scale(${pyNum(scale)})">`;
  svg += `<use x="${pyNum(x * (1 / scale))}" y="${pyNum(y * (1 / scale))}" xlink:href="#${pointName}" />`;

  if (isRetrograde) {
    const retroX = x * (1 / scale) + 22;
    const retroY = y * (1 / scale) + 18;
    svg += `<g transform="translate(${pyNum(retroX)},${pyNum(retroY)}) scale(0.55)">`;
    svg += "<use xlink:href=\"#retrograde\" />";
    svg += "</g>";
  }

  svg += "</g>";
  return svg;
}

function drawExternalNatalLines(
  output: string,
  radius: number,
  thirdCircleRadius: number,
  pointRadius: number,
  trueOffset: number,
  adjustedOffset: number,
  color: string,
): string {
  let x1 = sliceToX(0, radius - thirdCircleRadius, trueOffset) + thirdCircleRadius;
  let y1 = sliceToY(0, radius - thirdCircleRadius, trueOffset) + thirdCircleRadius;
  let x2 = sliceToX(0, radius - pointRadius - 30, trueOffset) + pointRadius + 30;
  let y2 = sliceToY(0, radius - pointRadius - 30, trueOffset) + pointRadius + 30;
  let nextOutput
    = `${output
    }<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke-width:1px;stroke:${color};stroke-opacity:.3;"/>\n`;

  x1 = x2;
  y1 = y2;
  x2 = sliceToX(0, radius - pointRadius - 10, adjustedOffset) + pointRadius + 10;
  y2 = sliceToY(0, radius - pointRadius - 10, adjustedOffset) + pointRadius + 10;
  nextOutput += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke-width:1px;stroke:${color};stroke-opacity:.5;"/>\n`;

  return nextOutput;
}

function drawPrimaryPointIndicators(
  output: string,
  radius: number,
  firstCircleRadius: number,
  _thirdCircleRadius: number,
  _firstHouseDegree: number,
  seventhHouseDegree: number,
  pointsAbsPositions: number[],
  pointsRelPositions: number[],
  pointsSettings: ReadonlyArray<PointSetting>,
): string {
  const positionAdjustments = calculateIndicatorAdjustments(pointsAbsPositions, pointsSettings);
  const zeroPoint = 360 - seventhHouseDegree;
  let nextOutput = output;

  for (let pointIdx = 0; pointIdx < pointsSettings.length; pointIdx += 1) {
    let pointOffset = zeroPoint + pointsAbsPositions[pointIdx]!;
    if (pointOffset > 360) {
      pointOffset -= 360;
    }

    const x1 = sliceToX(0, radius - firstCircleRadius + 4, pointOffset) + firstCircleRadius - 4;
    const y1 = sliceToY(0, radius - firstCircleRadius + 4, pointOffset) + firstCircleRadius - 4;
    const x2 = sliceToX(0, radius - firstCircleRadius - 4, pointOffset) + firstCircleRadius + 4;
    const y2 = sliceToY(0, radius - firstCircleRadius - 4, pointOffset) + firstCircleRadius + 4;

    const pointColor = pointsSettings[pointIdx]!.color;
    nextOutput += `<line class="planet-degree-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke: ${pointColor}; stroke-width: 1px; stroke-opacity:.8;"/>`;

    const adjustedPointOffset = pointOffset + (positionAdjustments[pointIdx] ?? 0);
    const textRadius = firstCircleRadius - 10.0;
    const degX = sliceToX(0, radius - textRadius, adjustedPointOffset) + textRadius;
    const degY = sliceToY(0, radius - textRadius, adjustedPointOffset) + textRadius;
    const degreeText = convertDecimalToDegreeString(pointsRelPositions[pointIdx]!, "1");

    nextOutput += `<g transform="translate(${degX},${degY})">`;
    nextOutput += `<text text-anchor="middle" dominant-baseline="middle" style="fill: ${pointColor}; font-size: 10px;">${degreeText}</text></g>`;
  }

  return nextOutput;
}

function drawInnerPointIndicators(
  output: string,
  radius: number,
  _thirdCircleRadius: number,
  _firstHouseDegree: number,
  seventhHouseDegree: number,
  pointsAbsPositions: number[],
  pointsRelPositions: number[],
  pointsSettings: ReadonlyArray<PointSetting>,
): string {
  const positionAdjustments = calculateIndicatorAdjustments(pointsAbsPositions, pointsSettings);
  const zeroPoint = 360 - seventhHouseDegree;
  let nextOutput = output;

  for (let pointIdx = 0; pointIdx < pointsSettings.length; pointIdx += 1) {
    let pointOffset = zeroPoint + pointsAbsPositions[pointIdx]!;
    if (pointOffset > 360) {
      pointOffset -= 360;
    }

    const x1 = sliceToX(0, radius - NATAL_INDICATOR_OFFSET + 4, pointOffset) + NATAL_INDICATOR_OFFSET - 4;
    const y1 = sliceToY(0, radius - NATAL_INDICATOR_OFFSET + 4, pointOffset) + NATAL_INDICATOR_OFFSET - 4;
    const x2 = sliceToX(0, radius - NATAL_INDICATOR_OFFSET - 4, pointOffset) + NATAL_INDICATOR_OFFSET + 4;
    const y2 = sliceToY(0, radius - NATAL_INDICATOR_OFFSET - 4, pointOffset) + NATAL_INDICATOR_OFFSET + 4;

    const pointColor = pointsSettings[pointIdx]!.color;
    nextOutput += `<line class="planet-degree-line-inner" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke: ${pointColor}; stroke-width: 1px; stroke-opacity:.8;"/>`;

    const adjustedPointOffset = pointOffset + (positionAdjustments[pointIdx] ?? 0);
    const textRadius = NATAL_INDICATOR_OFFSET + 5.0;
    const degX = sliceToX(0, radius - textRadius, adjustedPointOffset) + textRadius;
    const degY = sliceToY(0, radius - textRadius, adjustedPointOffset) + textRadius;
    const degreeText = convertDecimalToDegreeString(pointsRelPositions[pointIdx]!, "1");

    nextOutput += `<g transform="translate(${degX},${degY})">`;
    nextOutput += `<text text-anchor="middle" dominant-baseline="middle" style="fill: ${pointColor}; font-size: 8px;">${degreeText}</text></g>`;
  }

  return nextOutput;
}

function drawSecondaryPoints(
  output: string,
  radius: number,
  _firstHouseDegree: number,
  seventhHouseDegree: number,
  pointsAbsPositions: number[],
  pointsRelPositions: number[],
  pointsSettings: ReadonlyArray<PointSetting>,
  chartType: string,
  excludePoints: string[],
  mainOffset: number,
  celestialPoints: KerykeionPointModel[] | null = null,
): string {
  const positionAdjustments = calculateSecondaryIndicatorAdjustments(
    pointsAbsPositions,
    pointsSettings,
    chartType,
    excludePoints,
  );

  const positionIndexMap: Record<string, number> = {};
  for (let i = 0; i < pointsSettings.length; i += 1) {
    if (chartType === "Transit" && excludePoints.includes(pointsSettings[i]!.name)) {
      continue;
    }
    positionIndexMap[String(pointsAbsPositions[i])] = i;
  }

  const sortedPositions = Object.keys(positionIndexMap)
    .map(Number)
    .sort((a, b) => a - b);
  const zeroPoint = 360 - seventhHouseDegree;
  let alternatePosition = false;
  let pointIdx = 0;
  let nextOutput = output;

  for (const absPosition of sortedPositions) {
    pointIdx = positionIndexMap[String(absPosition)]!;
    if (chartType === "Transit" && excludePoints.includes(pointsSettings[pointIdx]!.name)) {
      continue;
    }

    const isChartAngle = CHART_ANGLE_MIN_INDEX < pointIdx && pointIdx < CHART_ANGLE_MAX_INDEX;
    let pointRadius = 26;
    if (isChartAngle) {
      pointRadius = 9;
    }
    else if (alternatePosition) {
      pointRadius = 18;
      alternatePosition = false;
    }
    else {
      pointRadius = 26;
      alternatePosition = true;
    }

    let pointOffset = zeroPoint + pointsAbsPositions[pointIdx]!;
    if (pointOffset > 360) {
      pointOffset -= 360;
    }

    const pointX = sliceToX(0, radius - pointRadius, pointOffset) + pointRadius;
    const pointY = sliceToY(0, radius - pointRadius, pointOffset) + pointRadius;
    const isRetrograde
      = celestialPoints !== null
        && pointIdx < celestialPoints.length
        && celestialPoints[pointIdx]!.retrograde === true;
    const retroAttr = isRetrograde ? " kr:retrograde=\"true\"" : "";
    nextOutput += `<g class="transit-planet-name"${retroAttr} transform="translate(-6,-6)"><g transform="scale(0.5)">`;
    nextOutput += `<use x="${pointX * 2}" y="${pointY * 2}" xlink:href="#${pointsSettings[pointIdx]!.name}" />`;
    if (isRetrograde) {
      const retroX = pointX * 2 + 22;
      const retroY = pointY * 2 + 18;
      nextOutput += `<g transform="translate(${retroX},${retroY}) scale(0.55)">`;
      nextOutput += "<use xlink:href=\"#retrograde\" />";
      nextOutput += "</g>";
    }
    nextOutput += "</g></g>";

    const x1 = sliceToX(0, radius + 3, pointOffset) - 3;
    const y1 = sliceToY(0, radius + 3, pointOffset) - 3;
    const x2 = sliceToX(0, radius - 3, pointOffset) + 3;
    const y2 = sliceToY(0, radius - 3, pointOffset) + 3;
    const pointColor = pointsSettings[pointIdx]!.color;
    nextOutput += `<line class="transit-planet-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke: ${pointColor}; stroke-width: 1px; stroke-opacity:.8;"/>`;

    const adjustedPointOffset = pointOffset + (positionAdjustments[pointIdx] ?? 0);
    const textRadius = -9.0;
    const degX = sliceToX(0, radius - textRadius, adjustedPointOffset) + textRadius;
    const degY = sliceToY(0, radius - textRadius, adjustedPointOffset) + textRadius;
    const degreeText = convertDecimalToDegreeString(pointsRelPositions[pointIdx]!, "1");
    nextOutput += `<g transform="translate(${degX},${degY})">`;
    nextOutput += `<text text-anchor="middle" dominant-baseline="middle" style="fill: ${pointColor}; font-size: 10px;">${degreeText}</text></g>`;
  }

  let dropin = DUAL_CHART_TYPES.includes(chartType as (typeof DUAL_CHART_TYPES)[number]) ? 36 : 0;
  let x1 = sliceToX(0, radius - (dropin + 3), mainOffset) + (dropin + 3);
  let y1 = sliceToY(0, radius - (dropin + 3), mainOffset) + (dropin + 3);
  let x2 = sliceToX(0, radius - (dropin - 3), mainOffset) + (dropin - 3);
  let y2 = sliceToY(0, radius - (dropin - 3), mainOffset) + (dropin - 3);
  const pointColor = pointsSettings[pointIdx]!.color;
  nextOutput += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke: ${pointColor}; stroke-width: 2px; stroke-opacity:.6;"/>`;

  dropin = DUAL_CHART_TYPES.includes(chartType as (typeof DUAL_CHART_TYPES)[number]) ? 160 : 120;
  x1 = sliceToX(0, radius - dropin, mainOffset) + dropin;
  y1 = sliceToY(0, radius - dropin, mainOffset) + dropin;
  x2 = sliceToX(0, radius - (dropin - 3), mainOffset) + (dropin - 3);
  y2 = sliceToY(0, radius - (dropin - 3), mainOffset) + (dropin - 3);
  nextOutput += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke: ${pointColor}; stroke-width: 2px; stroke-opacity:.6;"/>`;

  return nextOutput;
}

export {
  applyGroupAdjustments as _apply_group_adjustments,
  calculateIndicatorAdjustments as _calculate_indicator_adjustments,
  calculatePlanetAdjustments as _calculate_planet_adjustments,
  calculatePointOffset as _calculate_point_offset,
  calculateTextRotation as _calculate_text_rotation,
  determinePointRadius as _determine_point_radius,
  generatePointSvg as _generate_point_svg,
  handleMultiPointGroup as _handle_multi_point_group,
  handleTwoPointGroup as _handle_two_point_group,
  drawPlanets as draw_planets,
};
