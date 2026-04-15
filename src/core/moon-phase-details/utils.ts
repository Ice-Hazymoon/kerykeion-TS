import { Temporal } from "@js-temporal/polyfill";
import { getSweph } from "../sweph";
import { datetimeToJulian, julianToDatetime } from "../utilities";

const AU_KM = 149597870.7;
const STANDARD_ATMOSPHERIC_PRESSURE_HPA = 1013.25;
const STANDARD_TEMPERATURE_CELSIUS = 15.0;

function getConstant(name: string, fallback = 0): number {
  const sweph = getSweph();
  const value = (sweph.constants as unknown as Record<string, unknown>)[name];
  return typeof value === "number" ? value : fallback;
}

export function safeParseIsoDatetime(value?: string | null): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const repaired = new Date(value.replace("Z", "+00:00"));
  return Number.isNaN(repaired.getTime()) ? new Date() : repaired;
}

export function describeSolarEclipseType(retflag: number): string {
  const ECL_TOTAL = getConstant("SE_ECL_TOTAL", getConstant("ECL_TOTAL", 0));
  const ECL_ANNULAR_TOTAL = getConstant("SE_ECL_ANNULAR_TOTAL", getConstant("ECL_ANNULAR_TOTAL", 0));
  const ECL_ANNULAR = getConstant("SE_ECL_ANNULAR", getConstant("ECL_ANNULAR", 0));
  const ECL_PARTIAL = getConstant("SE_ECL_PARTIAL", getConstant("ECL_PARTIAL", 0));

  if (retflag & ECL_TOTAL) {
    return "Total Solar Eclipse";
  }
  if (retflag & ECL_ANNULAR_TOTAL) {
    return "Hybrid Solar Eclipse";
  }
  if (retflag & ECL_ANNULAR) {
    return "Annular Solar Eclipse";
  }
  if (retflag & ECL_PARTIAL) {
    return "Partial Solar Eclipse";
  }
  return "Solar Eclipse";
}

export function describeLunarEclipseType(retflag: number): string {
  const ECL_TOTAL = getConstant("SE_ECL_TOTAL", getConstant("ECL_TOTAL", 0));
  const ECL_PARTIAL = getConstant("SE_ECL_PARTIAL", getConstant("ECL_PARTIAL", 0));
  const ECL_PENUMBRAL = getConstant("SE_ECL_PENUMBRAL", getConstant("ECL_PENUMBRAL", 0));

  if (retflag & ECL_TOTAL) {
    return "Total Lunar Eclipse";
  }
  if (retflag & ECL_PARTIAL) {
    return "Partial Lunar Eclipse";
  }
  if (retflag & ECL_PENUMBRAL) {
    return "Penumbral Lunar Eclipse";
  }
  return "Lunar Eclipse";
}

function configureEphemerisPath(): number {
  const sweph = getSweph();
  return sweph.constants.SEFLG_SWIEPH;
}

export function computeNextSolarEclipseJd(jdStart: number): [number, number] | null {
  try {
    const sweph = getSweph();
    const iflag = configureEphemerisPath();
    const solEclipseWhenGlob = sweph.sol_eclipse_when_glob as unknown as (
      tjdStart: number,
      ifl: number,
      iftype: number,
      backwards: boolean,
    ) => { flag: number; data?: number[] };
    const result = solEclipseWhenGlob(jdStart, iflag, 0, false);
    const eclipseJd = result.data?.[0];
    return typeof eclipseJd === "number" ? [result.flag, eclipseJd] : null;
  }
  catch {
    return null;
  }
}

export function computeNextLunarEclipseJd(jdStart: number): [number, number] | null {
  try {
    const sweph = getSweph();
    const iflag = configureEphemerisPath();
    const result = sweph.lun_eclipse_when(jdStart, iflag, 0, false);
    const eclipseJd = result.data?.[0];
    return typeof eclipseJd === "number" ? [result.flag, eclipseJd] : null;
  }
  catch {
    return null;
  }
}

export function computeSunRiseSetSwe(
  jdMidnight: number,
  latitude: number,
  longitude: number,
): [number | null, number | null] {
  try {
    const sweph = getSweph();
    const iflag = configureEphemerisPath();
    const calcRise = getConstant("SE_CALC_RISE", getConstant("CALC_RISE", 1));
    const calcSet = getConstant("SE_CALC_SET", getConstant("CALC_SET", 2));
    const geopos: [number, number, number] = [longitude, latitude, 0];

    const sunrise = sweph.rise_trans(
      jdMidnight,
      sweph.constants.SE_SUN,
      null,
      iflag,
      calcRise,
      geopos,
      STANDARD_ATMOSPHERIC_PRESSURE_HPA,
      STANDARD_TEMPERATURE_CELSIUS,
    );
    const sunset = sweph.rise_trans(
      jdMidnight,
      sweph.constants.SE_SUN,
      null,
      iflag,
      calcSet,
      geopos,
      STANDARD_ATMOSPHERIC_PRESSURE_HPA,
      STANDARD_TEMPERATURE_CELSIUS,
    );

    return [
      sunrise.flag === 0 && typeof sunrise.data === "number" ? sunrise.data : null,
      sunset.flag === 0 && typeof sunset.data === "number" ? sunset.data : null,
    ];
  }
  catch {
    return [null, null];
  }
}

