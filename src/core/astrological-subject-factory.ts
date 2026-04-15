import type {
  AstrologicalPoint,
  HousesSystemIdentifier,
  PerspectiveType,
  PointType,
  SiderealMode,
  ZodiacType,
} from "./schemas/literals";
import type { AstrologicalSubjectModel, KerykeionPointModel } from "./schemas/models";
import { Temporal } from "@js-temporal/polyfill";
import { FetchGeonames } from "./fetch-geonames";
import { readEnv } from "./runtime";
import { KerykeionException } from "./schemas/kerykeion-exception";
import { DEFAULT_ACTIVE_POINTS } from "./settings/config-constants";
import { getSweph } from "./sweph";
import { calculateMoonPhase, checkAndAdjustPolarLatitude, datetimeToJulian, getKerykeionPointFromDegree, getPlanetHouse, normalizeZodiacType } from "./utilities";

const DEFAULT_GEONAMES_USERNAME = "century.boy";
const GEONAMES_USERNAME_ENV_VAR = "KERYKEION_GEONAMES_USERNAME";
const DEFAULT_SIDEREAL_MODE: SiderealMode = "FAGAN_BRADLEY";
const DEFAULT_HOUSES_SYSTEM_IDENTIFIER: HousesSystemIdentifier = "P";
const DEFAULT_ZODIAC_TYPE: ZodiacType = "Tropical";
const DEFAULT_PERSPECTIVE_TYPE: PerspectiveType = "Apparent Geocentric";
const DEFAULT_GEONAMES_CACHE_EXPIRE_AFTER_DAYS = 30;

const STANDARD_PLANETS = {
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
  Mean_Lilith: 12,
  True_Lilith: 13,
  Earth: 14,
  Chiron: 15,
  Pholus: 16,
  Ceres: 17,
  Pallas: 18,
  Juno: 19,
  Vesta: 20,
} satisfies Partial<Record<AstrologicalPoint, number>>;

const TNO_PLANETS: Partial<Record<AstrologicalPoint, number>> = {
  Eris: 136199,
  Sedna: 90377,
  Haumea: 136108,
  Makemake: 136472,
  Ixion: 28978,
  Orcus: 90482,
  Quaoar: 50000,
};

const FIXED_STARS: AstrologicalPoint[] = [
  "Regulus",
  "Spica",
  "Aldebaran",
  "Antares",
  "Sirius",
  "Fomalhaut",
  "Algol",
  "Betelgeuse",
  "Canopus",
  "Procyon",
  "Arcturus",
  "Pollux",
  "Deneb",
  "Altair",
  "Rigel",
  "Achernar",
  "Capella",
  "Vega",
  "Alcyone",
  "Alphecca",
  "Algorab",
  "Deneb_Algedi",
  "Alkaid",
];

const FIXED_STAR_SWE_NAMES: Partial<Record<AstrologicalPoint, string>> = {
  Deneb_Algedi: "Deneb Algedi",
};

const ARABIC_PARTS_CONFIG = {
  Pars_Fortunae: {
    required: ["Ascendant", "Sun", "Moon"] as AstrologicalPoint[],
    dayFormula: (asc: number, sun: number, moon: number): number => asc + moon - sun,
    nightFormula: (asc: number, sun: number, moon: number): number => asc + sun - moon,
  },
  Pars_Spiritus: {
    required: ["Ascendant", "Sun", "Moon"] as AstrologicalPoint[],
    dayFormula: (asc: number, sun: number, moon: number): number => asc + sun - moon,
    nightFormula: (asc: number, sun: number, moon: number): number => asc + moon - sun,
  },
  Pars_Amoris: {
    required: ["Ascendant", "Venus", "Sun"] as AstrologicalPoint[],
    formula: (asc: number, venus: number, sun: number): number => asc + venus - sun,
  },
  Pars_Fidei: {
    required: ["Ascendant", "Jupiter", "Saturn"] as AstrologicalPoint[],
    formula: (asc: number, jupiter: number, saturn: number): number => asc + jupiter - saturn,
  },
} satisfies Partial<Record<AstrologicalPoint, unknown>>;

type CalculationData = Record<string, any>;

function getGeonamesUsername(): string {
  return readEnv(GEONAMES_USERNAME_ENV_VAR) ?? DEFAULT_GEONAMES_USERNAME;
}

function getSiderealModeConstant(mode: SiderealMode): number {
  const sweph = getSweph();
  const key = `SE_SIDM_${mode}`;
  const value = (sweph.constants as unknown as Record<string, unknown>)[key];
  if (typeof value !== "number") {
    throw new KerykeionException(`Unknown sidereal mode constant: ${mode}`);
  }
  return value;
}

