import type {
  AstrologicalPoint,
  ChartType,
  HousesSystemIdentifier,
  KerykeionChartLanguage,
  KerykeionChartTheme,
  PerspectiveType,
  SiderealMode,
  ZodiacType,
} from "./schemas/literals";
import type {
  ActiveAspect,
  AspectModel,
  AstrologicalSubjectModel,
  CompositeSubjectModel,
  DualChartDataModel,
  PlanetReturnModel,
  SingleChartDataModel,
} from "./schemas/models";

import { AspectsFactory } from "./aspects/aspects-factory";
import { AstrologicalSubjectFactory } from "./astrological-subject-factory";
import { ChartDataFactory } from "./chart-data-factory";
import { ChartDrawer } from "./charts/chart-drawer";
import { requireNodeRuntime } from "./node-runtime";
import { getDefaultOutputDirectory } from "./runtime";
import { DEFAULT_ACTIVE_ASPECTS, DEFAULT_ACTIVE_POINTS } from "./settings/config-constants";

const LEGACY_NODE_NAMES_MAP = {
  Mean_Node: "Mean_North_Lunar_Node",
  True_Node: "True_North_Lunar_Node",
  Mean_South_Node: "Mean_South_Lunar_Node",
  True_South_Node: "True_South_Lunar_Node",
} as const;

const LEGACY_SUBJECT_ACTIVE_POINTS = [
  ...DEFAULT_ACTIVE_POINTS,
  "Mean_North_Lunar_Node",
  "Mean_South_Lunar_Node",
] as const satisfies readonly AstrologicalPoint[];

type SubjectLike = AstrologicalSubject | AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
type LegacyChartType
  = | ChartType
    | "Birth"
    | "birth"
    | "Natal"
    | "natal"
    | "ExternalNatal"
    | "external_natal"
    | "externalnatal"
    | "Synastry"
    | "synastry"
    | "Transit"
    | "transit"
    | "Composite"
    | "composite";

function stripNullish(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => stripNullish(item)).filter(item => item !== undefined);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry != null)
      .map(([key, entry]) => [key, stripNullish(entry)]);
    return Object.fromEntries(entries);
  }

  return value ?? undefined;
}

function timeFloatFromIso(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const match = value.match(/T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?/);
  if (!match) {
    return 0;
  }

  const hour = Number(match[1] ?? 0);
  const minute = Number(match[2] ?? 0);
  const second = Number(match[3] ?? 0);
  const fraction = Number(`0.${match[4] ?? "0"}`);
  return hour + minute / 60 + second / 3600 + fraction / 3600;
}

function normalizeActivePoints(
  points: Iterable<string | AstrologicalPoint> | null | undefined,
): AstrologicalPoint[] | null {
  if (points == null) {
    return null;
  }

  const normalized: AstrologicalPoint[] = [];
  for (const point of points) {
    const candidate = typeof point === "string"
      ? (LEGACY_NODE_NAMES_MAP[point as keyof typeof LEGACY_NODE_NAMES_MAP] ?? point)
      : point;
    const match = DEFAULT_ACTIVE_POINTS.find(item => item.toLowerCase() === String(candidate).toLowerCase());
    if (match) {
      normalized.push(match);
    }
  }

  return normalized.length > 0 ? normalized : null;
}

async function resolveSubject(
  input: SubjectLike,
): Promise<AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel> {
  if (input instanceof AstrologicalSubject) {
    return input.model();
  }
  return input;
}

function normalizeLegacyChartType(chartType: LegacyChartType): {
  chartType: ChartType;
  externalView: boolean;
} {
  const normalized = String(chartType).toLowerCase();
  if (normalized === "natal" || normalized === "birth") {
    return { chartType: "Natal", externalView: false };
  }
  if (normalized === "externalnatal" || normalized === "external_natal") {
    return { chartType: "Natal", externalView: true };
  }
  if (normalized === "synastry") {
    return { chartType: "Synastry", externalView: false };
  }
  if (normalized === "transit") {
    return { chartType: "Transit", externalView: false };
  }
  if (normalized === "composite") {
    return { chartType: "Composite", externalView: false };
  }

  throw new Error(`Unsupported or improperly configured chart_type '${chartType}'`);
}

function assignModelFields(target: Record<string, unknown>, model: AstrologicalSubjectModel): void {
  Object.assign(target, model);
}

export class AstrologicalSubject {
  [key: string]: unknown;

  private _model: AstrologicalSubjectModel | null = null;
  ready: Promise<this>;
  json_dir: string;

