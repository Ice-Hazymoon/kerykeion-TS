import type { AstrologicalPoint, KerykeionChartLanguage, KerykeionChartStyle, KerykeionChartTheme } from "../core/schemas/literals";

import type {
  ActiveAspect,
  AstrologicalSubjectModel,
  ChartDataModel,
  DualChartDataModel,
  MoonPhaseOverviewModel,
  SingleChartDataModel,
} from "../core/schemas/models";
import type {
  BirthChartDataRequestInput,
  BirthChartRequestInput,
  CompositeChartDataRequestInput,
  CompositeChartRequestInput,
  MoonPhaseRequestInput,
  PlanetaryReturnDataRequestInput,
  PlanetaryReturnRequestInput,
  SubjectInput,
  SynastryChartDataRequestInput,
  SynastryChartRequestInput,
  TransitChartDataRequestInput,
  TransitChartRequestInput,
  TransitSubjectInput,
} from "./schemas";
import { Temporal } from "@js-temporal/polyfill";
import { AstrologicalSubjectFactory } from "../core/astrological-subject-factory";
import { ChartDataFactory } from "../core/chart-data-factory";
import { ChartDrawer } from "../core/charts/chart-drawer";
import { CompositeSubjectFactory } from "../core/composite-subject-factory";
import { toContext } from "../core/context-serializer";
import { MoonPhaseDetailsFactory } from "../core/moon-phase-details/factory";
import { PlanetaryReturnFactory } from "../core/planetary-return-factory";
import { KerykeionException } from "../core/schemas/kerykeion-exception";
import { DEFAULT_ACTIVE_ASPECTS, DEFAULT_ACTIVE_POINTS } from "../core/settings/config-constants";

const GEONAMES_ERROR_MESSAGE
  = "City/Nation name error or invalid GeoNames username. Please check your username or city name and try again. You can create a free username here: https://www.geonames.org/login/. If you want to bypass the usage of GeoNames, please remove the geonames_username field from the request. Note: The nation field should be the country code (e.g. US, UK, FR, DE, etc.).";

const GEONAMES_ERROR_KEYWORDS = [
  "No data found for this city",
  "data found for this city",
  "Missing data from geonames",
  "You need to set the coordinates",
  "Check your connection",
];

function normalizeCoordinate(value: number | null | undefined): number | null | undefined {
  if (value == null) {
    return value;
  }
  if (Math.abs(value) < 1e-6) {
    return value >= 0 ? 1e-6 : -1e-6;
  }
  return value;
}

export function dump<T>(value: T): T {
  return JSON.parse(JSON.stringify(serializeForApi(value))) as T;
}

const API_STRIP_KEYS = new Set(["seconds", "is_dst"]);

function serializeForApi(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeForApi(item));
  }

  if (typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (key.startsWith("_") || API_STRIP_KEYS.has(key)) {
      continue;
    }
    result[key] = serializeForApi(entry);
  }

  if ("return_type" in record) {
    delete result.year;
    delete result.month;
    delete result.day;
    delete result.hour;
    delete result.minute;
    delete result.is_diurnal;
  }

  return result;
}

function resolveNation(value: string | null | undefined): string | undefined {
  if (!value || value.toLowerCase() === "null") {
    return undefined;
  }
  return value.toUpperCase();
}

export function resolveActivePoints(points: AstrologicalPoint[] | null | undefined): AstrologicalPoint[] {
  return points?.length ? [...points] : [...DEFAULT_ACTIVE_POINTS];
}

function resolveActiveAspects(aspects: ActiveAspect[] | null | undefined): ActiveAspect[] {
  return aspects?.length ? [...aspects] : DEFAULT_ACTIVE_ASPECTS.map(aspect => ({ ...aspect }));
}