function withEphemerisContext<T>(
  config: ChartConfiguration,
  lng: number,
  lat: number,
  alt: number | null | undefined,
  callback: (iflag: number) => T,
): T {
  const sweph = getSweph();

  let iflag = sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED;
  let topoUsed = false;

  if (config.perspective_type === "True Geocentric") {
    iflag |= sweph.constants.SEFLG_TRUEPOS;
  }
  else if (config.perspective_type === "Heliocentric") {
    iflag |= sweph.constants.SEFLG_HELCTR;
  }
  else if (config.perspective_type === "Topocentric") {
    iflag |= sweph.constants.SEFLG_TOPOCTR;
    sweph.set_topo(lng, lat, alt ?? 0);
    topoUsed = true;
  }

  if (config.zodiac_type === "Sidereal") {
    iflag |= sweph.constants.SEFLG_SIDEREAL;
    if (config.sidereal_mode === "USER") {
      sweph.set_sid_mode(sweph.constants.SE_SIDM_USER, config.custom_ayanamsa_t0!, config.custom_ayanamsa_ayan_t0!);
    }
    else {
      sweph.set_sid_mode(getSiderealModeConstant(config.sidereal_mode!), 0, 0);
    }
  }

  try {
    return callback(iflag);
  }
  finally {
    if (topoUsed) {
      sweph.set_topo(0, 0, 0);
    }
    sweph.close();
  }
}

class ChartConfiguration {
  zodiac_type: ZodiacType;
  sidereal_mode: SiderealMode | null;
  houses_system_identifier: HousesSystemIdentifier;
  perspective_type: PerspectiveType;
  custom_ayanamsa_t0: number | null;
  custom_ayanamsa_ayan_t0: number | null;

  constructor(input: {
    zodiac_type?: ZodiacType;
    sidereal_mode?: SiderealMode | null;
    houses_system_identifier?: HousesSystemIdentifier;
    perspective_type?: PerspectiveType;
    custom_ayanamsa_t0?: number | null;
    custom_ayanamsa_ayan_t0?: number | null;
  }) {
    this.zodiac_type = input.zodiac_type ?? DEFAULT_ZODIAC_TYPE;
    this.sidereal_mode = input.sidereal_mode ?? null;
    this.houses_system_identifier = input.houses_system_identifier ?? DEFAULT_HOUSES_SYSTEM_IDENTIFIER;
    this.perspective_type = input.perspective_type ?? DEFAULT_PERSPECTIVE_TYPE;
    this.custom_ayanamsa_t0 = input.custom_ayanamsa_t0 ?? null;
    this.custom_ayanamsa_ayan_t0 = input.custom_ayanamsa_ayan_t0 ?? null;
    this.validate();
  }

  validate(): void {
    try {
      this.zodiac_type = normalizeZodiacType(this.zodiac_type);
    }
    catch (error) {
      throw new KerykeionException((error as Error).message);
    }

    if (this.sidereal_mode && this.zodiac_type === "Tropical") {
      throw new KerykeionException("You can't set a sidereal mode with a Tropical zodiac type!");
    }

    if (this.zodiac_type === "Sidereal") {
      if (!this.sidereal_mode) {
        this.sidereal_mode = DEFAULT_SIDEREAL_MODE;
      }
      if (this.sidereal_mode === "USER" && (this.custom_ayanamsa_t0 == null || this.custom_ayanamsa_ayan_t0 == null)) {
        throw new KerykeionException(
          "Sidereal mode 'USER' requires both custom_ayanamsa_t0 (reference epoch as Julian Day) and custom_ayanamsa_ayan_t0 (ayanamsa value in degrees at t0) to be set.",
        );
      }
    }
  }
}

class LocationData {
  city: string;
  nation: string;
  lat: number;
  lng: number;
  tz_str: string;
  altitude: number | null;
  city_data: Record<string, string | boolean> = {};

  constructor(input: {
    city?: string;
    nation?: string;
    lat?: number;
    lng?: number;
    tz_str?: string;
    altitude?: number | null;
  }) {
    this.city = input.city ?? "Greenwich";
    this.nation = input.nation ?? "GB";
    this.lat = input.lat ?? 51.5074;
    this.lng = input.lng ?? 0.0;
    this.tz_str = input.tz_str ?? "Etc/GMT";
    this.altitude = input.altitude ?? null;
  }