  constructor(
    name = "Now",
    year?: number,
    month?: number,
    day?: number,
    hour?: number,
    minute?: number,
    city?: string | null,
    nation?: string | null,
    lng?: number | null,
    lat?: number | null,
    tz_str?: string | null,
    geonames_username?: string | null,
    zodiac_type?: ZodiacType | null,
    online = true,
    _disable_chiron?: boolean | null,
    sidereal_mode?: SiderealMode | null,
    houses_system_identifier?: HousesSystemIdentifier | null,
    perspective_type?: PerspectiveType | null,
    cache_expire_after_days?: number | null,
    is_dst?: boolean | null,
    _disable_chiron_and_lilith = false,
  ) {
    const now = new Date();
    this.json_dir = getDefaultOutputDirectory();
    this.ready = AstrologicalSubjectFactory.fromBirthData({
      name,
      year: year ?? now.getFullYear(),
      month: month ?? now.getMonth() + 1,
      day: day ?? now.getDate(),
      hour: hour ?? now.getHours(),
      minute: minute ?? now.getMinutes(),
      seconds: year == null ? now.getSeconds() : 0,
      city: city ?? undefined,
      nation: nation ?? undefined,
      lng: lng ?? undefined,
      lat: lat ?? undefined,
      tz_str: tz_str ?? undefined,
      geonames_username: geonames_username ?? undefined,
      zodiac_type: zodiac_type ?? undefined,
      online,
      sidereal_mode: sidereal_mode ?? undefined,
      houses_system_identifier: houses_system_identifier ?? undefined,
      perspective_type: perspective_type ?? undefined,
      cache_expire_after_days: cache_expire_after_days ?? undefined,
      is_dst: is_dst ?? undefined,
      active_points: [...LEGACY_SUBJECT_ACTIVE_POINTS],
    }).then((model) => {
      this._model = model;
      assignModelFields(this, model);
      return this;
    });
  }

  private requireModel(): AstrologicalSubjectModel {
    if (!this._model) {
      throw new Error("AstrologicalSubject is not ready yet. Await subject.ready first.");
    }
    return this._model;
  }

  get mean_node(): AstrologicalSubjectModel["mean_north_lunar_node"] {
    return this.requireModel().mean_north_lunar_node;
  }

  get true_node(): AstrologicalSubjectModel["true_north_lunar_node"] {
    return this.requireModel().true_north_lunar_node;
  }

  get mean_south_node(): AstrologicalSubjectModel["mean_south_lunar_node"] {
    return this.requireModel().mean_south_lunar_node;
  }

  get true_south_node(): AstrologicalSubjectModel["true_south_lunar_node"] {
    return this.requireModel().true_south_lunar_node;
  }

  get utc_time(): number {
    return timeFloatFromIso(this.requireModel().iso_formatted_utc_datetime);
  }

  get local_time(): number {
    return timeFloatFromIso(this.requireModel().iso_formatted_local_datetime);
  }

  async model(): Promise<AstrologicalSubjectModel> {
    await this.ready;
    return this.requireModel();
  }

  get(item: string, defaultValue: unknown = null): unknown {
    const value = (this as Record<string, unknown>)[item];
    return value === undefined ? defaultValue : value;
  }

  async json(dump = false, destination_folder?: string | null, indent?: number): Promise<string> {
    const model = await this.model();
    const jsonString = JSON.stringify(stripNullish(model), null, indent);

    if (!dump) {
      return jsonString;
    }

    const targetDir = destination_folder ?? this.json_dir;
    const nodeRuntime = requireNodeRuntime("AstrologicalSubject.json(dump=true)");
    nodeRuntime.fs.mkdirSync(targetDir, { recursive: true });
    const jsonPath = nodeRuntime.path.join(targetDir, `${model.name}_kerykeion.json`);
    nodeRuntime.fs.writeFileSync(jsonPath, jsonString, "utf8");
    return jsonString;
  }

  toString(): string {
    const model = this.requireModel();
    return `Astrological data for: ${model.name}, ${model.iso_formatted_utc_datetime} UTC\nBirth location: ${model.city}, Lat ${model.lat}, Lon ${model.lng}`;
  }