export async function buildSubject(
  subjectRequest: SubjectInput,
  options: { active_points?: AstrologicalPoint[] | null } = {},
): Promise<AstrologicalSubjectModel> {
  const resolvedPoints = resolveActivePoints(options.active_points ?? null);
  const online = Boolean(subjectRequest.geonames_username);

  return AstrologicalSubjectFactory.fromBirthData({
    name: subjectRequest.name,
    year: subjectRequest.year,
    month: subjectRequest.month,
    day: subjectRequest.day,
    hour: subjectRequest.hour,
    minute: subjectRequest.minute,
    seconds: subjectRequest.second ?? 0,
    city: subjectRequest.city,
    nation: resolveNation(subjectRequest.nation) ?? "GB",
    lng:
      subjectRequest.geonames_username && subjectRequest.longitude != null
        ? undefined
        : (subjectRequest.longitude ?? undefined),
    lat:
      subjectRequest.geonames_username && subjectRequest.latitude != null
        ? undefined
        : (subjectRequest.latitude ?? undefined),
    tz_str:
      subjectRequest.geonames_username && subjectRequest.timezone != null
        ? undefined
        : (subjectRequest.timezone ?? undefined),
    geonames_username: subjectRequest.geonames_username ?? undefined,
    online,
    zodiac_type: subjectRequest.zodiac_type,
    sidereal_mode: subjectRequest.sidereal_mode ?? undefined,
    houses_system_identifier: subjectRequest.houses_system_identifier,
    perspective_type: subjectRequest.perspective_type,
    is_dst: subjectRequest.is_dst ?? undefined,
    altitude: subjectRequest.altitude ?? undefined,
    active_points: resolvedPoints,
    suppress_geonames_warning: true,
    custom_ayanamsa_t0: subjectRequest.custom_ayanamsa_t0 ?? undefined,
    custom_ayanamsa_ayan_t0: subjectRequest.custom_ayanamsa_ayan_t0 ?? undefined,
  });
}

async function buildTransitSubject(
  transitRequest: TransitSubjectInput,
  referenceSubject: AstrologicalSubjectModel,
  options: {
    active_points?: AstrologicalPoint[] | null;
    custom_ayanamsa_t0?: number | null;
    custom_ayanamsa_ayan_t0?: number | null;
  } = {},
): Promise<AstrologicalSubjectModel> {
  const resolvedPoints = resolveActivePoints(options.active_points ?? null);
  const online = Boolean(transitRequest.geonames_username);

  return AstrologicalSubjectFactory.fromBirthData({
    name: transitRequest.name ?? "Transit",
    year: transitRequest.year,
    month: transitRequest.month,
    day: transitRequest.day,
    hour: transitRequest.hour,
    minute: transitRequest.minute,
    seconds: transitRequest.second ?? 0,
    city: transitRequest.city,
    nation: resolveNation(transitRequest.nation) ?? referenceSubject.nation,
    lng:
      transitRequest.geonames_username && transitRequest.longitude != null
        ? undefined
        : (transitRequest.longitude ?? undefined),
    lat:
      transitRequest.geonames_username && transitRequest.latitude != null
        ? undefined
        : (transitRequest.latitude ?? undefined),
    tz_str:
      transitRequest.geonames_username && transitRequest.timezone != null
        ? undefined
        : (transitRequest.timezone ?? undefined),
    geonames_username: transitRequest.geonames_username ?? undefined,
    online,
    zodiac_type: referenceSubject.zodiac_type,
    sidereal_mode: referenceSubject.sidereal_mode ?? undefined,
    houses_system_identifier: referenceSubject.houses_system_identifier,
    perspective_type: referenceSubject.perspective_type,
    is_dst: transitRequest.is_dst ?? undefined,
    altitude: transitRequest.altitude ?? undefined,
    active_points: resolvedPoints,
    suppress_geonames_warning: true,
    custom_ayanamsa_t0: options.custom_ayanamsa_t0 ?? undefined,
    custom_ayanamsa_ayan_t0: options.custom_ayanamsa_ayan_t0 ?? undefined,
  });
}

function renderChart(
  chartData: ChartDataModel,
  theme?: KerykeionChartTheme,
  language?: KerykeionChartLanguage,
  split_chart = false,
  transparent_background = false,
  show_house_position_comparison = true,
  show_cusp_position_comparison = true,
  show_degree_indicators = true,
  show_aspect_icons = true,
  custom_title?: string,
  style: KerykeionChartStyle = "classic",
  show_zodiac_background_ring = true,
  double_chart_aspect_grid_type: "list" | "table" = "list",
): { chart?: string; chart_wheel?: string; chart_grid?: string } {
  const drawer = new ChartDrawer(chartData, {
    theme,
    chart_language: language,
    transparent_background,
    show_house_position_comparison,
    show_cusp_position_comparison,
    show_degree_indicators,
    show_aspect_icons,
    custom_title,
    style,
    show_zodiac_background_ring,
    double_chart_aspect_grid_type,
  });

  if (split_chart) {
    return {
      chart_wheel: drawer.generate_wheel_only_svg_string(true, false, {
        style,
        show_zodiac_background_ring,
      }),
      chart_grid: drawer.generate_aspect_grid_only_svg_string(true),
    };
  }

  return {
    chart: drawer.generate_svg_string(true, false, {
      custom_title,
      style,
      show_zodiac_background_ring,
    }),
  };
}