  async fetchFromGeonames(username: string, cacheExpireAfterDays: number): Promise<void> {
    const geonames = new FetchGeonames(this.city, this.nation, username, cacheExpireAfterDays);
    this.city_data = await geonames.getSerializedData();

    const requiredFields = ["countryCode", "timezonestr", "lat", "lng"] as const;
    const missingFields = requiredFields.filter(field => !(field in this.city_data));
    if (missingFields.length) {
      throw new KerykeionException(
        `Missing data from geonames: ${missingFields.join(", ")}. Check your connection or try a different location.`,
      );
    }

    this.nation = String(this.city_data.countryCode);
    this.lng = Number(this.city_data.lng);
    this.lat = Number(this.city_data.lat);
    this.tz_str = String(this.city_data.timezonestr);
  }

  prepareForCalculation(): void {
    this.lat = checkAndAdjustPolarLatitude(this.lat);
  }
}

export class AstrologicalSubjectFactory {
  static async fromBirthData(params: {
    name?: string;
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    city?: string | null;
    nation?: string | null;
    lng?: number | null;
    lat?: number | null;
    tz_str?: string | null;
    geonames_username?: string | null;
    online?: boolean;
    zodiac_type?: ZodiacType;
    sidereal_mode?: SiderealMode | null;
    houses_system_identifier?: HousesSystemIdentifier;
    perspective_type?: PerspectiveType;
    cache_expire_after_days?: number;
    is_dst?: boolean | null;
    altitude?: number | null;
    active_points?: AstrologicalPoint[] | null;
    calculate_lunar_phase?: boolean;
    custom_ayanamsa_t0?: number | null;
    custom_ayanamsa_ayan_t0?: number | null;
    seconds?: number;
    suppress_geonames_warning?: boolean;
  } = {}): Promise<AstrologicalSubjectModel> {
    const now = new Date();
    const year = params.year ?? now.getFullYear();
    const month = params.month ?? now.getMonth() + 1;
    const day = params.day ?? now.getDate();
    const hour = params.hour ?? now.getHours();
    const minute = params.minute ?? now.getMinutes();
    const seconds = params.seconds ?? 0;
    const calcData: CalculationData = {
      name: params.name ?? "Now",
    };

    const activePoints = params.active_points ? [...params.active_points] : [...DEFAULT_ACTIVE_POINTS];
    calcData.active_points = activePoints;

    const config = new ChartConfiguration({
      zodiac_type: params.zodiac_type ?? DEFAULT_ZODIAC_TYPE,
      sidereal_mode: params.sidereal_mode ?? null,
      houses_system_identifier: params.houses_system_identifier ?? DEFAULT_HOUSES_SYSTEM_IDENTIFIER,
      perspective_type: params.perspective_type ?? DEFAULT_PERSPECTIVE_TYPE,
      custom_ayanamsa_t0: params.custom_ayanamsa_t0 ?? null,
      custom_ayanamsa_ayan_t0: params.custom_ayanamsa_ayan_t0 ?? null,
    });

    Object.assign(calcData, {
      zodiac_type: config.zodiac_type,
      sidereal_mode: config.sidereal_mode,
      houses_system_identifier: config.houses_system_identifier,
      perspective_type: config.perspective_type,
      _custom_ayanamsa_t0: config.custom_ayanamsa_t0,
      _custom_ayanamsa_ayan_t0: config.custom_ayanamsa_ayan_t0,
    });

    let geonamesUsername = params.geonames_username ?? null;
    const online = params.online ?? true;
    if (geonamesUsername == null && online && (!params.lat || !params.lng || !params.tz_str)) {
      geonamesUsername = getGeonamesUsername();
    }

    const location = new LocationData({
      city: params.city ?? "Greenwich",
      nation: params.nation ?? "GB",
      lat: params.lat ?? 51.5074,
      lng: params.lng ?? 0.0,
      tz_str: params.tz_str ?? "Etc/GMT",
      altitude: params.altitude ?? null,
    });

    if (!online && (!params.tz_str || params.lat == null || params.lng == null)) {
      throw new KerykeionException("For offline mode, you must provide timezone (tz_str) and coordinates (lat, lng)");
    }

    if (online && (!params.tz_str || params.lat == null || params.lng == null)) {
      await location.fetchFromGeonames(geonamesUsername ?? getGeonamesUsername(), params.cache_expire_after_days ?? DEFAULT_GEONAMES_CACHE_EXPIRE_AFTER_DAYS);
    }

    location.prepareForCalculation();
    Object.assign(calcData, {
      city: location.city,
      nation: location.nation,
      lat: location.lat,
      lng: location.lng,
      tz_str: location.tz_str,
      altitude: location.altitude,
      year,
      month,
      day,
      hour,
      minute,
      seconds,
      is_dst: params.is_dst ?? null,
    });

    this.calculateTimeConversions(calcData, location);

    withEphemerisContext(config, calcData.lng, calcData.lat, calcData.altitude, (iflag) => {
      const sweph = getSweph();
      calcData._iflag = iflag;
      calcData.houses_system_name = sweph.house_name(calcData.houses_system_identifier);
      const calculatedAxialCusps = this.calculateHouses(calcData, activePoints);
      calcData.is_diurnal = this.computeIsDiurnal(calcData.julian_day, calcData.lat, calcData.lng, calcData.altitude ?? 0);
      this.calculatePlanets(calcData, activePoints, calculatedAxialCusps);

      if (config.zodiac_type === "Sidereal") {
        const ayanamsaResult = sweph.get_ayanamsa_ex_ut(calcData.julian_day, iflag);
        calcData.ayanamsa_value = ayanamsaResult.data;
      }
      else {
        calcData.ayanamsa_value = null;
      }
    });

    this.calculateDayOfWeek(calcData);

    if ((params.calculate_lunar_phase ?? true) && calcData.moon && calcData.sun) {
      calcData.lunar_phase = calculateMoonPhase(calcData.moon.abs_pos, calcData.sun.abs_pos);
    }
    else {
      calcData.lunar_phase = null;
    }

    return calcData as AstrologicalSubjectModel;
  }

