import type {
  HousesSystemIdentifier,
  PerspectiveType,
  SiderealMode,
  ZodiacType,
} from "./schemas/literals";

import type {
  AstrologicalSubjectModel,
  EphemerisDictModel,
} from "./schemas/models";
import { Temporal } from "@js-temporal/polyfill";
import { AstrologicalSubjectFactory } from "./astrological-subject-factory";
import {
  getAvailableAstrologicalPointsList,
  getHousesList,
  normalizeZodiacType,
} from "./utilities";

export interface EphemerisDataFactoryOptions {
  start_datetime: Date | string | Temporal.PlainDateTime;
  end_datetime: Date | string | Temporal.PlainDateTime;
  step_type?: "days" | "hours" | "minutes";
  step?: number;
  lat?: number;
  lng?: number;
  tz_str?: string;
  is_dst?: boolean;
  zodiac_type?: ZodiacType | string;
  sidereal_mode?: SiderealMode | null;
  houses_system_identifier?: HousesSystemIdentifier;
  perspective_type?: PerspectiveType;
  max_days?: number | null;
  max_hours?: number | null;
  max_minutes?: number | null;
  custom_ayanamsa_t0?: number | null;
  custom_ayanamsa_ayan_t0?: number | null;
}

function toPlainDateTime(value: Date | string | Temporal.PlainDateTime): Temporal.PlainDateTime {
  if (value instanceof Temporal.PlainDateTime) {
    return value;
  }
  if (value instanceof Date) {
    return new Temporal.PlainDateTime(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds(),
    );
  }
  return Temporal.PlainDateTime.from(value);
}

function addStep(
  value: Temporal.PlainDateTime,
  stepType: "days" | "hours" | "minutes",
  step: number,
): Temporal.PlainDateTime {
  if (stepType === "days") {
    return value.add({ days: step });
  }
  if (stepType === "hours") {
    return value.add({ hours: step });
  }
  return value.add({ minutes: step });
}

export class EphemerisDataFactory {
  readonly start_datetime: Temporal.PlainDateTime;
  readonly end_datetime: Temporal.PlainDateTime;
  readonly step_type: "days" | "hours" | "minutes";
  readonly step: number;
  readonly lat: number;
  readonly lng: number;
  readonly tz_str: string;
  readonly is_dst: boolean;
  readonly zodiac_type: ZodiacType;
  readonly sidereal_mode: SiderealMode | null;
  readonly houses_system_identifier: HousesSystemIdentifier;
  readonly perspective_type: PerspectiveType;
  readonly max_days: number | null;
  readonly max_hours: number | null;
  readonly max_minutes: number | null;
  readonly custom_ayanamsa_t0: number | null;
  readonly custom_ayanamsa_ayan_t0: number | null;
  readonly dates_list: Temporal.PlainDateTime[];

  constructor(options: EphemerisDataFactoryOptions) {
    this.start_datetime = toPlainDateTime(options.start_datetime);
    this.end_datetime = toPlainDateTime(options.end_datetime);
    this.step_type = options.step_type ?? "days";
    this.step = options.step ?? 1;
    this.lat = options.lat ?? 51.4769;
    this.lng = options.lng ?? 0.0005;
    this.tz_str = options.tz_str ?? "Etc/UTC";
    this.is_dst = options.is_dst ?? false;
    this.zodiac_type = normalizeZodiacType(options.zodiac_type ?? "Tropical");
    this.sidereal_mode = options.sidereal_mode ?? null;
    this.houses_system_identifier = options.houses_system_identifier ?? "P";
    this.perspective_type = options.perspective_type ?? "Apparent Geocentric";
    this.max_days = options.max_days ?? 730;
    this.max_hours = options.max_hours ?? 8760;
    this.max_minutes = options.max_minutes ?? 525600;
    this.custom_ayanamsa_t0 = options.custom_ayanamsa_t0 ?? null;
    this.custom_ayanamsa_ayan_t0 = options.custom_ayanamsa_ayan_t0 ?? null;

    if (!["days", "hours", "minutes"].includes(this.step_type)) {
      throw new Error(`Invalid step type: ${this.step_type}`);
    }

    const dates: Temporal.PlainDateTime[] = [];
    for (
      let current = this.start_datetime;
      Temporal.PlainDateTime.compare(current, this.end_datetime) <= 0;
      current = addStep(current, this.step_type, this.step)
    ) {
      dates.push(current);
    }

    if (dates.length === 0) {
      throw new Error("No dates found. Check the date range and step values.");
    }

    if (this.step_type === "days" && this.max_days && dates.length > this.max_days) {
      throw new Error(
        `Too many days: ${dates.length} > ${this.max_days}. To prevent this error, set max_days to a higher value or reduce the date range.`,
      );
    }
    if (this.step_type === "hours" && this.max_hours && dates.length > this.max_hours) {
      throw new Error(
        `Too many hours: ${dates.length} > ${this.max_hours}. To prevent this error, set max_hours to a higher value or reduce the date range.`,
      );
    }
    if (this.step_type === "minutes" && this.max_minutes && dates.length > this.max_minutes) {
      throw new Error(
        `Too many minutes: ${dates.length} > ${this.max_minutes}. To prevent this error, set max_minutes to a higher value or reduce the date range.`,
      );
    }

    if (dates.length > 1000) {
      console.warn(`Large number of dates: ${dates.length}. The calculation may take a while.`);
    }

    this.dates_list = dates;
  }