export function chartDataPayload(chartData: ChartDataModel): { status: "OK"; chart_data: ChartDataModel } {
  return {
    status: "OK",
    chart_data: dump(chartData),
  };
}

export function chartPayload(
  chartData: ChartDataModel,
  theme?: KerykeionChartTheme,
  language?: KerykeionChartLanguage,
  split_chart = false,
  transparent_background = false,
  show_house_position_comparison = true,
  show_cusp_position_comparison = true,
  show_degree_indicators = true,
  show_aspect_icons = true,
  custom_title?: string,
  style: KerykeionChartStyle = "classic",
  show_zodiac_background_ring = true,
  double_chart_aspect_grid_type: "list" | "table" = "list",
): Record<string, unknown> {
  return {
    ...chartDataPayload(chartData),
    ...renderChart(
      chartData,
      theme,
      language,
      split_chart,
      transparent_background,
      show_house_position_comparison,
      show_cusp_position_comparison,
      show_degree_indicators,
      show_aspect_icons,
      custom_title,
      style,
      show_zodiac_background_ring,
      double_chart_aspect_grid_type,
    ),
  };
}

export function subjectContextPayload(subject: AstrologicalSubjectModel): Record<string, unknown> {
  return {
    status: "OK",
    subject_context: toContext(subject),
    subject: dump(subject),
  };
}

export function contextPayload(chartData: ChartDataModel): Record<string, unknown> {
  return {
    status: "OK",
    context: toContext(chartData),
    chart_data: dump(chartData),
  };
}

function createErrorPayload(message: string, errorType: string): Record<string, unknown> {
  return {
    status: "ERROR",
    message,
    error_type: errorType,
  };
}

export function buildErrorResponse(error: unknown): { status: number; body: Record<string, unknown> } {
  const message = error instanceof Error ? (error.message.trim() || error.name) : String(error);
  if (GEONAMES_ERROR_KEYWORDS.some(keyword => message.includes(keyword))) {
    return {
      status: 400,
      body: {
        status: "ERROR",
        message: GEONAMES_ERROR_MESSAGE,
      },
    };
  }
  return {
    status: error instanceof KerykeionException ? 400 : 500,
    body: createErrorPayload(message, error instanceof Error ? error.name : "Error"),
  };
}

function buildReturnFactory(
  natalSubject: AstrologicalSubjectModel,
  requestBody: PlanetaryReturnRequestInput | PlanetaryReturnDataRequestInput,
): PlanetaryReturnFactory {
  const location = requestBody.return_location;
  const customAyanamsa: { custom_ayanamsa_t0?: number; custom_ayanamsa_ayan_t0?: number } = {};

  if (requestBody.subject.custom_ayanamsa_t0 != null) {
    customAyanamsa.custom_ayanamsa_t0 = requestBody.subject.custom_ayanamsa_t0;
  }
  if (requestBody.subject.custom_ayanamsa_ayan_t0 != null) {
    customAyanamsa.custom_ayanamsa_ayan_t0 = requestBody.subject.custom_ayanamsa_ayan_t0;
  }

  if (location) {
    const nation = resolveNation(location.nation) ?? natalSubject.nation;
    if (
      location.geonames_username
      || location.latitude == null
      || location.longitude == null
      || location.timezone == null
    ) {
      return new PlanetaryReturnFactory(natalSubject, {
        city: location.city ?? natalSubject.city,
        nation,
        online: true,
        geonames_username: location.geonames_username ?? undefined,
        cache_expire_after_days: 30,
        altitude: location.altitude ?? undefined,
        ...customAyanamsa,
      });
    }

    return new PlanetaryReturnFactory(natalSubject, {
      city: location.city ?? natalSubject.city,
      nation,
      lng: normalizeCoordinate(location.longitude) ?? undefined,
      lat: normalizeCoordinate(location.latitude) ?? undefined,
      tz_str: location.timezone,
      online: false,
      altitude: location.altitude ?? undefined,
      ...customAyanamsa,
    });
  }

  return new PlanetaryReturnFactory(natalSubject, {
    city: natalSubject.city,
    nation: natalSubject.nation,
    lng: normalizeCoordinate(natalSubject.lng) ?? undefined,
    lat: normalizeCoordinate(natalSubject.lat) ?? undefined,
    tz_str: natalSubject.tz_str,
    online: false,
    ...customAyanamsa,
  });
}