  static async fromIsoUtcTime(params: {
    name: string;
    iso_utc_time: string;
    city?: string;
    nation?: string;
    tz_str?: string;
    online?: boolean;
    lng?: number;
    lat?: number;
    geonames_username?: string;
    zodiac_type?: ZodiacType;
    sidereal_mode?: SiderealMode | null;
    houses_system_identifier?: HousesSystemIdentifier;
    perspective_type?: PerspectiveType;
    altitude?: number | null;
    active_points?: AstrologicalPoint[] | null;
    calculate_lunar_phase?: boolean;
    suppress_geonames_warning?: boolean;
    custom_ayanamsa_t0?: number | null;
    custom_ayanamsa_ayan_t0?: number | null;
  }): Promise<AstrologicalSubjectModel> {
    const instant = Temporal.Instant.from(params.iso_utc_time.replace("Z", "+00:00"));

    let lng = params.lng ?? 0.0;
    let lat = params.lat ?? 51.5074;
    if (params.online ?? true) {
      const geonames = new FetchGeonames(params.city ?? "Greenwich", params.nation ?? "GB", params.geonames_username ?? getGeonamesUsername());
      const cityData = await geonames.getSerializedData();
      lng = Number(cityData.lng);
      lat = Number(cityData.lat);
    }

    const tz = params.tz_str ?? "Etc/GMT";
    const localDatetime = instant.toZonedDateTimeISO(tz);
    return this.fromBirthData({
      name: params.name,
      year: localDatetime.year,
      month: localDatetime.month,
      day: localDatetime.day,
      hour: localDatetime.hour,
      minute: localDatetime.minute,
      seconds: localDatetime.second,
      city: params.city ?? "Greenwich",
      nation: params.nation ?? "GB",
      lng,
      lat,
      tz_str: tz,
      online: false,
      geonames_username: params.geonames_username,
      zodiac_type: params.zodiac_type,
      sidereal_mode: params.sidereal_mode,
      houses_system_identifier: params.houses_system_identifier,
      perspective_type: params.perspective_type,
      altitude: params.altitude ?? null,
      active_points: params.active_points,
      calculate_lunar_phase: params.calculate_lunar_phase,
      suppress_geonames_warning: params.suppress_geonames_warning,
      custom_ayanamsa_t0: params.custom_ayanamsa_t0,
      custom_ayanamsa_ayan_t0: params.custom_ayanamsa_ayan_t0,
    });
  }

  static async fromCurrentTime(params: {
    name?: string;
    city?: string | null;
    nation?: string | null;
    lng?: number | null;
    lat?: number | null;
    tz_str?: string | null;
    geonames_username?: string | null;
    online?: boolean;
    zodiac_type?: ZodiacType;
    sidereal_mode?: SiderealMode | null;
    houses_system_identifier?: HousesSystemIdentifier;
    perspective_type?: PerspectiveType;
    active_points?: AstrologicalPoint[] | null;
    calculate_lunar_phase?: boolean;
    suppress_geonames_warning?: boolean;
    custom_ayanamsa_t0?: number | null;
    custom_ayanamsa_ayan_t0?: number | null;
  } = {}): Promise<AstrologicalSubjectModel> {
    const now = new Date();
    return this.fromBirthData({
      ...params,
      name: params.name ?? "Now",
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      seconds: now.getSeconds(),
    });
  }