export function computeLunarPhaseJd(
  jdStart: number,
  targetAngle: number,
  forward = true,
): number | null {
  try {
    const sweph = getSweph();
    configureEphemerisPath();
    const iflag = sweph.constants.SEFLG_SWIEPH;
    const normalizedTarget = ((targetAngle % 360) + 360) % 360;
    const searchRange = 30;
    let jdMin = forward ? jdStart : jdStart - searchRange;
    let jdMax = forward ? jdStart + searchRange : jdStart;
    const tolerance = 1 / 86400;

    for (let i = 0; i < 50; i += 1) {
      const jdMid = (jdMin + jdMax) / 2;
      const sunPos = sweph.calc_ut(jdMid, sweph.constants.SE_SUN, iflag).data;
      const moonPos = sweph.calc_ut(jdMid, sweph.constants.SE_MOON, iflag).data;
      const angle = (((moonPos[0] ?? 0) - (sunPos[0] ?? 0)) % 360 + 360) % 360;
      const diff = (((angle - normalizedTarget + 180) % 360) + 360) % 360 - 180;

      if ((forward && diff < 0) || (!forward && diff > 0)) {
        jdMin = jdMid;
      }
      else {
        jdMax = jdMid;
      }

      if (Math.abs(jdMax - jdMin) < tolerance) {
        return jdMid;
      }
    }

    return (jdMin + jdMax) / 2;
  }
  catch {
    return null;
  }
}

function greenwichMeanSiderealTime(jdUt: number): number {
  const T = (jdUt - 2451545.0) / 36525.0;
  const gmstDeg
    = 280.46061837 + 360.98564736629 * (jdUt - 2451545.0) + 0.000387933 * T ** 2 - T ** 3 / 38710000.0;
  return ((gmstDeg % 360) + 360) % 360 / 15.0;
}

function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  jdUt: number,
  latitude: number,
  longitude: number,
): [number, number] {
  const raHours = raDeg / 15;
  const decRad = (decDeg * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;
  const gmstHours = greenwichMeanSiderealTime(jdUt);
  const lstHours = ((gmstHours + longitude / 15) % 24 + 24) % 24;
  let HHours = ((lstHours - raHours) % 24 + 24) % 24;
  if (HHours > 12) {
    HHours -= 24;
  }
  const HRad = (HHours * 15 * Math.PI) / 180;

  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(HRad);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const altDeg = (altRad * 180) / Math.PI;

  const cosAlt = Math.cos(altRad);
  if (Math.abs(cosAlt) < 1e-9) {
    return [altDeg, 0];
  }

  const sinAz = (-Math.cos(decRad) * Math.sin(HRad)) / cosAlt;
  const cosAz = (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) / (cosAlt * Math.cos(latRad));
  const azDeg = (((Math.atan2(sinAz, cosAz) * 180) / Math.PI) + 360) % 360;
  return [altDeg, azDeg];
}

export function computeSunPosition(
  jdUt: number,
  latitude: number,
  longitude: number,
): [number | null, number | null, number | null] {
  try {
    const sweph = getSweph();
    configureEphemerisPath();
    const iflag = sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED;
    const sunCalc = sweph.calc_ut(jdUt, sweph.constants.SE_SUN, iflag).data;
    const distanceKm = Number(sunCalc[2] ?? 0) * AU_KM;
    const sunEq = sweph.calc_ut(jdUt, sweph.constants.SE_SUN, iflag | sweph.constants.SEFLG_EQUATORIAL).data;
    const [altitude, azimuth] = equatorialToHorizontal(
      Number(sunEq[0] ?? 0),
      Number(sunEq[1] ?? 0),
      jdUt,
      latitude,
      longitude,
    );
    return [altitude, azimuth, distanceKm];
  }
  catch {
    return [null, null, null];
  }
}

function toUtcDateParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const instant = Temporal.Instant.from(date.toISOString());
  const zoned = instant.toZonedDateTimeISO(timeZone);
  return { year: zoned.year, month: zoned.month, day: zoned.day };
}

export function localMidnightJulian(date: Date, timeZone: string): number {
  const parts = toUtcDateParts(date, timeZone);
  const midnightLocal = Temporal.ZonedDateTime.from({
    timeZone,
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
    second: 0,
  });
  return datetimeToJulian(new Date(midnightLocal.toInstant().epochMilliseconds));
}

export { julianToDatetime };
