import type { LunarPhaseEmoji, LunarPhaseName } from "../schemas/literals";
import type {
  AstrologicalSubjectModel,
  LunarPhaseModel,
  MoonPhaseEclipseModel,
  MoonPhaseEventMomentModel,
  MoonPhaseIlluminationDetailsModel,
  MoonPhaseLocationModel,
  MoonPhaseMajorPhaseWindowModel,
  MoonPhaseMoonDetailedModel,
  MoonPhaseMoonSummaryModel,
  MoonPhaseOverviewModel,
  MoonPhaseSolarEclipseModel,
  MoonPhaseSunInfoModel,
  MoonPhaseSunPositionModel,
  MoonPhaseUpcomingPhasesModel,
  MoonPhaseZodiacModel,
} from "../schemas/models";
import { Temporal } from "@js-temporal/polyfill";
import { datetimeToJulian } from "../utilities";
import {
  computeLunarPhaseJd,
  computeNextLunarEclipseJd,
  computeNextSolarEclipseJd,
  computeSunPosition,
  computeSunRiseSetSwe,
  describeLunarEclipseType,
  describeSolarEclipseType,
  julianToDatetime,
  localMidnightJulian,
  safeParseIsoDatetime,
} from "./utils";

const SYNODIC_MONTH_DAYS = 29.530588853;

function getUtcDatetime(subject: AstrologicalSubjectModel): Date {
  return safeParseIsoDatetime(subject.iso_formatted_utc_datetime ?? subject.iso_formatted_local_datetime);
}

function computeMajorPhaseName(degreesBetween: number): string {
  const angle = ((degreesBetween % 360) + 360) % 360;
  const majorPhases: Array<[number, string]> = [
    [0, "New Moon"],
    [90, "First Quarter"],
    [180, "Full Moon"],
    [270, "Last Quarter"],
  ];

  const angularDistance = (a: number, b: number): number => {
    const diff = ((a - b) % 360 + 360) % 360;
    return Math.min(diff, 360 - diff);
  };

  return majorPhases.reduce((best, current) =>
    angularDistance(angle, current[0]) < angularDistance(angle, best[0]) ? current : best,
  )[1];
}

function createEventMoment(eventDate: Date, referenceDate: Date, isPast: boolean): MoonPhaseEventMomentModel {
  const timestamp = Math.floor(eventDate.getTime() / 1000);
  const datestamp = eventDate.toUTCString().replace("GMT", "+0000");
  const dayDiff = Math.round(Math.abs(referenceDate.getTime() - eventDate.getTime()) / 86400000);
  return isPast
    ? { timestamp, datestamp, days_ago: dayDiff }
    : { timestamp, datestamp, days_ahead: dayDiff };
}

function buildMajorPhaseWindow(baseDate: Date, baseJd: number, targetAngle: number): MoonPhaseMajorPhaseWindowModel {
  const nextJd = computeLunarPhaseJd(baseJd, targetAngle, true);
  const lastJd = computeLunarPhaseJd(baseJd, targetAngle, false);
  if (nextJd == null || lastJd == null) {
    return { last: null, next: null };
  }
  return {
    last: createEventMoment(julianToDatetime(lastJd), baseDate, true),
    next: createEventMoment(julianToDatetime(nextJd), baseDate, false),
  };
}

function buildUpcomingPhases(subject: AstrologicalSubjectModel): MoonPhaseUpcomingPhasesModel {
  const baseDate = getUtcDatetime(subject);
  const baseJd = datetimeToJulian(baseDate);
  return {
    new_moon: buildMajorPhaseWindow(baseDate, baseJd, 0),
    first_quarter: buildMajorPhaseWindow(baseDate, baseJd, 90),
    full_moon: buildMajorPhaseWindow(baseDate, baseJd, 180),
    last_quarter: buildMajorPhaseWindow(baseDate, baseJd, 270),
  };
}

function computeSunTimes(subject: AstrologicalSubjectModel): [Date, Date] | null {
  if (subject.lat == null || subject.lng == null || !subject.tz_str) {
    return null;
  }
  const dtUtc = getUtcDatetime(subject);
  const jdMidnight = localMidnightJulian(dtUtc, subject.tz_str);
  const [sunriseJd, sunsetJd] = computeSunRiseSetSwe(jdMidnight, subject.lat, subject.lng);
  if (sunriseJd == null || sunsetJd == null) {
    return null;
  }

  const sunriseUtc = julianToDatetime(sunriseJd);
  const sunsetUtc = julianToDatetime(sunsetJd);
  const sunriseLocal = Temporal.Instant.from(sunriseUtc.toISOString()).toZonedDateTimeISO(subject.tz_str);
  const sunsetLocal = Temporal.Instant.from(sunsetUtc.toISOString()).toZonedDateTimeISO(subject.tz_str);
  return [
    new Date(sunriseLocal.toInstant().epochMilliseconds),
    new Date(sunsetLocal.toInstant().epochMilliseconds),
  ];
}