  private static calculateTimeConversions(data: CalculationData, location: LocationData): void {
    const plainDateTime = new Temporal.PlainDateTime(
      data.year,
      data.month,
      data.day,
      data.hour,
      data.minute,
      data.seconds,
    );
    const fields = {
      timeZone: location.tz_str,
      year: plainDateTime.year,
      month: plainDateTime.month,
      day: plainDateTime.day,
      hour: plainDateTime.hour,
      minute: plainDateTime.minute,
      second: plainDateTime.second,
    };

    const earlier = Temporal.ZonedDateTime.from(fields, { disambiguation: "earlier" });
    const later = Temporal.ZonedDateTime.from(fields, { disambiguation: "later" });

    const matchesRequestedWallTime = (value: Temporal.ZonedDateTime): boolean =>
      value.year === plainDateTime.year
      && value.month === plainDateTime.month
      && value.day === plainDateTime.day
      && value.hour === plainDateTime.hour
      && value.minute === plainDateTime.minute
      && value.second === plainDateTime.second;

    const isAmbiguous
      = earlier.epochNanoseconds !== later.epochNanoseconds
        && matchesRequestedWallTime(earlier)
        && matchesRequestedWallTime(later);
    const isNonExistent = !matchesRequestedWallTime(earlier) && !matchesRequestedWallTime(later);

    if (isNonExistent) {
      throw new KerykeionException(
        "Non-existent time error! The time does not exist due to DST transition (spring forward). Please specify a valid time.",
      );
    }
    if (isAmbiguous && data.is_dst == null) {
      throw new KerykeionException(
        "Ambiguous time error! The time falls during a DST transition. Please specify is_dst=True or is_dst=False to clarify.",
      );
    }

    const resolved = isAmbiguous ? (data.is_dst ? earlier : later) : earlier;
    const instant = resolved.toInstant();

    const localDatetime = instant.toZonedDateTimeISO(location.tz_str);
    const utcDatetime = instant.toZonedDateTimeISO("UTC");
    data.iso_formatted_utc_datetime = utcDatetime.toString({ timeZoneName: "never" });
    data.iso_formatted_local_datetime = localDatetime.toString({ timeZoneName: "never" });
    data.julian_day = datetimeToJulian(new Date(instant.epochMilliseconds));
  }

  private static calculateHouses(data: CalculationData, activePoints: AstrologicalPoint[]): AstrologicalPoint[] {
    const sweph = getSweph();
    const shouldCalculate = (point: AstrologicalPoint): boolean => !activePoints.length || activePoints.includes(point);
    const calculatedAxialCusps: AstrologicalPoint[] = [];
    const housesResult = sweph.houses_ex2(
      data.julian_day,
      data._iflag,
      data.lat,
      data.lng,
      data.houses_system_identifier,
    );
    const cusps = housesResult.data.houses;
    const ascmc = housesResult.data.points;
    const cuspsSpeed = housesResult.data.housesSpeed;
    const ascmcSpeed = housesResult.data.pointsSpeed;
    data._houses_degree_ut = cusps;

    const houseConfig = [
      ["first_house", "First_House"],
      ["second_house", "Second_House"],
      ["third_house", "Third_House"],
      ["fourth_house", "Fourth_House"],
      ["fifth_house", "Fifth_House"],
      ["sixth_house", "Sixth_House"],
      ["seventh_house", "Seventh_House"],
      ["eighth_house", "Eighth_House"],
      ["ninth_house", "Ninth_House"],
      ["tenth_house", "Tenth_House"],
      ["eleventh_house", "Eleventh_House"],
      ["twelfth_house", "Twelfth_House"],
    ] as const;

    for (const [index, [attrName, houseName]] of houseConfig.entries()) {
      data[attrName] = getKerykeionPointFromDegree(cusps[index]!, houseName, "House", cuspsSpeed[index] ?? null);
    }
    data.houses_names_list = [
      "First_House",
      "Second_House",
      "Third_House",
      "Fourth_House",
      "Fifth_House",
      "Sixth_House",
      "Seventh_House",
      "Eighth_House",
      "Ninth_House",
      "Tenth_House",
      "Eleventh_House",
      "Twelfth_House",
    ];

    if (shouldCalculate("Ascendant")) {
      data.ascendant = getKerykeionPointFromDegree(ascmc[0], "Ascendant", "AstrologicalPoint", ascmcSpeed[0] ?? null);
      data.ascendant.house = getPlanetHouse(data.ascendant.abs_pos, data._houses_degree_ut);
      data.ascendant.retrograde = false;
      calculatedAxialCusps.push("Ascendant");
    }

    if (shouldCalculate("Medium_Coeli")) {
      data.medium_coeli = getKerykeionPointFromDegree(
        ascmc[1],
        "Medium_Coeli",
        "AstrologicalPoint",
        ascmcSpeed[1] ?? null,
      );
      data.medium_coeli.house = getPlanetHouse(data.medium_coeli.abs_pos, data._houses_degree_ut);
      data.medium_coeli.retrograde = false;
      calculatedAxialCusps.push("Medium_Coeli");
    }

    if (shouldCalculate("Descendant")) {
      const dscDeg = ((ascmc[0] + 180) % 360 + 360) % 360;
      data.descendant = getKerykeionPointFromDegree(dscDeg, "Descendant", "AstrologicalPoint", ascmcSpeed[0] ?? null);
      data.descendant.house = getPlanetHouse(data.descendant.abs_pos, data._houses_degree_ut);
      data.descendant.retrograde = false;
      calculatedAxialCusps.push("Descendant");
    }

    if (shouldCalculate("Imum_Coeli")) {
      const icDeg = ((ascmc[1] + 180) % 360 + 360) % 360;
      data.imum_coeli = getKerykeionPointFromDegree(icDeg, "Imum_Coeli", "AstrologicalPoint", ascmcSpeed[1] ?? null);
      data.imum_coeli.house = getPlanetHouse(data.imum_coeli.abs_pos, data._houses_degree_ut);
      data.imum_coeli.retrograde = false;
      calculatedAxialCusps.push("Imum_Coeli");
    }

    return calculatedAxialCusps;
  }