  static async get_from_iso_utc_time(params: {
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
    active_points?: AstrologicalPoint[] | null;
    altitude?: number | null;
    calculate_lunar_phase?: boolean;
    suppress_geonames_warning?: boolean;
    custom_ayanamsa_t0?: number | null;
    custom_ayanamsa_ayan_t0?: number | null;
  }): Promise<AstrologicalSubject> {
    const subject = Object.create(AstrologicalSubject.prototype) as AstrologicalSubject;
    subject.json_dir = getDefaultOutputDirectory();
    subject.ready = AstrologicalSubjectFactory.fromIsoUtcTime({
      ...params,
      active_points: params.active_points ?? [...LEGACY_SUBJECT_ACTIVE_POINTS],
    }).then((model) => {
      subject._model = model;
      assignModelFields(subject, model);
      return subject;
    });
    return subject.ready;
  }
}

export class KerykeionChartSVG {
  ready: Promise<this>;
  chart_type: LegacyChartType;
  theme: KerykeionChartTheme | null;
  double_chart_aspect_grid_type: "list" | "table";
  chart_language: KerykeionChartLanguage;
  output_directory: string;
  template = "";
  aspects_list: AspectModel[] = [];
  available_planets_setting: ChartDrawer["available_planets_setting"] = [];
  available_kerykeion_celestial_points: ChartDrawer["available_planets_setting"] = [];
  t_available_kerykeion_celestial_points: ChartDrawer["available_planets_setting"] | null = null;
  chart_colors_settings: ChartDrawer["chart_colors_settings"] | null = null;
  planets_settings: ChartDrawer["planets_settings"] = [];
  aspects_settings: ChartDrawer["aspects_settings"] = [];
  language_settings: ChartDrawer["language_settings"] = {};
  height: number | null = null;
  width: number | null = null;
  location: string | null = null;
  geolat: number | null = null;
  geolon: number | null = null;
  main_radius: number | null = null;
  first_circle_radius: number | null = null;
  second_circle_radius: number | null = null;
  third_circle_radius: number | null = null;
  chart_data: SingleChartDataModel | DualChartDataModel | null = null;
  user: SubjectLike;
  first_obj: SubjectLike;
  t_user: SubjectLike | null;
  second_obj: SubjectLike | null;

  private readonly language_pack: Record<string, unknown> | null;
  private readonly active_points: AstrologicalPoint[] | null;
  private readonly active_aspects: ActiveAspect[];
  private _chart_drawer: ChartDrawer | null = null;

  constructor(
    first_obj: SubjectLike,
    chart_type: LegacyChartType = "Natal",
    second_obj: SubjectLike | null = null,
    new_output_directory?: string | null,
    _new_settings_file?: unknown,
    theme: KerykeionChartTheme | null = "classic",
    double_chart_aspect_grid_type: "list" | "table" = "list",
    chart_language: KerykeionChartLanguage = "EN",
    active_points: Array<AstrologicalPoint | string> = DEFAULT_ACTIVE_POINTS,
    active_aspects?: ActiveAspect[] | null,
    options: {
      language_pack?: Record<string, unknown> | null;
    } = {},
  ) {
    this.chart_type = chart_type;
    this.theme = theme;
    this.double_chart_aspect_grid_type = double_chart_aspect_grid_type;
    this.chart_language = chart_language;
    this.output_directory = new_output_directory ?? getDefaultOutputDirectory();
    this.user = first_obj;
    this.first_obj = first_obj;
    this.t_user = second_obj;
    this.second_obj = second_obj;
    this.language_pack = options.language_pack ?? null;
    this.active_points = normalizeActivePoints(active_points);
    this.active_aspects = [...(active_aspects ?? DEFAULT_ACTIVE_ASPECTS)];
    this.ready = this.ensureChart().then(() => this);
  }

  private syncLegacyState(drawer: ChartDrawer): void {
    this.available_planets_setting = drawer.available_planets_setting;
    this.available_kerykeion_celestial_points = drawer.available_planets_setting;
    this.aspects_list = drawer.aspects_list;
    this.chart_colors_settings = drawer.chart_colors_settings;
    this.planets_settings = drawer.planets_settings;
    this.aspects_settings = drawer.aspects_settings;
    this.language_settings = drawer.language_settings;
    this.height = drawer.height;
    this.width = drawer.width;
    this.location = drawer.location;
    this.geolat = drawer.geolat;
    this.geolon = drawer.geolon;
    this.main_radius = drawer.main_radius;
    this.first_circle_radius = drawer.first_circle_radius;
    this.second_circle_radius = drawer.second_circle_radius;
    this.third_circle_radius = drawer.third_circle_radius;
  }

