import type { ReturnType } from "./schemas/literals";
import type { AstrologicalSubjectModel, PlanetReturnModel } from "./schemas/models";
import { AstrologicalSubjectFactory } from "./astrological-subject-factory";
import { FetchGeonames } from "./fetch-geonames";
import { KerykeionException } from "./schemas/kerykeion-exception";
import { getSweph } from "./sweph";
import { julianToDatetime } from "./utilities";

const DEFAULT_GEONAMES_USERNAME = "century.boy";
const DEFAULT_GEONAMES_CACHE_EXPIRE_AFTER_DAYS = 30;
const GEONAMES_DEFAULT_USERNAME_WARNING
  = "\n********\n"
    + "NO GEONAMES USERNAME SET!\n"
    + "Using the default geonames username is not recommended, please set a custom one!\n"
    + "You can get one for free here:\n"
    + "https://www.geonames.org/login\n"
    + "You can set the username via the KERYKEION_GEONAMES_USERNAME environment variable\n"
    + "or by passing the geonames_username parameter.\n"
    + "Keep in mind that the default username is limited to 2000 requests per hour and is shared with everyone else using this library.\n"
    + "********";

export class PlanetaryReturnFactory {
  private cityData?: Record<string, string | boolean>;
  private readonly geonamesUsername: string | null;
  private city: string | null;
  private nation: string | null;
  private lng: number | null;
  private lat: number | null;
  private tzStr: string | null;

  constructor(
    private readonly subject: AstrologicalSubjectModel,
    params: {
      city?: string | null;
      nation?: string | null;
      lng?: number | null;
      lat?: number | null;
      tz_str?: string | null;
      online?: boolean;
      geonames_username?: string | null;
      cache_expire_after_days?: number;
      altitude?: number | null;
      custom_ayanamsa_t0?: number | null;
      custom_ayanamsa_ayan_t0?: number | null;
    } = {},
  ) {
    this.online = params.online ?? true;
    this.cacheExpireAfterDays = params.cache_expire_after_days ?? DEFAULT_GEONAMES_CACHE_EXPIRE_AFTER_DAYS;
    this.altitude = params.altitude ?? null;
    this.customAyanamsaT0 = params.custom_ayanamsa_t0 ?? null;
    this.customAyanamsaAyanT0 = params.custom_ayanamsa_ayan_t0 ?? null;

    if (subject.sidereal_mode === "USER" && (this.customAyanamsaT0 == null || this.customAyanamsaAyanT0 == null)) {
      throw new KerykeionException(
        "PlanetaryReturnFactory requires both custom_ayanamsa_t0 and custom_ayanamsa_ayan_t0 when sidereal_mode='USER'.",
      );
    }

    if (params.geonames_username == null && this.online && (!params.lat || !params.lng || !params.tz_str)) {
      console.warn(GEONAMES_DEFAULT_USERNAME_WARNING);
      this.geonamesUsername = DEFAULT_GEONAMES_USERNAME;
    }
    else {
      this.geonamesUsername = params.geonames_username ?? null;
    }

    if (!params.city && this.online) {
      throw new KerykeionException("You need to set the city if you want to use the online mode!");
    }
    if (!params.nation && this.online) {
      throw new KerykeionException("You need to set the nation if you want to use the online mode!");
    }
    if (!params.lat && !this.online) {
      throw new KerykeionException("You need to set the coordinates and timezone if you want to use the offline mode!");
    }
    if (!params.lng && !this.online) {
      throw new KerykeionException("You need to set the coordinates and timezone if you want to use the offline mode!");
    }
    if (!this.online && !params.tz_str) {
      throw new KerykeionException("You need to set the coordinates and timezone if you want to use the offline mode!");
    }

    this.city = params.city ?? null;
    this.nation = params.nation ?? null;
    this.lng = params.lng ?? null;
    this.lat = params.lat ?? null;
    this.tzStr = params.tz_str ?? null;
  }

  private readonly online: boolean;
  private readonly cacheExpireAfterDays: number;
  private readonly altitude: number | null;
  private readonly customAyanamsaT0: number | null;
  private readonly customAyanamsaAyanT0: number | null;