  private static calculateSinglePlanet(
    data: CalculationData,
    planetName: AstrologicalPoint,
    planetId: number,
    julianDay: number,
    iflag: number,
    housesDegreeUt: number[],
    pointType: PointType,
    calculatedPlanets: AstrologicalPoint[],
    activePoints: AstrologicalPoint[],
  ): void {
    const sweph = getSweph();
    try {
      const planetCalc = sweph.calc_ut(julianDay, planetId, iflag);
      const planetEq = sweph.calc_ut(julianDay, planetId, iflag | sweph.constants.SEFLG_EQUATORIAL);
      const point = getKerykeionPointFromDegree(
        planetCalc.data[0],
        planetName,
        pointType,
        planetCalc.data[3] ?? null,
        planetEq.data[1] ?? null,
      );
      point.house = getPlanetHouse(planetCalc.data[0], housesDegreeUt);
      point.retrograde = (planetCalc.data[3] ?? 0) < 0;
      data[planetName.toLowerCase()] = point;
      calculatedPlanets.push(planetName);
    }
    catch {
      const index = activePoints.indexOf(planetName);
      if (index >= 0) {
        activePoints.splice(index, 1);
      }
    }
  }

  private static ensurePointCalculated(
    point: AstrologicalPoint,
    data: CalculationData,
    julianDay: number,
    iflag: number,
    housesDegreeUt: number[],
    pointType: PointType,
    _activePoints: AstrologicalPoint[],
  ): void {
    const pointKey = point.toLowerCase();
    if (pointKey in data) {
      return;
    }
    const sweph = getSweph();
    if (point === "Ascendant") {
      const housesResult = sweph.houses_ex2(julianDay, iflag, data.lat, data.lng, data.houses_system_identifier);
      data.ascendant = getKerykeionPointFromDegree(
        housesResult.data.points[0],
        "Ascendant",
        pointType,
        housesResult.data.pointsSpeed[0] ?? null,
      );
      data.ascendant.house = getPlanetHouse(data.ascendant.abs_pos, housesDegreeUt);
      data.ascendant.retrograde = false;
      return;
    }

    if (point in STANDARD_PLANETS) {
      const planetId = STANDARD_PLANETS[point as keyof typeof STANDARD_PLANETS];
      if (planetId == null) {
        return;
      }
      const planetCalc = sweph.calc_ut(julianDay, planetId, iflag);
      const planetEq = sweph.calc_ut(julianDay, planetId, iflag | sweph.constants.SEFLG_EQUATORIAL);
      data[pointKey] = getKerykeionPointFromDegree(
        planetCalc.data[0],
        point,
        pointType,
        planetCalc.data[3] ?? null,
        planetEq.data[1] ?? null,
      );
      data[pointKey].house = getPlanetHouse(planetCalc.data[0], housesDegreeUt);
      data[pointKey].retrograde = (planetCalc.data[3] ?? 0) < 0;
    }
  }

  private static computeIsDiurnal(julianDay: number, lat: number, lng: number, altitude: number): boolean {
    const sweph = getSweph();
    try {
      const sunFlags = sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED;
      const sunCalc = sweph.calc_ut(julianDay, sweph.constants.SE_SUN, sunFlags);
      const azalt = sweph.azalt(
        julianDay,
        sweph.constants.SE_ECL2HOR,
        [lng, lat, altitude || 0],
        0,
        0,
        [sunCalc.data[0], 0, 1],
      );
      return azalt[1] >= 0;
    }
    catch {
      return true;
    }
  }