  private async ensureChart(): Promise<void> {
    if (this._chart_drawer) {
      return;
    }

    const firstSubject = await resolveSubject(this.first_obj);
    const secondSubject = this.second_obj ? await resolveSubject(this.second_obj) : null;
    const normalized = normalizeLegacyChartType(this.chart_type);

    if (normalized.chartType === "Natal") {
      this.chart_data = ChartDataFactory.createNatalChartData(
        firstSubject,
        this.active_points,
        this.active_aspects,
      ) as SingleChartDataModel;
    }
    else if (normalized.chartType === "Synastry") {
      if (!secondSubject || "composite_chart_type" in firstSubject || "composite_chart_type" in secondSubject) {
        throw new Error("Synastry charts require two AstrologicalSubject instances.");
      }
      this.chart_data = ChartDataFactory.createSynastryChartData(
        firstSubject as AstrologicalSubjectModel,
        secondSubject as AstrologicalSubjectModel,
        this.active_points,
        this.active_aspects,
      ) as DualChartDataModel;
    }
    else if (normalized.chartType === "Transit") {
      if (!secondSubject || "composite_chart_type" in firstSubject || "composite_chart_type" in secondSubject) {
        throw new Error("Transit charts require natal and transit AstrologicalSubject instances.");
      }
      this.chart_data = ChartDataFactory.createTransitChartData(
        firstSubject as AstrologicalSubjectModel,
        secondSubject as AstrologicalSubjectModel,
        this.active_points,
        this.active_aspects,
      ) as DualChartDataModel;
    }
    else {
      if (!("composite_chart_type" in firstSubject)) {
        throw new Error("First object must be a CompositeSubjectModel instance for composite charts.");
      }
      this.chart_data = ChartDataFactory.createCompositeChartData(
        firstSubject,
        this.active_points,
        this.active_aspects,
      ) as SingleChartDataModel;
    }

    this._chart_drawer = new ChartDrawer(this.chart_data, {
      theme: this.theme,
      double_chart_aspect_grid_type: this.double_chart_aspect_grid_type,
      chart_language: this.chart_language,
      language_pack: this.language_pack,
      external_view: normalized.externalView,
    });
    this.syncLegacyState(this._chart_drawer);
    this.user = firstSubject;
    this.first_obj = firstSubject;
    this.t_user = secondSubject;
    this.second_obj = secondSubject;
  }

  async makeTemplate(minify = false, remove_css_variables = false): Promise<string> {
    await this.ready;
    const template = this._chart_drawer!.generate_svg_string(minify, remove_css_variables);
    this.template = template;
    return template;
  }

  async makeSVG(minify = false, remove_css_variables = false): Promise<void> {
    await this.ready;
    this.template = this._chart_drawer!.generate_svg_string(minify, remove_css_variables);
    this._chart_drawer!.save_svg(this.output_directory, null, minify, remove_css_variables);
  }

  async makeWheelOnlyTemplate(minify = false, remove_css_variables = false): Promise<string> {
    await this.ready;
    const template = this._chart_drawer!.generate_wheel_only_svg_string(minify, remove_css_variables);
    this.template = template;
    return template;
  }

  async makeWheelOnlySVG(minify = false, remove_css_variables = false): Promise<void> {
    await this.ready;
    this.template = this._chart_drawer!.generate_wheel_only_svg_string(minify, remove_css_variables);
    this._chart_drawer!.save_wheel_only_svg_file(this.output_directory, null, minify, remove_css_variables);
  }

  async makeAspectGridOnlyTemplate(minify = false, remove_css_variables = false): Promise<string> {
    await this.ready;
    const template = this._chart_drawer!.generate_aspect_grid_only_svg_string(minify, remove_css_variables);
    this.template = template;
    return template;
  }

  async makeAspectGridOnlySVG(minify = false, remove_css_variables = false): Promise<void> {
    await this.ready;
    this.template = this._chart_drawer!.generate_aspect_grid_only_svg_string(minify, remove_css_variables);
    this._chart_drawer!.save_aspect_grid_only_svg_file(this.output_directory, null, minify, remove_css_variables);
  }

  async save_svg(minify = false, remove_css_variables = false): Promise<void> {
    return this.makeSVG(minify, remove_css_variables);
  }

  async save_wheel_only_svg_file(minify = false, remove_css_variables = false): Promise<void> {
    return this.makeWheelOnlySVG(minify, remove_css_variables);
  }

  async save_aspect_grid_only_svg_file(minify = false, remove_css_variables = false): Promise<void> {
    return this.makeAspectGridOnlySVG(minify, remove_css_variables);
  }