  private isoFormattedTimeToJulian(isoFormattedTime: string): number {
    const match = isoFormattedTime
      .trim()
      .match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:Z|[+-]\d{2}:\d{2})?$/,
      );

    if (!match) {
      throw new KerykeionException(`Invalid ISO formatted time: ${isoFormattedTime}`);
    }

    let year = Number(match[1]);
    let month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6] ?? "0");
    const microsecond = Number((match[7] ?? "").padEnd(6, "0").slice(0, 6));

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

    jd += (hour + minute / 60 + second / 3600 + microsecond / 3_600_000_000) / 24;
    return jd;
  }

  private async ensureLocationData(): Promise<void> {
    if (!(this.online && !this.tzStr && !this.lat && !this.lng)) {
      return;
    }
    if (!this.city || !this.nation || !this.geonamesUsername) {
      throw new KerykeionException("You need to set the city and nation if you want to use the online mode!");
    }

    const geonames = new FetchGeonames(
      this.city,
      this.nation,
      this.geonamesUsername,
      this.cacheExpireAfterDays,
    );
    this.cityData = await geonames.getSerializedData();

    const countryCode = this.cityData.countryCode;
    const timezonestr = this.cityData.timezonestr;
    const lat = this.cityData.lat;
    const lng = this.cityData.lng;
    if (
      typeof countryCode !== "string"
      || typeof timezonestr !== "string"
      || typeof lat !== "string"
      || typeof lng !== "string"
    ) {
      throw new KerykeionException("No data found for this city, try again! Maybe check your connection?");
    }

    this.nation = countryCode;
    this.lng = Number(lng);
    this.lat = Number(lat);
    this.tzStr = timezonestr;
  }

  async nextReturnFromIsoFormattedTime(
    isoFormattedTime: string,
    returnType: ReturnType,
  ): Promise<PlanetReturnModel> {
    await this.ensureLocationData();

    const julianDay = this.isoFormattedTimeToJulian(isoFormattedTime);
    const sweph = getSweph();

    let returnJulianDate: number;
    if (returnType === "Solar") {
      if (!this.subject.sun) {
        throw new KerykeionException("Sun position is required for Solar return but is not available in the subject.");
      }
      returnJulianDate = sweph.solcross_ut(
        this.subject.sun.abs_pos,
        julianDay,
        sweph.constants.SEFLG_SWIEPH,
      ).date;
    }
    else if (returnType === "Lunar") {
      if (!this.subject.moon) {
        throw new KerykeionException("Moon position is required for Lunar return but is not available in the subject.");
      }
      returnJulianDate = sweph.mooncross_ut(
        this.subject.moon.abs_pos,
        julianDay,
        sweph.constants.SEFLG_SWIEPH,
      ).date;
    }
    else {
      throw new KerykeionException(`Invalid return type ${returnType}. Use 'Solar' or 'Lunar'.`);
    }

    const returnDateUtc = julianToDatetime(returnJulianDate).toISOString();
    const returnSubject = await AstrologicalSubjectFactory.fromIsoUtcTime({
      name: this.subject.name,
      iso_utc_time: returnDateUtc,
      lng: this.lng!,
      lat: this.lat!,
      tz_str: this.tzStr!,
      city: this.city ?? undefined,
      nation: this.nation ?? undefined,
      online: false,
      altitude: this.altitude ?? undefined,
      active_points: this.subject.active_points,
      zodiac_type: this.subject.zodiac_type,
      sidereal_mode: this.subject.sidereal_mode,
      houses_system_identifier: this.subject.houses_system_identifier,
      perspective_type: this.subject.perspective_type,
      custom_ayanamsa_t0: this.customAyanamsaT0 ?? undefined,
      custom_ayanamsa_ayan_t0: this.customAyanamsaAyanT0 ?? undefined,
    });

    return {
      ...returnSubject,
      name: `${this.subject.name} ${returnType} Return`,
      return_type: returnType,
    };
  }

  async nextReturnFromYear(year: number, returnType: ReturnType): Promise<PlanetReturnModel> {
    return this.nextReturnFromDate(year, 1, 1, { return_type: returnType });
  }

  async nextReturnFromDate(
    year: number,
    month: number,
    day = 1,
    options: { return_type: ReturnType },
  ): Promise<PlanetReturnModel> {
    if (month < 1 || month > 12) {
      throw new KerykeionException(`Invalid month ${month}. Month must be between 1 and 12.`);
    }

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > daysInMonth) {
      throw new KerykeionException(
        `Invalid day ${day} for ${year}-${String(month).padStart(2, "0")}. Day must be between 1 and ${daysInMonth}.`,
      );
    }

    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    return this.nextReturnFromIsoFormattedTime(startDate.toISOString(), options.return_type);
  }

  async nextReturnFromMonthAndYear(
    year: number,
    month: number,
    returnType: ReturnType,
  ): Promise<PlanetReturnModel> {
    return this.nextReturnFromDate(year, month, 1, { return_type: returnType });
  }
}

const planetaryReturnFactoryCompat = PlanetaryReturnFactory.prototype as PlanetaryReturnFactory & {
  next_return_from_iso_formatted_time: typeof PlanetaryReturnFactory.prototype.nextReturnFromIsoFormattedTime;
  next_return_from_year: typeof PlanetaryReturnFactory.prototype.nextReturnFromYear;
  next_return_from_date: typeof PlanetaryReturnFactory.prototype.nextReturnFromDate;
  next_return_from_month_and_year: typeof PlanetaryReturnFactory.prototype.nextReturnFromMonthAndYear;
};

planetaryReturnFactoryCompat.next_return_from_iso_formatted_time
  = PlanetaryReturnFactory.prototype.nextReturnFromIsoFormattedTime;
planetaryReturnFactoryCompat.next_return_from_year = PlanetaryReturnFactory.prototype.nextReturnFromYear;
planetaryReturnFactoryCompat.next_return_from_date = PlanetaryReturnFactory.prototype.nextReturnFromDate;
planetaryReturnFactoryCompat.next_return_from_month_and_year
  = PlanetaryReturnFactory.prototype.nextReturnFromMonthAndYear;

export interface PlanetaryReturnFactory {
  next_return_from_iso_formatted_time: typeof PlanetaryReturnFactory.prototype.nextReturnFromIsoFormattedTime;
  next_return_from_year: typeof PlanetaryReturnFactory.prototype.nextReturnFromYear;
  next_return_from_date: typeof PlanetaryReturnFactory.prototype.nextReturnFromDate;
  next_return_from_month_and_year: typeof PlanetaryReturnFactory.prototype.nextReturnFromMonthAndYear;
}