function computeNextSolarEclipse(subject: AstrologicalSubjectModel): MoonPhaseSolarEclipseModel | null {
  const result = computeNextSolarEclipseJd(datetimeToJulian(getUtcDatetime(subject)));
  if (!result) {
    return null;
  }
  const [retflag, eclipseJd] = result;
  const eclipseDate = julianToDatetime(eclipseJd);
  return {
    timestamp: Math.floor(eclipseDate.getTime() / 1000),
    datestamp: eclipseDate.toUTCString().replace("GMT", "+0000"),
    type: describeSolarEclipseType(retflag),
    visibility_regions: null,
  };
}

function computeNextLunarEclipse(subject: AstrologicalSubjectModel): MoonPhaseEclipseModel | null {
  const result = computeNextLunarEclipseJd(datetimeToJulian(getUtcDatetime(subject)));
  if (!result) {
    return null;
  }
  const [retflag, eclipseJd] = result;
  const eclipseDate = julianToDatetime(eclipseJd);
  return {
    timestamp: Math.floor(eclipseDate.getTime() / 1000),
    datestamp: eclipseDate.toUTCString().replace("GMT", "+0000"),
    type: describeLunarEclipseType(retflag),
    visibility_regions: null,
  };
}

function computeLunarPhaseMetrics(
  lunarPhase: LunarPhaseModel,
  baseDate: Date,
  upcomingPhases: MoonPhaseUpcomingPhasesModel,
): {
  phase: number;
  phase_name: LunarPhaseName;
  emoji: LunarPhaseEmoji;
  stage: string;
  major_phase: string;
  illumination: string;
  age_days: number;
  lunar_cycle: string;
  illumination_details: MoonPhaseIlluminationDetailsModel;
} {
  const degreesBetween = Number(lunarPhase.degrees_between_s_m);
  const phase = degreesBetween / 360;
  const stage = degreesBetween >= 0 && degreesBetween < 180 ? "waxing" : "waning";
  const majorPhase = computeMajorPhaseName(degreesBetween);
  const illumFraction = 0.5 * (1 - Math.cos((degreesBetween * Math.PI) / 180));
  const illuminationPercent = Math.round(illumFraction * 100);

  let ageDaysPrecise = phase * SYNODIC_MONTH_DAYS;
  const lastNewMoonTimestamp = upcomingPhases.new_moon?.last?.timestamp;
  if (lastNewMoonTimestamp) {
    ageDaysPrecise = (baseDate.getTime() - lastNewMoonTimestamp * 1000) / 86400000;
  }

  return {
    phase,
    phase_name: lunarPhase.moon_phase_name,
    emoji: lunarPhase.moon_emoji,
    stage,
    major_phase: majorPhase,
    illumination: `${illuminationPercent}%`,
    age_days: Math.round(ageDaysPrecise),
    lunar_cycle: `${Number((phase * 100).toFixed(3))}%`,
    illumination_details: {
      percentage: illuminationPercent,
      visible_fraction: illumFraction,
      phase_angle: degreesBetween,
    },
  };
}

function buildMoonZodiacInfo(subject: AstrologicalSubjectModel): MoonPhaseZodiacModel | null {
  if (subject.sun?.sign && subject.moon?.sign) {
    return { sun_sign: subject.sun.sign, moon_sign: subject.moon.sign };
  }
  return null;
}

export class MoonPhaseDetailsFactory {
  static fromSubject(
    subject: AstrologicalSubjectModel,
    options: { using_default_location?: boolean; location_precision?: number } = {},
  ): MoonPhaseOverviewModel {
    const dtUtc = getUtcDatetime(subject);
    return {
      timestamp: Math.floor(dtUtc.getTime() / 1000),
      datestamp: dtUtc.toUTCString().replace("GMT", "+0000"),
      sun: this.buildSunInfo(subject),
      moon: this.buildMoonSummary(subject),
      location: this.buildLocation(subject, {
        using_default_location: options.using_default_location ?? false,
        location_precision: options.location_precision ?? 0,
      }),
    };
  }