  async makeGridOnlySVG(minify = false, remove_css_variables = false): Promise<void> {
    return this.makeAspectGridOnlySVG(minify, remove_css_variables);
  }
}

export class NatalAspects {
  readonly ready: Promise<this>;
  readonly active_points: AstrologicalPoint[] | null;
  readonly active_aspects: ActiveAspect[];
  readonly axis_orb_limit: number | null;
  user: AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel | null = null;
  private allAspectsPromise: Promise<AspectModel[]> | null = null;
  private relevantAspectsPromise: Promise<AspectModel[]> | null = null;

  constructor(
    user: SubjectLike,
    _new_settings_file?: unknown,
    active_points: Iterable<string | AstrologicalPoint> = DEFAULT_ACTIVE_POINTS,
    active_aspects?: ActiveAspect[] | null,
    options: {
      language_pack?: Record<string, unknown> | null;
      axis_orb_limit?: number | null;
    } = {},
  ) {
    this.active_points = normalizeActivePoints(active_points);
    this.active_aspects = [...(active_aspects ?? DEFAULT_ACTIVE_ASPECTS)];
    this.axis_orb_limit = options.axis_orb_limit ?? null;
    this.ready = resolveSubject(user).then((subject) => {
      this.user = subject;
      return this;
    });
  }

  private async buildAspectsModel() {
    await this.ready;
    return AspectsFactory.singleChartAspects(this.user!, {
      active_points: this.active_points,
      active_aspects: this.active_aspects,
      axis_orb_limit: this.axis_orb_limit,
    });
  }

  get all_aspects(): Promise<AspectModel[]> {
    this.allAspectsPromise ??= this.buildAspectsModel().then(model => [...model.aspects]);
    return this.allAspectsPromise;
  }

  get relevant_aspects(): Promise<AspectModel[]> {
    this.relevantAspectsPromise ??= this.buildAspectsModel().then(model => [...model.aspects]);
    return this.relevantAspectsPromise;
  }
}

export class SynastryAspects {
  readonly ready: Promise<this>;
  readonly active_points: AstrologicalPoint[] | null;
  readonly active_aspects: ActiveAspect[];
  readonly axis_orb_limit: number | null;
  first_user: AstrologicalSubjectModel | null = null;
  second_user: AstrologicalSubjectModel | null = null;
  private allAspectsPromise: Promise<AspectModel[]> | null = null;
  private relevantAspectsPromise: Promise<AspectModel[]> | null = null;

  constructor(
    kr_object_one: SubjectLike,
    kr_object_two: SubjectLike,
    _new_settings_file?: unknown,
    active_points: Iterable<string | AstrologicalPoint> = DEFAULT_ACTIVE_POINTS,
    active_aspects?: ActiveAspect[] | null,
    options: {
      language_pack?: Record<string, unknown> | null;
      axis_orb_limit?: number | null;
    } = {},
  ) {
    this.active_points = normalizeActivePoints(active_points);
    this.active_aspects = [...(active_aspects ?? DEFAULT_ACTIVE_ASPECTS)];
    this.axis_orb_limit = options.axis_orb_limit ?? null;
    this.ready = Promise.all([resolveSubject(kr_object_one), resolveSubject(kr_object_two)]).then(([first, second]) => {
      if ("composite_chart_type" in first || "composite_chart_type" in second) {
        throw new Error("SynastryAspects requires two AstrologicalSubject instances.");
      }
      this.first_user = first as AstrologicalSubjectModel;
      this.second_user = second as AstrologicalSubjectModel;
      return this;
    });
  }

  private async buildDualModel() {
    await this.ready;
    return AspectsFactory.dualChartAspects(this.first_user!, this.second_user!, {
      active_points: this.active_points,
      active_aspects: this.active_aspects,
      axis_orb_limit: this.axis_orb_limit,
      first_subject_is_fixed: true,
      second_subject_is_fixed: true,
    });
  }

  get all_aspects(): Promise<AspectModel[]> {
    this.allAspectsPromise ??= this.buildDualModel().then(model => [...model.aspects]);
    return this.allAspectsPromise;
  }

  get relevant_aspects(): Promise<AspectModel[]> {
    this.relevantAspectsPromise ??= this.buildDualModel().then(model => [...model.aspects]);
    return this.relevantAspectsPromise;
  }

  async get_relevant_aspects(): Promise<AspectModel[]> {
    return this.relevant_aspects;
  }
}