  async getEphemerisData(as_model = false): Promise<Array<EphemerisDictModel | { date: string; planets: AstrologicalSubjectModel["active_points"] extends never ? never[] : ReturnType<typeof getAvailableAstrologicalPointsList>; houses: ReturnType<typeof getHousesList> }>> {
    const ephemerisDataList: Array<{ date: string; planets: ReturnType<typeof getAvailableAstrologicalPointsList>; houses: ReturnType<typeof getHousesList> }> = [];

    for (const date of this.dates_list) {
      const subject = await AstrologicalSubjectFactory.fromBirthData({
        year: date.year,
        month: date.month,
        day: date.day,
        hour: date.hour,
        minute: date.minute,
        lng: this.lng,
        lat: this.lat,
        tz_str: this.tz_str,
        city: "Placeholder",
        nation: "Placeholder",
        online: false,
        zodiac_type: this.zodiac_type,
        sidereal_mode: this.sidereal_mode,
        houses_system_identifier: this.houses_system_identifier,
        perspective_type: this.perspective_type,
        is_dst: this.is_dst,
        custom_ayanamsa_t0: this.custom_ayanamsa_t0,
        custom_ayanamsa_ayan_t0: this.custom_ayanamsa_ayan_t0,
      });

      ephemerisDataList.push({
        date: date.toString(),
        planets: getAvailableAstrologicalPointsList(subject),
        houses: getHousesList(subject),
      });
    }

    if (as_model) {
      return ephemerisDataList.map(item => ({
        date: item.date,
        planets: item.planets,
        houses: item.houses,
      }));
    }

    return ephemerisDataList;
  }

  async getEphemerisDataAsAstrologicalSubjects(_as_model = false): Promise<AstrologicalSubjectModel[]> {
    const subjects: AstrologicalSubjectModel[] = [];

    for (const date of this.dates_list) {
      subjects.push(
        await AstrologicalSubjectFactory.fromBirthData({
          year: date.year,
          month: date.month,
          day: date.day,
          hour: date.hour,
          minute: date.minute,
          lng: this.lng,
          lat: this.lat,
          tz_str: this.tz_str,
          city: "Placeholder",
          nation: "Placeholder",
          online: false,
          zodiac_type: this.zodiac_type,
          sidereal_mode: this.sidereal_mode,
          houses_system_identifier: this.houses_system_identifier,
          perspective_type: this.perspective_type,
          is_dst: this.is_dst,
          custom_ayanamsa_t0: this.custom_ayanamsa_t0,
          custom_ayanamsa_ayan_t0: this.custom_ayanamsa_ayan_t0,
        }),
      );
    }

    return subjects;
  }
}

const ephemerisDataFactoryCompat = EphemerisDataFactory.prototype as EphemerisDataFactory & {
  get_ephemeris_data: typeof EphemerisDataFactory.prototype.getEphemerisData;
  get_ephemeris_data_as_astrological_subjects: typeof EphemerisDataFactory.prototype.getEphemerisDataAsAstrologicalSubjects;
};

ephemerisDataFactoryCompat.get_ephemeris_data = EphemerisDataFactory.prototype.getEphemerisData;
ephemerisDataFactoryCompat.get_ephemeris_data_as_astrological_subjects
  = EphemerisDataFactory.prototype.getEphemerisDataAsAstrologicalSubjects;

export interface EphemerisDataFactory {
  get_ephemeris_data: typeof EphemerisDataFactory.prototype.getEphemerisData;
  get_ephemeris_data_as_astrological_subjects: typeof EphemerisDataFactory.prototype.getEphemerisDataAsAstrologicalSubjects;
}