  private static buildMoonSummary(subject: AstrologicalSubjectModel): MoonPhaseMoonSummaryModel {
    const lunarPhase = subject.lunar_phase;
    if (!lunarPhase || !subject.sun || !subject.moon) {
      return {
        phase: null,
        phase_name: null,
        major_phase: null,
        stage: null,
        illumination: null,
        age_days: null,
        lunar_cycle: null,
        emoji: null,
        zodiac: null,
        next_lunar_eclipse: null,
        detailed: null,
      };
    }

    const baseDate = getUtcDatetime(subject);
    const upcomingPhases = buildUpcomingPhases(subject);
    const metrics = computeLunarPhaseMetrics(lunarPhase, baseDate, upcomingPhases);
    const detailed: MoonPhaseMoonDetailedModel = {
      position: null,
      visibility: null,
      upcoming_phases: upcomingPhases,
      illumination_details: metrics.illumination_details,
    };

    return {
      phase: metrics.phase,
      phase_name: metrics.phase_name,
      major_phase: metrics.major_phase,
      stage: metrics.stage,
      illumination: metrics.illumination,
      age_days: metrics.age_days,
      lunar_cycle: metrics.lunar_cycle,
      emoji: metrics.emoji,
      zodiac: buildMoonZodiacInfo(subject),
      next_lunar_eclipse: computeNextLunarEclipse(subject),
      detailed,
    };
  }

  private static buildSunInfo(subject: AstrologicalSubjectModel): MoonPhaseSunInfoModel {
    let sunrise: number | null = null;
    let sunriseTimestamp: string | null = null;
    let sunset: number | null = null;
    let sunsetTimestamp: string | null = null;
    let solarNoon: string | null = null;
    let dayLength: string | null = null;
    let position: MoonPhaseSunPositionModel | null = null;

    const sunTimes = computeSunTimes(subject);
    if (sunTimes) {
      const [sunriseLocal, sunsetLocal] = sunTimes;
      sunrise = Math.floor(sunriseLocal.getTime() / 1000);
      sunset = Math.floor(sunsetLocal.getTime() / 1000);
      sunriseTimestamp = Temporal.Instant.from(sunriseLocal.toISOString())
        .toZonedDateTimeISO(subject.tz_str)
        .toPlainTime()
        .toString({ smallestUnit: "minute" });
      sunsetTimestamp = Temporal.Instant.from(sunsetLocal.toISOString())
        .toZonedDateTimeISO(subject.tz_str)
        .toPlainTime()
        .toString({ smallestUnit: "minute" });

      const solarNoonDate = new Date((sunriseLocal.getTime() + sunsetLocal.getTime()) / 2);
      solarNoon = Temporal.Instant.from(solarNoonDate.toISOString())
        .toZonedDateTimeISO(subject.tz_str)
        .toPlainTime()
        .toString({ smallestUnit: "minute" });

      const totalMinutes = Math.round((sunsetLocal.getTime() - sunriseLocal.getTime()) / 60000);
      dayLength = `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, "0")}`;
    }

    if (subject.lat != null && subject.lng != null) {
      const [altitude, azimuth, distance] = computeSunPosition(
        datetimeToJulian(getUtcDatetime(subject)),
        subject.lat,
        subject.lng,
      );
      if (altitude != null || azimuth != null || distance != null) {
        position = { altitude, azimuth, distance };
      }
    }

    return {
      sunrise,
      sunrise_timestamp: sunriseTimestamp,
      sunset,
      sunset_timestamp: sunsetTimestamp,
      solar_noon: solarNoon,
      day_length: dayLength,
      position,
      next_solar_eclipse: computeNextSolarEclipse(subject),
    };
  }

  private static buildLocation(
    subject: AstrologicalSubjectModel,
    options: { using_default_location: boolean; location_precision: number },
  ): MoonPhaseLocationModel {
    return {
      latitude: subject.lat == null ? null : String(subject.lat),
      longitude: subject.lng == null ? null : String(subject.lng),
      precision: options.location_precision,
      using_default_location: options.using_default_location,
    };
  }
}

const moonPhaseDetailsFactoryCompat = MoonPhaseDetailsFactory as typeof MoonPhaseDetailsFactory & {
  from_subject: typeof MoonPhaseDetailsFactory.fromSubject;
};

moonPhaseDetailsFactoryCompat.from_subject = MoonPhaseDetailsFactory.fromSubject;

type FromSubjectAlias = typeof MoonPhaseDetailsFactory.fromSubject;

export namespace MoonPhaseDetailsFactory {
  export const from_subject: FromSubjectAlias = moonPhaseDetailsFactoryCompat.from_subject;
}