  private static calculateArabicPart(
    partName: AstrologicalPoint,
    config: {
      required: AstrologicalPoint[];
      formula?: (...values: number[]) => number;
      dayFormula?: (...values: number[]) => number;
      nightFormula?: (...values: number[]) => number;
    },
    data: CalculationData,
    julianDay: number,
    iflag: number,
    housesDegreeUt: number[],
    pointType: PointType,
    activePoints: AstrologicalPoint[],
    calculatedPlanets: AstrologicalPoint[],
  ): void {
    const requiredPoints = config.required;
    const missingPoints = requiredPoints.filter(point => !activePoints.includes(point));
    if (missingPoints.length) {
      activePoints.push(...missingPoints);
    }

    for (const point of requiredPoints) {
      this.ensurePointCalculated(point, data, julianDay, iflag, housesDegreeUt, pointType, activePoints);
    }

    const requiredKeys = requiredPoints.map(point => point.toLowerCase());
    if (!requiredKeys.every(key => key in data)) {
      return;
    }

    const positions = requiredPoints.map(point => data[point.toLowerCase()].abs_pos as number);
    const isDiurnal = data.is_diurnal ?? true;
    const formula
      = config.dayFormula && config.nightFormula
        ? isDiurnal
          ? config.dayFormula
          : config.nightFormula
        : config.formula;
    if (!formula) {
      return;
    }

    let partDeg = formula(...positions) % 360;
    if (partDeg < 0) {
      partDeg += 360;
    }
    const partKey = partName.toLowerCase();
    data[partKey] = getKerykeionPointFromDegree(partDeg, partName, pointType);
    data[partKey].house = getPlanetHouse(partDeg, housesDegreeUt);
    data[partKey].retrograde = false;
    calculatedPlanets.push(partName);
  }

  private static calculatePlanets(
    data: CalculationData,
    activePoints: AstrologicalPoint[],
    calculatedAxialCusps: AstrologicalPoint[] = [],
  ): void {
    const sweph = getSweph();
    const shouldCalculate = (point: AstrologicalPoint): boolean => !activePoints.length || activePoints.includes(point);
    const pointType: PointType = "AstrologicalPoint";
    const julianDay = data.julian_day as number;
    const iflag = data._iflag as number;
    const housesDegreeUt = data._houses_degree_ut as number[];
    const calculatedPlanets: AstrologicalPoint[] = [];

    for (const [planetName, planetId] of Object.entries(STANDARD_PLANETS) as Array<
      [keyof typeof STANDARD_PLANETS, number]
    >) {
      if (!shouldCalculate(planetName)) {
        continue;
      }
      this.calculateSinglePlanet(
        data,
        planetName,
        planetId,
        julianDay,
        iflag,
        housesDegreeUt,
        pointType,
        calculatedPlanets,
        activePoints,
      );

      if (planetName === "Mean_North_Lunar_Node" || planetName === "True_North_Lunar_Node") {
        const nodeKey = planetName.toLowerCase();
        if (data[nodeKey]) {
          const southNode: AstrologicalPoint
            = planetName === "Mean_North_Lunar_Node" ? "Mean_South_Lunar_Node" : "True_South_Lunar_Node";
          if (shouldCalculate(southNode)) {
            const northData = data[nodeKey] as KerykeionPointModel;
            const southDeg = ((northData.abs_pos + 180) % 360 + 360) % 360;
            data[southNode.toLowerCase()] = getKerykeionPointFromDegree(
              southDeg,
              southNode,
              pointType,
              northData.speed != null ? -northData.speed : null,
              northData.declination != null ? -northData.declination : null,
            );
            data[southNode.toLowerCase()].house = getPlanetHouse(southDeg, housesDegreeUt);
            data[southNode.toLowerCase()].retrograde = northData.retrograde;
            calculatedPlanets.push(southNode);
          }
        }
      }
    }

    for (const [tnoName, asteroidNumber] of Object.entries(TNO_PLANETS) as Array<[AstrologicalPoint, number]>) {
      if (!shouldCalculate(tnoName) || asteroidNumber == null) {
        continue;
      }
      try {
        this.calculateSinglePlanet(
          data,
          tnoName,
          sweph.constants.SE_AST_OFFSET + asteroidNumber,
          julianDay,
          iflag,
          housesDegreeUt,
          pointType,
          calculatedPlanets,
          activePoints,
        );
      }
      catch {
        const index = activePoints.indexOf(tnoName);
        if (index >= 0) {
          activePoints.splice(index, 1);
        }
      }
    }

    for (const starName of FIXED_STARS) {
      if (!shouldCalculate(starName)) {
        continue;
      }
      try {
        const sweName = FIXED_STAR_SWE_NAMES[starName] ?? starName;
        const ecliptic = sweph.fixstar_ut(sweName, julianDay, iflag);
        const equatorial = sweph.fixstar_ut(sweName, julianDay, iflag | sweph.constants.SEFLG_EQUATORIAL);
        const magnitude = sweph.fixstar2_mag(sweName);
        const point = getKerykeionPointFromDegree(
          ecliptic.data[0],
          starName,
          pointType,
          ecliptic.data[3] ?? 0,
          equatorial.data[1] ?? null,
          magnitude.data ?? null,
        );
        point.house = getPlanetHouse(ecliptic.data[0], housesDegreeUt);
        point.retrograde = false;
        data[starName.toLowerCase()] = point;
        calculatedPlanets.push(starName);
      }
      catch {
        const index = activePoints.indexOf(starName);
        if (index >= 0) {
          activePoints.splice(index, 1);
        }
      }
    }

    for (const [partName, partConfig] of Object.entries(ARABIC_PARTS_CONFIG) as Array<
      [AstrologicalPoint, (typeof ARABIC_PARTS_CONFIG)[keyof typeof ARABIC_PARTS_CONFIG]]
    >) {
      if (shouldCalculate(partName)) {
        this.calculateArabicPart(
          partName,
          partConfig,
          data,
          julianDay,
          iflag,
          housesDegreeUt,
          pointType,
          activePoints,
          calculatedPlanets,
        );
      }
    }

    if (shouldCalculate("Vertex") || shouldCalculate("Anti_Vertex")) {
      try {
        const vertexResult = sweph.houses_ex(julianDay, iflag, data.lat, data.lng, "V");
        const vertexDeg = vertexResult.data.points[3];
        if (shouldCalculate("Vertex")) {
          data.vertex = getKerykeionPointFromDegree(vertexDeg, "Vertex", pointType);
          data.vertex.house = getPlanetHouse(vertexDeg, housesDegreeUt);
          data.vertex.retrograde = false;
          calculatedPlanets.push("Vertex");
        }
        if (shouldCalculate("Anti_Vertex")) {
          const antiVertexDeg = ((vertexDeg + 180) % 360 + 360) % 360;
          data.anti_vertex = getKerykeionPointFromDegree(antiVertexDeg, "Anti_Vertex", pointType);
          data.anti_vertex.house = getPlanetHouse(antiVertexDeg, housesDegreeUt);
          data.anti_vertex.retrograde = false;
          calculatedPlanets.push("Anti_Vertex");
        }
      }
      catch {
        const vertexIndex = activePoints.indexOf("Vertex");
        if (vertexIndex >= 0) {
          activePoints.splice(vertexIndex, 1);
        }
        const antiVertexIndex = activePoints.indexOf("Anti_Vertex");
        if (antiVertexIndex >= 0) {
          activePoints.splice(antiVertexIndex, 1);
        }
      }
    }

    data.active_points = [...calculatedPlanets, ...calculatedAxialCusps];
  }

