import type { AspectMovementType, AstrologicalPoint } from "../schemas/literals";
import type {
  ActiveAspect,
  AstrologicalBaseModel,
  KerykeionPointModel,
} from "../schemas/models";
import { getSweph } from "../sweph";

interface CelestialPointSettingLike {
  id: number;
  name: string;
}

const aspectDegreeMap = {
  "conjunction": 0,
  "semi-sextile": 30,
  "semi-square": 45,
  "sextile": 60,
  "quintile": 72,
  "square": 90,
  "trine": 120,
  "sesquiquadrate": 135,
  "biquintile": 144,
  "quincunx": 150,
  "opposition": 180,
} as const;

export function getAspectFromTwoPoints(
  aspectsSettings: ActiveAspect[],
  pointOne: number,
  pointTwo: number,
): {
  verdict: boolean;
  name: ActiveAspect["name"] | null;
  orbit: number;
  distance: number;
  aspect_degrees: number;
  diff: number;
} {
  const sweph = getSweph();
  const distance = Math.abs(sweph.difdeg2n(pointOne, pointTwo));
  const diff = Math.abs(pointOne - pointTwo);

  for (const aspect of aspectsSettings) {
    const aspectDegree = aspectDegreeMap[aspect.name];
    const aspectOrb = aspect.orb;
    if (distance >= aspectDegree - aspectOrb && distance <= aspectDegree + aspectOrb) {
      return {
        verdict: true,
        name: aspect.name,
        orbit: Math.abs(distance - aspectDegree),
        distance: Math.abs(distance - aspectDegree),
        aspect_degrees: aspectDegree,
        diff,
      };
    }
  }

  return {
    verdict: false,
    name: null,
    orbit: 0,
    distance: 0,
    aspect_degrees: 0,
    diff,
  };
}

export function calculateAspectMovement(
  pointOneAbsPos: number,
  pointTwoAbsPos: number,
  aspectDegrees: number,
  pointOneSpeed: number,
  pointTwoSpeed: number,
): AspectMovementType {
  const SPEED_EPSILON = 1e-9;
  const ORB_EPSILON = 1e-6;
  const DT = 0.001;

  if (pointOneSpeed === null || pointTwoSpeed === null) {
    throw new ValueError(
      "Speed values for both points are required to compute aspect movement correctly. point_one_speed and point_two_speed cannot be None.",
    );
  }

  if (!(pointOneAbsPos >= 0 && pointOneAbsPos < 360) || !(pointTwoAbsPos >= 0 && pointTwoAbsPos < 360)) {
    throw new ValueError(
      `Positions must be in range [0, 360). Got p1=${pointOneAbsPos}, p2=${pointTwoAbsPos}`,
    );
  }

  if (aspectDegrees < 0) {
    throw new ValueError(`Aspect degrees must be non-negative. Got ${aspectDegrees}`);
  }

  const relativeSpeed = Math.abs(pointOneSpeed - pointTwoSpeed);
  if (relativeSpeed < SPEED_EPSILON) {
    return "Static";
  }

  const sweph = getSweph();
  const getOrb = (p1: number, p2: number, aspect: number): number => {
    const diff = Math.abs(sweph.difdeg2n(p1, p2));
    return Math.abs(diff - aspect);
  };

  let aspectNorm = aspectDegrees % 360;
  if (aspectNorm > 180) {
    aspectNorm = 360 - aspectNorm;
  }

  const currentOrb = getOrb(pointOneAbsPos, pointTwoAbsPos, aspectNorm);
  const p1Future = (pointOneAbsPos + pointOneSpeed * DT + 360) % 360;
  const p2Future = (pointTwoAbsPos + pointTwoSpeed * DT + 360) % 360;
  const futureOrb = getOrb(p1Future, p2Future, aspectNorm);
  const orbChange = futureOrb - currentOrb;

  if (Math.abs(orbChange) < ORB_EPSILON) {
    return "Static";
  }
  return orbChange < 0 ? "Applying" : "Separating";
}

export function getActivePointsList(
  subject: AstrologicalBaseModel,
  activePoints: AstrologicalPoint[] | null | undefined = undefined,
  celestialPoints: CelestialPointSettingLike[] = [],
): KerykeionPointModel[] {
  const points = activePoints ?? [];
  const pointList: KerykeionPointModel[] = [];
  for (const planet of celestialPoints) {
    if (points.includes(planet.name as AstrologicalPoint)) {
      const point = subject[planet.name.toLowerCase() as keyof AstrologicalBaseModel];
      pointList.push(point as KerykeionPointModel);
    }
  }
  return pointList;
}

class ValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValueError";
  }
}