export async function calculateReturnChartData(
  requestBody: PlanetaryReturnRequestInput | PlanetaryReturnDataRequestInput,
  returnType: "Solar" | "Lunar",
): Promise<ChartDataModel> {
  const activePoints = resolveActivePoints(requestBody.active_points ?? null);
  const activeAspects = resolveActiveAspects(requestBody.active_aspects ?? null);
  const natalSubject = await buildSubject(requestBody.subject, { active_points: activePoints });
  const returnFactory = buildReturnFactory(natalSubject, requestBody);

  let returnSubject;
  if (requestBody.iso_datetime) {
    returnSubject = await returnFactory.nextReturnFromIsoFormattedTime(requestBody.iso_datetime, returnType);
  }
  else if (requestBody.month) {
    if (requestBody.year == null) {
      throw new KerykeionException("Year must be provided when month is specified.");
    }
    returnSubject = await returnFactory.nextReturnFromDate(
      requestBody.year,
      requestBody.month,
      requestBody.day ?? 1,
      { return_type: returnType },
    );
  }
  else {
    if (requestBody.year == null) {
      throw new KerykeionException("Year must be provided when iso_datetime is not set.");
    }
    returnSubject = await returnFactory.nextReturnFromDate(requestBody.year, 1, 1, { return_type: returnType });
  }

  if (requestBody.wheel_type === "dual") {
    return ChartDataFactory.createReturnChartData(
      natalSubject,
      returnSubject,
      activePoints,
      activeAspects,
      requestBody.include_house_comparison,
      {
        distribution_method: requestBody.distribution_method,
        custom_distribution_weights: requestBody.custom_distribution_weights ?? null,
      },
    );
  }

  return ChartDataFactory.createSingleWheelReturnChartData(
    returnSubject,
    activePoints,
    activeAspects,
    {
      distribution_method: requestBody.distribution_method,
      custom_distribution_weights: requestBody.custom_distribution_weights ?? null,
    },
  );
}

export async function createNatalChartData(
  requestBody: BirthChartRequestInput | BirthChartDataRequestInput,
): Promise<SingleChartDataModel> {
  const activePoints = resolveActivePoints(requestBody.active_points ?? null);
  const activeAspects = resolveActiveAspects(requestBody.active_aspects ?? null);
  const subject = await buildSubject(requestBody.subject, { active_points: activePoints });
  return ChartDataFactory.createNatalChartData(subject, activePoints, activeAspects, {
    distribution_method: requestBody.distribution_method,
    custom_distribution_weights: requestBody.custom_distribution_weights ?? null,
  }) as SingleChartDataModel;
}

export async function createSynastryChartData(
  requestBody: SynastryChartRequestInput | SynastryChartDataRequestInput,
): Promise<DualChartDataModel> {
  const activePoints = resolveActivePoints(requestBody.active_points ?? null);
  const activeAspects = resolveActiveAspects(requestBody.active_aspects ?? null);
  const firstSubject = await buildSubject(requestBody.first_subject, { active_points: activePoints });
  const secondSubject = await buildSubject(requestBody.second_subject, { active_points: activePoints });
  return ChartDataFactory.createSynastryChartData(
    firstSubject,
    secondSubject,
    activePoints,
    activeAspects,
    requestBody.include_house_comparison,
    requestBody.include_relationship_score,
    {
      distribution_method: requestBody.distribution_method,
      custom_distribution_weights: requestBody.custom_distribution_weights ?? null,
    },
  ) as DualChartDataModel;
}