  private static calculateDayOfWeek(data: CalculationData): void {
    const datePart = String(data.iso_formatted_local_datetime).slice(0, 10);
    const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
    data.day_of_week = weekdayNames[Temporal.PlainDate.from(datePart).dayOfWeek - 1]!;
  }
}

const astrologicalSubjectFactoryCompat = AstrologicalSubjectFactory as typeof AstrologicalSubjectFactory & {
  from_birth_data: typeof AstrologicalSubjectFactory.fromBirthData;
  from_iso_utc_time: typeof AstrologicalSubjectFactory.fromIsoUtcTime;
  from_current_time: typeof AstrologicalSubjectFactory.fromCurrentTime;
};

astrologicalSubjectFactoryCompat.from_birth_data = AstrologicalSubjectFactory.fromBirthData;
astrologicalSubjectFactoryCompat.from_iso_utc_time = AstrologicalSubjectFactory.fromIsoUtcTime;
astrologicalSubjectFactoryCompat.from_current_time = AstrologicalSubjectFactory.fromCurrentTime;

type FromBirthDataAlias = typeof AstrologicalSubjectFactory.fromBirthData;
type FromIsoUtcTimeAlias = typeof AstrologicalSubjectFactory.fromIsoUtcTime;
type FromCurrentTimeAlias = typeof AstrologicalSubjectFactory.fromCurrentTime;

export namespace AstrologicalSubjectFactory {
  export const from_birth_data: FromBirthDataAlias = astrologicalSubjectFactoryCompat.from_birth_data;
  export const from_iso_utc_time: FromIsoUtcTimeAlias = astrologicalSubjectFactoryCompat.from_iso_utc_time;
  export const from_current_time: FromCurrentTimeAlias = astrologicalSubjectFactoryCompat.from_current_time;
}