export async function createTransitChartData(
  requestBody: TransitChartRequestInput | TransitChartDataRequestInput,
): Promise<DualChartDataModel> {
  const activePoints = resolveActivePoints(requestBody.active_points ?? null);
  const activeAspects = resolveActiveAspects(requestBody.active_aspects ?? null);
  const natalSubject = await buildSubject(requestBody.first_subject, { active_points: activePoints });
  const transitSubject = await buildTransitSubject(requestBody.transit_subject, natalSubject, {
    active_points: activePoints,
    custom_ayanamsa_t0: requestBody.first_subject.custom_ayanamsa_t0 ?? null,
    custom_ayanamsa_ayan_t0: requestBody.first_subject.custom_ayanamsa_ayan_t0 ?? null,
  });
  return ChartDataFactory.createTransitChartData(
    natalSubject,
    transitSubject,
    activePoints,
    activeAspects,
    requestBody.include_house_comparison,
    {
      distribution_method: requestBody.distribution_method,
      custom_distribution_weights: requestBody.custom_distribution_weights ?? null,
    },
  ) as DualChartDataModel;
}

export async function createCompositeChartData(
  requestBody: CompositeChartRequestInput | CompositeChartDataRequestInput,
): Promise<SingleChartDataModel> {
  const activePoints = resolveActivePoints(requestBody.active_points ?? null);
  const activeAspects = resolveActiveAspects(requestBody.active_aspects ?? null);
  const firstSubject = await buildSubject(requestBody.first_subject, { active_points: activePoints });
  const secondSubject = await buildSubject(requestBody.second_subject, { active_points: activePoints });
  const compositeSubject = new CompositeSubjectFactory(firstSubject, secondSubject).getMidpointCompositeSubjectModel();
  return ChartDataFactory.createCompositeChartData(compositeSubject, activePoints, activeAspects, {
    distribution_method: requestBody.distribution_method,
    custom_distribution_weights: requestBody.custom_distribution_weights ?? null,
  }) as SingleChartDataModel;
}

export async function createMoonPhaseOverview(
  requestBody: MoonPhaseRequestInput,
): Promise<MoonPhaseOverviewModel> {
  const subject = await AstrologicalSubjectFactory.fromBirthData({
    name: "Moon Phase",
    year: requestBody.year,
    month: requestBody.month,
    day: requestBody.day,
    hour: requestBody.hour,
    minute: requestBody.minute,
    seconds: requestBody.second,
    city: "",
    nation: "GB",
    lng: requestBody.longitude,
    lat: requestBody.latitude,
    tz_str: requestBody.timezone,
    online: false,
    active_points: resolveActivePoints(null),
    suppress_geonames_warning: true,
  });

  return MoonPhaseDetailsFactory.fromSubject(subject, {
    using_default_location: requestBody.using_default_location,
    location_precision: requestBody.location_precision,
  });
}

function formatCoordinate(value: string, precision: number): string {
  let rounded = Number(Number(value).toFixed(precision));
  if (Object.is(rounded, -0)) {
    rounded = 0;
  }
  return precision === 0 ? String(Math.trunc(rounded)) : rounded.toFixed(precision);
}

export function moonPhasePayload(overview: MoonPhaseOverviewModel): Record<string, unknown> {
  const data = dump(overview);
  if (data.location) {
    const precision = data.location.precision ?? 0;
    if (data.location.latitude != null) {
      data.location.latitude = formatCoordinate(String(data.location.latitude), precision);
    }
    if (data.location.longitude != null) {
      data.location.longitude = formatCoordinate(String(data.location.longitude), precision);
    }
  }
  return {
    status: "OK",
    moon_phase_overview: data,
  };
}

export function moonPhaseContextPayload(overview: MoonPhaseOverviewModel): Record<string, unknown> {
  const payload = moonPhasePayload(overview);
  return {
    status: payload.status,
    context: toContext(overview),
    moon_phase_overview: payload.moon_phase_overview,
  };
}

function currentUtcDate(): Date {
  return new Date();
}

export function currentUtcComponents() {
  const now = currentUtcDate();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: now.getUTCHours(),
    minute: now.getUTCMinutes(),
    second: now.getUTCSeconds(),
    iso: Temporal.Instant.fromEpochMilliseconds(now.getTime()).toString(),
  };
}
