import type { ChartTemplateModel } from "../schemas/chart-template-model";
import type { AstrologicalPoint, ChartType, KerykeionChartLanguage, KerykeionChartStyle, KerykeionChartTheme } from "../schemas/literals";
import type {
  ActiveAspect,
  AspectModel,
  AstrologicalSubjectModel,
  ChartDataModel,
  CompositeSubjectModel,
  DualChartDataModel,
  KerykeionPointModel,
  PlanetReturnModel,
} from "../schemas/models";

import type {
  KerykeionLanguageModel,
} from "../schemas/settings-models";
import type { ChartAspectSetting, KerykeionSettingsCelestialPointModel } from "../settings/chart-defaults";
import { chartTemplates, chartThemes } from "../../generated/chart-assets";
import { HouseComparisonFactory } from "../house-comparison/house-comparison-factory";
import { getOptionalNodeRuntime, requireNodeRuntime } from "../node-runtime";
import { getDefaultOutputDirectory } from "../runtime";
import { KerykeionException } from "../schemas/kerykeion-exception";
import {

  chartStyles,
  signs,

} from "../schemas/literals";
import {

  DEFAULT_CELESTIAL_POINTS_SETTINGS,
  DEFAULT_CHART_ASPECTS_SETTINGS,
  DEFAULT_CHART_COLORS,

} from "../settings/chart-defaults";
import { getTranslations, loadLanguageSettings } from "../settings/translations";
import {
  distributePercentagesTo100,
  getHousesList,
  inlineCssVariablesInSvg,
} from "../utilities";
import {
  convertLatitudeCoordinateToString,
  convertLongitudeCoordinateToString,
  drawAspectGrid,
  drawAspectLine,
  drawBackgroundCircle,
  drawCuspComparisonGrid,
  drawDegreeRing,
  drawFirstCircle,
  drawHouseComparisonGrid,
  drawHousesCuspsAndTextNumber,
  drawMainHouseGrid,
  drawMainPlanetGrid,
  drawSecondaryHouseGrid,
  drawSecondaryPlanetGrid,
  drawSecondCircle,
  drawSingleCuspComparisonGrid,
  drawSingleHouseComparisonGrid,
  drawThirdCircle,
  drawTransitAspectGrid,
  drawTransitAspectList,
  drawTransitRing,
  drawTransitRingDegreeSteps,
  drawZodiacSlice,
  formatDatetimeWithTimezone,
  formatLocationString,
  makeLunarPhase,
} from "./charts-utils";
import {
  drawModernDualHoroscope,
  drawModernHoroscope,
} from "./draw-modern";
import { drawPlanets } from "./draw-planets";

const _UNSET = Symbol("chart-drawer-unset");

type FirstSubjectType = AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
type SecondSubjectType = AstrologicalSubjectModel | PlanetReturnModel | null;

const DEFAULT_DIMENSIONS = {
  default_height: 550,
  natal_width: 870,
  full_width: 1250,
  full_width_with_table: 1250,
  synastry_width: 1570,
  ultra_wide_width: 1320,
} as const;

const DEFAULT_RADII = {
  main_radius: 240,
  single_wheel_first: 0,
  single_wheel_second: 36,
  single_wheel_third: 120,
  external_view_first: 56,
  external_view_second: 92,
  external_view_third: 112,
} as const;

const DEFAULT_VERTICAL_OFFSETS: {
  wheel: number;
  grid: number;
  aspect_grid: number;
  aspect_list: number;
  title: number;
  elements: number;
  qualities: number;
  lunar_phase: number;
  bottom_left: number;
} = {
  wheel: 50.0,
  grid: 0.0,
  aspect_grid: 50.0,
  aspect_list: 50.0,
  title: 0.0,
  elements: 0.0,
  qualities: 0.0,
  lunar_phase: 518.0,
  bottom_left: 0.0,
};

const GRID_COLUMN_WIDTH = 125;
const SECOND_COLUMN_THRESHOLD = 20;

const SIDEREAL_MODE_NAMES: Record<string, string> = {
  FAGAN_BRADLEY: "Fagan/Bradley",
  LAHIRI: "Lahiri",
  DELUCE: "De Luce",
  RAMAN: "Raman",
  USHASHASHI: "Usha/Shashi",
  KRISHNAMURTI: "Krishnamurti",
  DJWHAL_KHUL: "Djwhal Khul",
  YUKTESHWAR: "Yukteshwar",
  JN_BHASIN: "J.N. Bhasin",
  BABYL_KUGLER1: "Babylonian/Kugler 1",
  BABYL_KUGLER2: "Babylonian/Kugler 2",
  BABYL_KUGLER3: "Babylonian/Kugler 3",
  BABYL_HUBER: "Babylonian/Huber",
  BABYL_ETPSC: "Babylonian/Eta Piscium",
  ALDEBARAN_15TAU: "Babylonian/Aldebaran = 15 Tau",
  HIPPARCHOS: "Hipparchos",
  SASSANIAN: "Sassanian",
  J2000: "J2000",
  J1900: "J1900",
  B1950: "B1950",
  ARYABHATA: "Aryabhata",
  ARYABHATA_522: "Aryabhata 522",
  ARYABHATA_MSUN: "Aryabhata, mean Sun",
  GALCENT_0SAG: "Galact. Center = 0 Sag",
  GALCENT_COCHRANE: "Cochrane (Gal.Center = 0 Cap)",
  GALCENT_MULA_WILHELM: "Dhruva/Gal.Center/Mula (Wilhelm)",
  GALCENT_RGILBRAND: "Galactic Center (Gil Brand)",
  GALEQU_FIORENZA: "Galactic Equator (Fiorenza)",
  GALEQU_IAU1958: "Galactic Equator (IAU1958)",
  GALEQU_MULA: "Galactic Equator mid-Mula",
  GALEQU_TRUE: "Galactic Equator",
  GALALIGN_MARDYKS: "Skydram (Mardyks)",
  KRISHNAMURTI_VP291: "Krishnamurti-Senthilathiban",
  LAHIRI_1940: "Lahiri 1940",
  LAHIRI_ICRC: "Lahiri ICRC",
  LAHIRI_VP285: "Lahiri VP285",
  SURYASIDDHANTA: "Suryasiddhanta",
  SURYASIDDHANTA_MSUN: "Suryasiddhanta, mean Sun",
  SS_CITRA: "SS Citra",
  SS_REVATI: "SS Revati",
  TRUE_CITRA: "True Citra",
  TRUE_MULA: "True Mula (Chandra Hari)",
  TRUE_PUSHYA: "True Pushya (PVRN Rao)",
  TRUE_REVATI: "True Revati",
  TRUE_SHEORAN: "\"Vedic\"/Sheoran",
  BABYL_BRITTON: "Babylonian/Britton",
  VALENS_MOON: "Vettius Valens",
  USER: "",
};

function substituteTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\$(\w+)/g, (_, key: string) => {
    const value = values[key];
    return value == null ? "" : String(value);
  });
}

function regexMinify(svg: string): string {
  return svg.replaceAll("\"", "'").replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
}

const SCOUR_MINIFY_CODE = [
  "from scour.scour import scourString",
  "import re, sys",
  "svg = sys.stdin.read()",
  "svg = scourString(svg).replace('\"', \"'\")",
  "svg = re.sub(r'\\s+', ' ', svg)",
  "svg = re.sub(r'>\\s+<', '><', svg)",
  "sys.stdout.write(svg.strip())",
].join(";");

let cachedScourPython: string | null | undefined;

function resolveProjectRootPath(): string {
  const projectRootRelativeUrl = ["..", "..", ".."].join("/");
  const pathname = decodeURIComponent(new URL(projectRootRelativeUrl, import.meta.url).pathname);
  return /^\/[a-z]:/i.test(pathname) ? pathname.slice(1) : pathname;
}

function resolveScourPython(): string | null {
  if (cachedScourPython !== undefined) {
    return cachedScourPython;
  }

  const nodeRuntime = getOptionalNodeRuntime();
  if (!nodeRuntime) {
    cachedScourPython = null;
    return null;
  }

  const candidates = [
    nodeRuntime.path.join(resolveProjectRootPath(), ".venv-pyref", "bin", "python"),
    "python3",
    "python",
  ] as const;

  for (const candidate of candidates) {
    try {
      if (candidate.includes(nodeRuntime.path.sep) && !nodeRuntime.fs.existsSync(candidate)) {
        continue;
      }
      nodeRuntime.childProcess.execFileSync(candidate, ["-c", "import scour.scour"], {
        stdio: ["ignore", "ignore", "ignore"],
      });
      cachedScourPython = candidate;
      return candidate;
    }
    catch {
      continue;
    }
  }

  cachedScourPython = null;
  return null;
}

function scourMinify(svg: string): string {
  const python = resolveScourPython();
  if (!python) {
    return regexMinify(svg);
  }

  try {
    const nodeRuntime = requireNodeRuntime("SVG minification");
    return nodeRuntime.childProcess.execFileSync(python, ["-c", SCOUR_MINIFY_CODE], {
      input: svg,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  }
  catch {
    return regexMinify(svg);
  }
}

function formatIsoDateOnly(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  return iso.slice(0, 10);
}

function formatIsoYearMonth(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  return iso.slice(0, 7);
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function isPlanetReturn(subject: unknown): subject is PlanetReturnModel {
  return typeof subject === "object" && subject !== null && "return_type" in subject;
}

interface ChartRendererProtocol {
  render: (templateDict: Record<string, string | number>) => void;
}

class BaseChartRenderer implements ChartRendererProtocol {
  constructor(protected readonly drawer: ChartDrawer) {}

  render(templateDict: Record<string, string | number>): void {
    this.setupCircles(templateDict);
    this.setupAspects(templateDict);
    this.setupInfoSections(templateDict);
    this.setupGrids(templateDict);
    this.setupHouseComparison(templateDict);
  }

  protected setupCircles(_templateDict: Record<string, string | number>): void {
    throw new Error("setupCircles not implemented");
  }

  protected setupAspects(_templateDict: Record<string, string | number>): void {
    throw new Error("setupAspects not implemented");
  }

  protected setupInfoSections(_templateDict: Record<string, string | number>): void {
    throw new Error("setupInfoSections not implemented");
  }

  protected setupGrids(_templateDict: Record<string, string | number>): void {
    throw new Error("setupGrids not implemented");
  }

  protected setupHouseComparison(templateDict: Record<string, string | number>): void {
    templateDict.makeHouseComparisonGrid = "";
  }

  protected t(key: string, defaultValue: string): string {
    return this.drawer._translate(key, defaultValue) as string;
  }

  protected getHousesList(subject: FirstSubjectType | Exclude<SecondSubjectType, null>): KerykeionPointModel[] {
    return getHousesList(subject);
  }
}

class InfoSectionBuilder {
  constructor(private readonly drawer: ChartDrawer) {}

  t(key: string, defaultValue: string): string {
    return this.drawer._translate(key, defaultValue) as string;
  }

  buildZodiacInfo(): string {
    return this.drawer._get_zodiac_info();
  }

  buildDomificationInfo(): string {
    return this.drawer._get_domification_string();
  }

  buildPerspectiveInfo(subject: FirstSubjectType | Exclude<SecondSubjectType, null>): string {
    return this.drawer._get_perspective_string(subject);
  }

  buildHousesSystemInfo(subject: FirstSubjectType | Exclude<SecondSubjectType, null>): string {
    return this.drawer._format_houses_system_string(subject);
  }

  buildLunarPhaseInfo(
    templateDict: Record<string, string | number>,
    subject: FirstSubjectType | Exclude<SecondSubjectType, null>,
    options: {
      prefix?: string;
      lunationKey?: string;
      phaseKey?: string;
    } = {},
  ): void {
    const lunationKey = options.lunationKey ?? "bottom_left_2";
    const phaseKey = options.phaseKey ?? "bottom_left_3";
    const prefix = options.prefix ?? "";
    if (!subject.lunar_phase) {
      templateDict[lunationKey] = "";
      templateDict[phaseKey] = "";
      return;
    }

    const lunationLabel = this.t("lunation_day", "Lunation Day");
    const phaseLabel = this.t("lunar_phase", "Lunar Phase");
    const phaseName = subject.lunar_phase.moon_phase_name;
    const phaseKeyName = phaseName.toLowerCase().replaceAll(" ", "_");

    templateDict[lunationKey] = `${prefix}${lunationLabel}: ${subject.lunar_phase.moon_phase}`;
    templateDict[phaseKey] = `${prefix}${phaseLabel}: ${this.t(phaseKeyName, phaseName)}`;
  }

  buildLocationCoordinates(
    latitude: number,
    longitude: number,
    useAbbreviations = false,
  ): [string, string] {
    return [
      this.drawer._format_latitude_string(latitude, useAbbreviations),
      this.drawer._format_longitude_string(longitude, useAbbreviations),
    ];
  }
}

class NatalChartRenderer extends BaseChartRenderer {
  protected override setupCircles(templateDict: Record<string, string | number>): void {
    this.drawer._setup_radix_circles(templateDict);
  }

  protected override setupAspects(templateDict: Record<string, string | number>): void {
    this.drawer._setup_single_chart_aspects(templateDict);
  }

  protected override setupInfoSections(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    const b = new InfoSectionBuilder(d);
    const [lat, lon] = b.buildLocationCoordinates(d.geolat, d.geolon);

    templateDict.top_left_0 = `${this.t("location", "Location")}:`;
    templateDict.top_left_1 = `${d.first_obj.city}, ${d.first_obj.nation}`;
    templateDict.top_left_2 = `${this.t("latitude", "Latitude")}: ${lat}`;
    templateDict.top_left_3 = `${this.t("longitude", "Longitude")}: ${lon}`;
    templateDict.top_left_4 = formatDatetimeWithTimezone(d.first_obj.iso_formatted_local_datetime ?? "");

    const weekdayKey = `weekdays.${d.first_obj.day_of_week}`;
    const localizedWeekday = this.t(weekdayKey, d.first_obj.day_of_week ?? "");
    templateDict.top_left_5 = `${this.t("day_of_week", "Day of Week")}: ${localizedWeekday}`;

    templateDict.bottom_left_0 = b.buildZodiacInfo();
    templateDict.bottom_left_1 = b.buildDomificationInfo();
    b.buildLunarPhaseInfo(templateDict, d.first_obj);
    templateDict.bottom_left_4 = b.buildPerspectiveInfo(d.first_obj);

    d._setup_lunar_phase(templateDict, d.first_obj, d.geolat);
  }

  protected override setupGrids(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    const housesList = this.getHousesList(d.first_obj);
    d._setup_main_houses_grid(templateDict, housesList);
    templateDict.makeSecondaryHousesGrid = "";
    d._setup_single_wheel_houses(templateDict, housesList);
    d._setup_single_wheel_planets(templateDict);
    d._setup_main_planet_grid(templateDict, d.first_obj.name, this.t("planets_and_house", "Points for"));
    templateDict.makeSecondaryPlanetGrid = "";
  }
}

class CompositeChartRenderer extends BaseChartRenderer {
  protected override setupCircles(templateDict: Record<string, string | number>): void {
    this.drawer._setup_radix_circles(templateDict);
  }

  protected override setupAspects(templateDict: Record<string, string | number>): void {
    this.drawer._setup_single_chart_aspects(templateDict);
  }

  protected override setupInfoSections(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!("first_subject" in d.first_obj) || !("second_subject" in d.first_obj)) {
      throw new KerykeionException("Composite chart requires composite subject.");
    }
    const b = new InfoSectionBuilder(d);
    const [firstLat, firstLon] = b.buildLocationCoordinates(d.first_obj.first_subject.lat, d.first_obj.first_subject.lng, true);
    const [secondLat, secondLon] = b.buildLocationCoordinates(
      d.first_obj.second_subject.lat,
      d.first_obj.second_subject.lng,
      true,
    );

    templateDict.top_left_0 = d.first_obj.first_subject.name;
    templateDict.top_left_1 = formatIsoDateOnly(d.first_obj.first_subject.iso_formatted_local_datetime)
      ? `${formatIsoDateOnly(d.first_obj.first_subject.iso_formatted_local_datetime)} ${d.first_obj.first_subject.iso_formatted_local_datetime.slice(11, 16)}`
      : "";
    templateDict.top_left_2 = `${firstLat} ${firstLon}`;
    templateDict.top_left_3 = d.first_obj.second_subject.name;
    templateDict.top_left_4 = formatIsoDateOnly(d.first_obj.second_subject.iso_formatted_local_datetime)
      ? `${formatIsoDateOnly(d.first_obj.second_subject.iso_formatted_local_datetime)} ${d.first_obj.second_subject.iso_formatted_local_datetime.slice(11, 16)}`
      : "";
    templateDict.top_left_5 = `${secondLat} / ${secondLon}`;

    templateDict.bottom_left_0 = b.buildZodiacInfo();
    templateDict.bottom_left_1 = b.buildHousesSystemInfo(d.first_obj);
    templateDict.bottom_left_2 = `${this.t("perspective_type", "Perspective")}: ${d.first_obj.first_subject.perspective_type}`;
    templateDict.bottom_left_3 = `${this.t("composite_chart", "Composite Chart")} - ${this.t("midpoints", "Midpoints")}`;
    templateDict.bottom_left_4 = "";
    d._setup_lunar_phase(templateDict, d.first_obj, d.geolat);
  }

  protected override setupGrids(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    const housesList = this.getHousesList(d.first_obj);
    d._setup_main_houses_grid(templateDict, housesList);
    templateDict.makeSecondaryHousesGrid = "";
    d._setup_single_wheel_houses(templateDict, housesList);
    d._setup_single_wheel_planets(templateDict);
    if (!("first_subject" in d.first_obj) || !("second_subject" in d.first_obj)) {
      throw new KerykeionException("Composite chart requires composite subject.");
    }
    const subjectName = `${d.first_obj.first_subject.name} ${this.t("and_word", "&")} ${d.first_obj.second_subject.name}`;
    d._setup_main_planet_grid(templateDict, subjectName, this.t("planets_and_house", "Points for"));
    templateDict.makeSecondaryPlanetGrid = "";
  }
}

class TransitChartRenderer extends BaseChartRenderer {
  protected override setupCircles(templateDict: Record<string, string | number>): void {
    this.drawer._setup_transit_circles(templateDict);
  }

  protected override setupAspects(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (d.double_chart_aspect_grid_type === "list") {
      const title = `${d.first_obj.name} - ${this.t("transit_aspects", "Transit Aspects")}`;
      templateDict.makeAspectGrid = "";
      if (d._is_right_panel_mode()) {
        const rp = d._get_right_panel_aspect_params();
        templateDict.makeDoubleChartAspectList = drawTransitAspectList(
          title,
          d.aspects_list,
          d._language_model.celestial_points,
          d.aspects_settings,
          {
            aspectsPerColumn: rp.aspects_per_column,
            columnWidth: rp.column_width,
            lineHeight: rp.line_height,
            chartHeight: d.height,
            xOffset: rp.x_offset,
            yOffset: rp.y_offset,
          },
        );
      }
      else {
        templateDict.makeDoubleChartAspectList = drawTransitAspectList(
          title,
          d.aspects_list,
          d._language_model.celestial_points,
          d.aspects_settings,
          { chartHeight: d.height },
        );
      }
    }
    else {
      templateDict.makeAspectGrid = "";
      if (d._is_right_panel_mode()) {
        const rp = d._get_right_panel_aspect_params();
        const nActive = Math.max(d._count_active_planets(), 1);
        const gridY = Math.trunc(rp.y_offset + 14 * nActive + 44);
        templateDict.makeDoubleChartAspectList = drawTransitAspectGrid(
          d.chart_colors_settings.paper_0,
          d.available_planets_setting,
          d.aspects_list,
          rp.x_offset,
          gridY,
        );
      }
      else {
        templateDict.makeDoubleChartAspectList = drawTransitAspectGrid(
          d.chart_colors_settings.paper_0,
          d.available_planets_setting,
          d.aspects_list,
          600,
          520,
        );
      }
    }
    templateDict.makeAspects = d._draw_all_aspects_lines(d.main_radius, d.main_radius - 160);
  }

  protected override setupInfoSections(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj) {
      throw new KerykeionException("Transit chart requires a second subject.");
    }
    const b = new InfoSectionBuilder(d);
    d._clear_element_quality_strings(templateDict);

    let natalLat = "";
    let natalLon = "";
    if (d.first_obj.lat != null && d.first_obj.lng != null) {
      [natalLat, natalLon] = b.buildLocationCoordinates(d.first_obj.lat, d.first_obj.lng, true);
    }

    let transitLat = "";
    let transitLon = "";
    if (d.second_obj.lat != null && d.second_obj.lng != null) {
      [transitLat, transitLon] = b.buildLocationCoordinates(d.second_obj.lat, d.second_obj.lng, true);
    }

    templateDict.top_left_0 = `${this.t("chart_info_natal_label", "Natal")}: ${formatDatetimeWithTimezone(d.first_obj.iso_formatted_local_datetime ?? "")}`;
    templateDict.top_left_1 = `${formatLocationString(d.first_obj.city ?? "")}, ${d.first_obj.nation}`;
    templateDict.top_left_2 = `${natalLat}  ·  ${natalLon}`;
    templateDict.top_left_3 = `${this.t("chart_info_transit_label", "Transit")}: ${formatDatetimeWithTimezone(d.second_obj.iso_formatted_local_datetime ?? "")}`;
    templateDict.top_left_4 = `${formatLocationString(d.second_obj.city ?? "")}, ${d.second_obj.nation}`;
    templateDict.top_left_5 = `${transitLat}  ·  ${transitLon}`;

    templateDict.bottom_left_0 = b.buildZodiacInfo();
    templateDict.bottom_left_1 = b.buildDomificationInfo();
    templateDict.bottom_left_2 = b.buildPerspectiveInfo(d.second_obj);

    if (d.second_obj.lunar_phase) {
      b.buildLunarPhaseInfo(templateDict, d.second_obj, {
        prefix: `${this.t("Transit", "Transit")} `,
        lunationKey: "bottom_left_3",
        phaseKey: "bottom_left_4",
      });
      templateDict.makeLunarPhase = makeLunarPhase(d.second_obj.lunar_phase.degrees_between_s_m, d.geolat);
    }
    else {
      templateDict.bottom_left_3 = "";
      templateDict.bottom_left_4 = "";
      templateDict.makeLunarPhase = "";
    }
  }

  protected override setupGrids(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj) {
      throw new KerykeionException("Transit chart requires a second subject.");
    }
    const firstHouses = this.getHousesList(d.first_obj);
    const secondHouses = this.getHousesList(d.second_obj);

    d._setup_main_houses_grid(templateDict, firstHouses);
    templateDict.makeSecondaryHousesGrid = "";
    d._setup_dual_wheel_houses(templateDict, firstHouses, secondHouses);
    d._setup_dual_wheel_planets(templateDict);

    const firstLabel = d._truncate_name(d.first_obj.name);
    const transitLabel = this.t("transit", "Transit");
    templateDict.makeMainPlanetGrid = drawMainPlanetGrid(
      "",
      `${firstLabel} (${this.t("inner_wheel", "Inner Wheel")})`,
      d.available_kerykeion_celestial_points,
      d.chart_type,
      d._language_model.celestial_points,
      d.chart_colors_settings.paper_0,
    );
    templateDict.makeSecondaryPlanetGrid = drawSecondaryPlanetGrid(
      "",
      `${transitLabel} (${this.t("outer_wheel", "Outer Wheel")})`,
      d.second_subject_celestial_points,
      d.chart_type,
      d._language_model.celestial_points,
      d.chart_colors_settings.paper_0,
    );
  }

  protected override setupHouseComparison(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj || (!d.show_house_position_comparison && !d.show_cusp_position_comparison)) {
      templateDict.makeHouseComparisonGrid = "";
      return;
    }

    const houseComparison = new HouseComparisonFactory(
      d.first_obj as AstrologicalSubjectModel | PlanetReturnModel,
      d.second_obj,
      d.active_points,
    ).getHouseComparison();

    let svg = "";
    if (d.show_house_position_comparison) {
      svg += drawSingleHouseComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        d.active_points,
        {
          pointsOwnerSubjectNumber: 2,
          housePositionComparisonLabel: this.t("house_position_comparison", "House Position Comparison"),
          returnPointLabel: this.t("transit_point", "Transit Point"),
          natalHouseLabel: this.t("house_position", "Natal House"),
          xPosition: 980,
        },
      );
    }
    if (d.show_cusp_position_comparison) {
      svg += drawSingleCuspComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        {
          cuspsOwnerSubjectNumber: 2,
          cuspPositionComparisonLabel: this.t("cusp_position_comparison", "Cusp Position Comparison"),
          ownerCuspLabel: this.t("transit_cusp", "Transit Cusp"),
          projectedHouseLabel: this.t("natal_house", "Natal House"),
          xPosition: d.show_house_position_comparison ? 1180 : 980,
        },
      );
    }
    templateDict.makeHouseComparisonGrid = svg;
  }
}

class SynastryChartRenderer extends BaseChartRenderer {
  protected override setupCircles(templateDict: Record<string, string | number>): void {
    this.drawer._setup_transit_circles(templateDict);
  }

  protected override setupAspects(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj) {
      throw new KerykeionException("Synastry chart requires a second subject.");
    }
    if (d.double_chart_aspect_grid_type === "list") {
      templateDict.makeAspectGrid = "";
      const title = `${d.first_obj.name} - ${d.second_obj.name} ${this.t("synastry_aspects", "Synastry Aspects")}`;
      if (d._is_right_panel_mode()) {
        const rp = d._get_right_panel_aspect_params();
        templateDict.makeDoubleChartAspectList = drawTransitAspectList(
          title,
          d.aspects_list,
          d._language_model.celestial_points,
          d.aspects_settings,
          {
            aspectsPerColumn: rp.aspects_per_column,
            columnWidth: rp.column_width,
            lineHeight: rp.line_height,
            chartHeight: d.height,
            xOffset: rp.x_offset,
            yOffset: rp.y_offset,
          },
        );
      }
      else {
        templateDict.makeDoubleChartAspectList = drawTransitAspectList(
          title,
          d.aspects_list,
          d._language_model.celestial_points,
          d.aspects_settings,
          { chartHeight: d.height },
        );
      }
    }
    else {
      templateDict.makeAspectGrid = "";
      if (d._is_right_panel_mode()) {
        const rp = d._get_right_panel_aspect_params();
        const nActive = Math.max(d._count_active_planets(), 1);
        const gridTotalHeight = (nActive + 1) * 14;
        const targetTop = (d._vertical_offsets.title ?? 0) + 20;
        const gridY = Math.trunc(targetTop - d._vertical_offsets.aspect_list + gridTotalHeight);
        templateDict.makeDoubleChartAspectList = drawTransitAspectGrid(
          d.chart_colors_settings.paper_0,
          d.available_planets_setting,
          d.aspects_list,
          rp.x_offset,
          gridY,
        );
      }
      else {
        templateDict.makeDoubleChartAspectList = drawTransitAspectGrid(
          d.chart_colors_settings.paper_0,
          d.available_planets_setting,
          d.aspects_list,
          550,
          450,
        );
      }
    }
    templateDict.makeAspects = d._draw_all_aspects_lines(d.main_radius, d.main_radius - 160);
  }

  protected override setupInfoSections(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj) {
      throw new KerykeionException("Synastry chart requires a second subject.");
    }
    const b = new InfoSectionBuilder(d);
    templateDict.top_left_0 = `${d.first_obj.name}:`;
    templateDict.top_left_1 = `${d.first_obj.city}, ${d.first_obj.nation}`;
    templateDict.top_left_2 = formatDatetimeWithTimezone(d.first_obj.iso_formatted_local_datetime ?? "");
    templateDict.top_left_3 = `${d.second_obj.name}: `;
    templateDict.top_left_4 = `${d.second_obj.city}, ${d.second_obj.nation}`;
    templateDict.top_left_5 = formatDatetimeWithTimezone(d.second_obj.iso_formatted_local_datetime ?? "");
    templateDict.bottom_left_0 = "";
    templateDict.bottom_left_1 = "";
    templateDict.bottom_left_2 = b.buildZodiacInfo();
    templateDict.bottom_left_3 = b.buildHousesSystemInfo(d.first_obj);
    templateDict.bottom_left_4 = b.buildPerspectiveInfo(d.first_obj);
    templateDict.makeLunarPhase = "";
  }

  protected override setupGrids(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj) {
      throw new KerykeionException("Synastry chart requires a second subject.");
    }
    const firstHouses = this.getHousesList(d.first_obj);
    const secondHouses = this.getHousesList(d.second_obj);
    d._setup_main_houses_grid(templateDict, firstHouses);
    d._setup_secondary_houses_grid(templateDict, secondHouses);
    d._setup_dual_wheel_houses(templateDict, firstHouses, secondHouses);
    d._setup_dual_wheel_planets(templateDict);

    const firstLabel = d._truncate_name(d.first_obj.name, 18, "…");
    const secondLabel = d._truncate_name(d.second_obj.name, 18, "…");
    templateDict.makeMainPlanetGrid = drawMainPlanetGrid(
      "",
      `${firstLabel} (${this.t("inner_wheel", "Inner Wheel")})`,
      d.available_kerykeion_celestial_points,
      d.chart_type,
      d._language_model.celestial_points,
      d.chart_colors_settings.paper_0,
    );
    templateDict.makeSecondaryPlanetGrid = drawSecondaryPlanetGrid(
      "",
      `${secondLabel} (${this.t("outer_wheel", "Outer Wheel")})`,
      d.second_subject_celestial_points,
      d.chart_type,
      d._language_model.celestial_points,
      d.chart_colors_settings.paper_0,
    );
  }

  protected override setupHouseComparison(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj || (!d.show_house_position_comparison && !d.show_cusp_position_comparison)) {
      templateDict.makeHouseComparisonGrid = "";
      return;
    }
    const houseComparison = new HouseComparisonFactory(
      d.first_obj as AstrologicalSubjectModel | PlanetReturnModel,
      d.second_obj,
      d.active_points,
    ).getHouseComparison();

    const firstLabel = d._truncate_name(d.first_obj.name, 8, "…", true);
    const secondLabel = d._truncate_name(d.second_obj.name, 8, "…", true);
    const pointLabel = this.t("point", "Point");
    const comparisonLabel = this.t("house_position_comparison", "House Position Comparison");
    let svg = "";

    if (d.show_house_position_comparison) {
      svg += drawHouseComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        d.active_points,
        {
          pointsOwnerSubjectNumber: 1,
          housePositionComparisonLabel: comparisonLabel,
          returnPointLabel: `${firstLabel} ${pointLabel}`,
          returnLabel: firstLabel,
          radixLabel: secondLabel,
          xPosition: 1090,
        },
      );
      svg += drawHouseComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        d.active_points,
        {
          pointsOwnerSubjectNumber: 2,
          housePositionComparisonLabel: "",
          returnPointLabel: `${secondLabel} ${pointLabel}`,
          returnLabel: secondLabel,
          radixLabel: firstLabel,
          xPosition: 1290,
        },
      );
    }

    if (d.show_cusp_position_comparison) {
      let firstCuspX = 1090;
      let secondCuspX = 1290;
      if (d.show_house_position_comparison) {
        const firstGridWidth = d._estimate_house_comparison_grid_width({
          column_labels: [`${firstLabel} ${pointLabel}`, firstLabel, secondLabel],
          include_radix_column: true,
          include_title: true,
        });
        const secondGridWidth = d._estimate_house_comparison_grid_width({
          column_labels: [`${secondLabel} ${pointLabel}`, secondLabel, firstLabel],
          include_radix_column: true,
          include_title: false,
        });
        const cuspX = Math.trunc(Math.max(1000 + firstGridWidth, 1190 + secondGridWidth) + 50);
        firstCuspX = cuspX;
        secondCuspX = cuspX + 160;
      }
      svg += drawCuspComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        {
          cuspsOwnerSubjectNumber: 1,
          cuspPositionComparisonLabel: this.t("cusp_position_comparison", "Cusp Position Comparison"),
          ownerCuspLabel: `${firstLabel} ${this.t("cusp", "Cusp")}`,
          projectedHouseLabel: `${secondLabel} ${this.t("house", "House")}`,
          xPosition: firstCuspX,
        },
      );
      svg += drawCuspComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        {
          cuspsOwnerSubjectNumber: 2,
          cuspPositionComparisonLabel: "",
          ownerCuspLabel: `${secondLabel} ${this.t("cusp", "Cusp")}`,
          projectedHouseLabel: `${firstLabel} ${this.t("house", "House")}`,
          xPosition: secondCuspX,
        },
      );
    }

    templateDict.makeHouseComparisonGrid = svg;
  }
}

class SingleReturnChartRenderer extends BaseChartRenderer {
  protected override setupCircles(templateDict: Record<string, string | number>): void {
    this.drawer._setup_radix_circles(templateDict);
  }

  protected override setupAspects(templateDict: Record<string, string | number>): void {
    this.drawer._setup_single_chart_aspects(templateDict);
  }

  protected override setupInfoSections(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    const b = new InfoSectionBuilder(d);
    const [lat, lon] = b.buildLocationCoordinates(d.geolat, d.geolon);
    templateDict.top_left_0 = `${this.t("info", "Info")}:`;
    templateDict.top_left_1 = formatDatetimeWithTimezone(d.first_obj.iso_formatted_local_datetime ?? "");
    templateDict.top_left_2 = `${d.first_obj.city}, ${d.first_obj.nation}`;
    templateDict.top_left_3 = `${this.t("latitude", "Latitude")}: ${lat}`;
    templateDict.top_left_4 = `${this.t("longitude", "Longitude")}: ${lon}`;
    templateDict.top_left_5
      = isPlanetReturn(d.first_obj) && d.first_obj.return_type === "Solar"
        ? `${this.t("type", "Type")}: ${this.t("solar_return", "Solar Return")}`
        : `${this.t("type", "Type")}: ${this.t("lunar_return", "Lunar Return")}`;
    templateDict.bottom_left_0 = b.buildZodiacInfo();
    templateDict.bottom_left_1 = b.buildHousesSystemInfo(d.first_obj);
    b.buildLunarPhaseInfo(templateDict, d.first_obj);
    templateDict.bottom_left_4 = b.buildPerspectiveInfo(d.first_obj);
    d._setup_lunar_phase(templateDict, d.first_obj, d.geolat);
  }

  protected override setupGrids(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    const housesList = this.getHousesList(d.first_obj);
    d._setup_main_houses_grid(templateDict, housesList);
    templateDict.makeSecondaryHousesGrid = "";
    d._setup_single_wheel_houses(templateDict, housesList);
    d._setup_single_wheel_planets(templateDict);
    d._setup_main_planet_grid(templateDict, d.first_obj.name, this.t("planets_and_house", "Points for"));
    templateDict.makeSecondaryPlanetGrid = "";
  }
}

class DualReturnChartRenderer extends BaseChartRenderer {
  protected override setupCircles(templateDict: Record<string, string | number>): void {
    this.drawer._setup_transit_circles(templateDict);
  }

  protected override setupAspects(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj) {
      throw new KerykeionException("DualReturnChart requires a second subject.");
    }
    if (d.double_chart_aspect_grid_type === "list") {
      templateDict.makeAspectGrid = "";
      const title = this.t("return_aspects", "Natal to Return Aspects");
      if (d._is_right_panel_mode()) {
        const rp = d._get_right_panel_aspect_params();
        templateDict.makeDoubleChartAspectList = drawTransitAspectList(
          title,
          d.aspects_list,
          d._language_model.celestial_points,
          d.aspects_settings,
          {
            aspectsPerColumn: rp.aspects_per_column,
            columnWidth: rp.column_width,
            lineHeight: rp.line_height,
            maxColumns: 7,
            chartHeight: d.height,
            xOffset: rp.x_offset,
            yOffset: rp.y_offset,
          },
        );
      }
      else {
        templateDict.makeDoubleChartAspectList = drawTransitAspectList(
          title,
          d.aspects_list,
          d._language_model.celestial_points,
          d.aspects_settings,
          {
            maxColumns: 7,
            chartHeight: d.height,
          },
        );
      }
    }
    else {
      templateDict.makeAspectGrid = "";
      if (d._is_right_panel_mode()) {
        const rp = d._get_right_panel_aspect_params();
        const nActive = Math.max(d._count_active_planets(), 1);
        const gridTotalHeight = (nActive + 1) * 14;
        const targetTop = (d._vertical_offsets.title ?? 0) + 20;
        const gridY = Math.trunc(targetTop - d._vertical_offsets.aspect_list + gridTotalHeight);
        templateDict.makeDoubleChartAspectList = drawTransitAspectGrid(
          d.chart_colors_settings.paper_0,
          d.available_planets_setting,
          d.aspects_list,
          rp.x_offset,
          gridY,
        );
      }
      else {
        templateDict.makeDoubleChartAspectList = drawTransitAspectGrid(
          d.chart_colors_settings.paper_0,
          d.available_planets_setting,
          d.aspects_list,
          550,
          450,
        );
      }
    }
    templateDict.makeAspects = d._draw_all_aspects_lines(d.main_radius, d.main_radius - 160);
  }

  protected override setupInfoSections(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj) {
      throw new KerykeionException("DualReturnChart requires a second subject.");
    }
    const b = new InfoSectionBuilder(d);
    const [lat, lon] = b.buildLocationCoordinates(d.first_obj.lat ?? 0, d.first_obj.lng ?? 0);
    const [returnLat, returnLon] = b.buildLocationCoordinates(d.second_obj.lat ?? 0, d.second_obj.lng ?? 0);
    templateDict.top_left_0
      = isPlanetReturn(d.second_obj) && d.second_obj.return_type === "Solar"
        ? `${this.t("solar_return", "Solar Return")}:`
        : `${this.t("lunar_return", "Lunar Return")}:`;
    templateDict.top_left_1 = formatDatetimeWithTimezone(d.second_obj.iso_formatted_local_datetime ?? "");
    templateDict.top_left_2 = `${returnLat} / ${returnLon}`;
    templateDict.top_left_3 = d.first_obj.name;
    templateDict.top_left_4 = formatDatetimeWithTimezone(d.first_obj.iso_formatted_local_datetime ?? "");
    templateDict.top_left_5 = `${lat} / ${lon}`;
    templateDict.bottom_left_0 = b.buildZodiacInfo();
    templateDict.bottom_left_1 = b.buildDomificationInfo();
    b.buildLunarPhaseInfo(templateDict, d.first_obj);
    templateDict.bottom_left_4 = b.buildPerspectiveInfo(d.first_obj);
    d._setup_lunar_phase(templateDict, d.first_obj, d.geolat);
  }

  protected override setupGrids(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj) {
      throw new KerykeionException("DualReturnChart requires a second subject.");
    }
    const firstHouses = this.getHousesList(d.first_obj);
    const secondHouses = this.getHousesList(d.second_obj);
    d._setup_main_houses_grid(templateDict, firstHouses);
    d._setup_secondary_houses_grid(templateDict, secondHouses);
    d._setup_dual_wheel_houses(templateDict, firstHouses, secondHouses);
    d._setup_dual_wheel_planets(templateDict);

    const firstLabel = d._truncate_name(d.first_obj.name);
    const secondLabel
      = isPlanetReturn(d.second_obj) && d.second_obj.return_type === "Solar"
        ? this.t("solar_return", "Solar Return")
        : this.t("lunar_return", "Lunar Return");

    templateDict.makeMainPlanetGrid = drawMainPlanetGrid(
      "",
      `${firstLabel} (${this.t("inner_wheel", "Inner Wheel")})`,
      d.available_kerykeion_celestial_points,
      d.chart_type,
      d._language_model.celestial_points,
      d.chart_colors_settings.paper_0,
    );
    templateDict.makeSecondaryPlanetGrid = drawSecondaryPlanetGrid(
      "",
      `${secondLabel} (${this.t("outer_wheel", "Outer Wheel")})`,
      d.second_subject_celestial_points,
      d.chart_type,
      d._language_model.celestial_points,
      d.chart_colors_settings.paper_0,
    );
  }

  protected override setupHouseComparison(templateDict: Record<string, string | number>): void {
    const d = this.drawer;
    if (!d.second_obj || (!d.show_house_position_comparison && !d.show_cusp_position_comparison)) {
      templateDict.makeHouseComparisonGrid = "";
      return;
    }
    const houseComparison = new HouseComparisonFactory(
      d.first_obj as AstrologicalSubjectModel | PlanetReturnModel,
      d.second_obj,
      d.active_points,
    ).getHouseComparison();
    const firstLabel = this.t("Natal", "Natal");
    const returnLabelText = this.t("Return", "Return");
    const pointLabel = this.t("point", "Point");
    let svg = "";
    if (d.show_house_position_comparison) {
      svg += drawHouseComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        d.active_points,
        {
          pointsOwnerSubjectNumber: 1,
          housePositionComparisonLabel: this.t("house_position_comparison", "House Position Comparison"),
          returnPointLabel: `${firstLabel} ${pointLabel}`,
          returnLabel: firstLabel,
          radixLabel: returnLabelText,
          xPosition: 1090,
        },
      );
      svg += drawHouseComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        d.active_points,
        {
          pointsOwnerSubjectNumber: 2,
          housePositionComparisonLabel: "",
          returnPointLabel: pointLabel,
          returnLabel: returnLabelText,
          radixLabel: firstLabel,
          xPosition: 1290,
        },
      );
    }
    if (d.show_cusp_position_comparison) {
      let firstCuspX = 1090;
      let secondCuspX = 1290;
      if (d.show_house_position_comparison) {
        const firstGridWidth = d._estimate_house_comparison_grid_width({
          column_labels: [`${firstLabel} ${pointLabel}`, firstLabel, returnLabelText],
          include_radix_column: true,
          include_title: true,
        });
        const secondGridWidth = d._estimate_house_comparison_grid_width({
          column_labels: [`${returnLabelText} ${pointLabel}`, returnLabelText, firstLabel],
          include_radix_column: true,
          include_title: false,
        });
        const cuspX = Math.trunc(Math.max(1000 + firstGridWidth, 1190 + secondGridWidth) + 50);
        firstCuspX = cuspX;
        secondCuspX = cuspX + 160;
      }
      svg += drawCuspComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        {
          cuspsOwnerSubjectNumber: 1,
          cuspPositionComparisonLabel: this.t("cusp_position_comparison", "Cusp Position Comparison"),
          ownerCuspLabel: `${firstLabel} ${this.t("cusp", "Cusp")}`,
          projectedHouseLabel: `${this.t("Return", "Return")} ${this.t("house", "House")}`,
          xPosition: firstCuspX,
        },
      );
      svg += drawCuspComparisonGrid(
        houseComparison,
        d._language_model.celestial_points,
        {
          cuspsOwnerSubjectNumber: 2,
          cuspPositionComparisonLabel: "",
          ownerCuspLabel: this.t("return_cusp", "Return Cusp"),
          projectedHouseLabel: `${firstLabel} ${this.t("house", "House")}`,
          xPosition: secondCuspX,
        },
      );
    }
    templateDict.makeHouseComparisonGrid = svg;
  }
}

const CHART_RENDERERS: Record<ChartType, new (drawer: ChartDrawer) => BaseChartRenderer> = {
  Natal: NatalChartRenderer,
  Composite: CompositeChartRenderer,
  Transit: TransitChartRenderer,
  Synastry: SynastryChartRenderer,
  SingleReturnChart: SingleReturnChartRenderer,
  DualReturnChart: DualReturnChartRenderer,
};

export class ChartDrawer {
  first_obj!: FirstSubjectType;
  second_obj!: SecondSubjectType;
  chart_type!: ChartType;
  active_points!: AstrologicalPoint[];
  active_aspects!: ActiveAspect[];

  theme: KerykeionChartTheme | null;
  double_chart_aspect_grid_type: "list" | "table";
  chart_language: KerykeionChartLanguage;
  transparent_background: boolean;
  external_view: boolean;
  show_house_position_comparison: boolean;
  show_cusp_position_comparison: boolean;
  show_degree_indicators: boolean;
  show_aspect_icons: boolean;
  custom_title: string | null;
  auto_size: boolean;
  chart_data!: ChartDataModel;
  chart_colors_settings: typeof DEFAULT_CHART_COLORS;
  planets_settings: KerykeionSettingsCelestialPointModel[];
  aspects_settings: ChartAspectSetting[];
  available_planets_setting!: KerykeionSettingsCelestialPointModel[];
  available_kerykeion_celestial_points!: KerykeionPointModel[];
  second_subject_celestial_points: KerykeionPointModel[] = [];
  aspects_list!: AspectModel[];
  main_radius: number = DEFAULT_RADII.main_radius;
  first_circle_radius: number = DEFAULT_RADII.single_wheel_first;
  second_circle_radius: number = DEFAULT_RADII.single_wheel_second;
  third_circle_radius: number = DEFAULT_RADII.single_wheel_third;
  height: number = DEFAULT_DIMENSIONS.default_height;
  width: number = DEFAULT_DIMENSIONS.natal_width;
  location = "";
  geolat = 0;
  geolon = 0;
  fire = 0;
  earth = 0;
  air = 0;
  water = 0;
  cardinal = 0;
  fixed = 0;
  mutable = 0;
  color_style_tag = "";
  language_settings: Record<string, unknown> = {};
  template = "";
  _grid_x_shift: number = 0;
  _padding: number = 20;
  _style: KerykeionChartStyle;
  _show_zodiac_background_ring: boolean;
  _vertical_offsets: typeof DEFAULT_VERTICAL_OFFSETS = { ...DEFAULT_VERTICAL_OFFSETS };
  _language_model!: KerykeionLanguageModel;
  _fallback_language_model!: KerykeionLanguageModel;
  _language_dict!: Record<string, unknown>;
  _fallback_language_dict!: Record<string, unknown>;

  constructor(
    chartData: ChartDataModel,
    options: {
      theme?: KerykeionChartTheme | null;
      double_chart_aspect_grid_type?: "list" | "table";
      chart_language?: KerykeionChartLanguage;
      language_pack?: Record<string, unknown> | null;
      external_view?: boolean;
      transparent_background?: boolean;
      colors_settings?: typeof DEFAULT_CHART_COLORS;
      celestial_points_settings?: KerykeionSettingsCelestialPointModel[];
      aspects_settings?: ChartAspectSetting[];
      custom_title?: string | null;
      show_house_position_comparison?: boolean;
      show_cusp_position_comparison?: boolean;
      auto_size?: boolean;
      padding?: number;
      show_degree_indicators?: boolean;
      show_aspect_icons?: boolean;
      style?: KerykeionChartStyle;
      show_zodiac_background_ring?: boolean;
    } = {},
  ) {
    this.theme = options.theme ?? "classic";
    this.double_chart_aspect_grid_type = options.double_chart_aspect_grid_type ?? "list";
    this.chart_language = options.chart_language ?? "EN";
    this.transparent_background = options.transparent_background ?? false;
    this.external_view = options.external_view ?? false;
    this.chart_colors_settings = deepClone(options.colors_settings ?? DEFAULT_CHART_COLORS);
    this.planets_settings = (options.celestial_points_settings ?? DEFAULT_CELESTIAL_POINTS_SETTINGS).map(body => ({
      ...body,
    }));
    this.aspects_settings = (options.aspects_settings ?? DEFAULT_CHART_ASPECTS_SETTINGS).map(aspect => ({
      ...aspect,
    }));
    this.custom_title = options.custom_title ?? null;
    this.show_house_position_comparison = options.show_house_position_comparison ?? true;
    this.show_cusp_position_comparison = options.show_cusp_position_comparison ?? false;
    this.show_degree_indicators = options.show_degree_indicators ?? true;
    this.show_aspect_icons = options.show_aspect_icons ?? true;
    this.auto_size = options.auto_size ?? true;
    this._padding = options.padding ?? 20;
    this._style = options.style ?? "classic";
    this._show_zodiac_background_ring = options.show_zodiac_background_ring ?? true;
    this._validate_chart_style(this._style);

    this._extract_chart_data(chartData);
    this._load_language_settings(options.language_pack ?? null);
    this._configure_active_celestial_points();
    this._configure_dimensions_and_geometry(chartData);
    this._extract_element_quality_distributions(chartData);
    if (this.theme != null && !["light", "dark", "dark-high-contrast", "classic", "strawberry", "black-and-white"].includes(this.theme)) {
      throw new KerykeionException(`Theme ${this.theme} is not available. Set None for default theme.`);
    }
    this.set_up_theme(this.theme);
    this._apply_dynamic_height_adjustment();
    this._adjust_height_for_extended_aspect_columns();
    if (this.auto_size) {
      this._update_width_to_content();
    }
  }

  private _extract_chart_data(chartData: ChartDataModel): void {
    this.chart_data = chartData;
    this.chart_type = chartData.chart_type;
    this.active_points = chartData.active_points;
    this.active_aspects = chartData.active_aspects;
    if (chartData.chart_type === "Natal" || chartData.chart_type === "Composite" || chartData.chart_type === "SingleReturnChart") {
      this.first_obj = (chartData).subject;
      this.second_obj = null;
    }
    else {
      this.first_obj = (chartData as DualChartDataModel).first_subject;
      this.second_obj = (chartData as DualChartDataModel).second_subject;
    }
  }

  private _configure_active_celestial_points(): void {
    this.available_planets_setting = [];
    for (const body of this.planets_settings) {
      if (this.active_points.includes(body.name as AstrologicalPoint)) {
        body.is_active = true;
        this.available_planets_setting.push(body);
      }
    }
    const availablePointNames = this.available_planets_setting.map(body => String(body.name).toLowerCase());
    this.available_kerykeion_celestial_points = this._collect_subject_points(this.first_obj, availablePointNames);
    if (this.second_obj) {
      this.second_subject_celestial_points = this._collect_subject_points(this.second_obj, availablePointNames);
    }
  }

  private _configure_dimensions_and_geometry(chartData: ChartDataModel): void {
    this.aspects_list = chartData.aspects;
    [this.location, this.geolat, this.geolon] = this._get_location_info();
    this.width = this._get_chart_width();
    this._setup_circle_radii();
    this._grid_x_shift = this.auto_size ? this._calculate_grid_x_shift() : 0;
    this._apply_house_comparison_width_override();
  }

  private _extract_element_quality_distributions(chartData: ChartDataModel): void {
    this.fire = chartData.element_distribution.fire;
    this.earth = chartData.element_distribution.earth;
    this.air = chartData.element_distribution.air;
    this.water = chartData.element_distribution.water;
    this.cardinal = chartData.quality_distribution.cardinal;
    this.fixed = chartData.quality_distribution.fixed;
    this.mutable = chartData.quality_distribution.mutable;
  }

  private _collect_subject_points(
    subject: FirstSubjectType | Exclude<SecondSubjectType, null>,
    pointAttributeNames: string[],
  ): KerykeionPointModel[] {
    const subjectRecord = subject as unknown as Record<string, unknown>;
    const collected: KerykeionPointModel[] = [];
    for (const rawName of pointAttributeNames) {
      const attrName = rawName in subjectRecord ? rawName : rawName.toLowerCase();
      const point = subjectRecord[attrName];
      if (point) {
        collected.push(point as KerykeionPointModel);
      }
    }
    return collected;
  }

  private _get_chart_width(): number {
    if (this.chart_type === "Transit") {
      return this.double_chart_aspect_grid_type === "table"
        ? DEFAULT_DIMENSIONS.full_width_with_table
        : DEFAULT_DIMENSIONS.full_width;
    }
    const widthMap: Record<string, number> = {
      Natal: DEFAULT_DIMENSIONS.natal_width,
      Composite: DEFAULT_DIMENSIONS.natal_width,
      SingleReturnChart: DEFAULT_DIMENSIONS.natal_width,
      Synastry: DEFAULT_DIMENSIONS.synastry_width,
      DualReturnChart: DEFAULT_DIMENSIONS.ultra_wide_width,
    };
    return widthMap[this.chart_type] ?? DEFAULT_DIMENSIONS.full_width;
  }

  private _setup_circle_radii(): void {
    if (this.chart_type === "Natal" && this.external_view) {
      this.first_circle_radius = DEFAULT_RADII.external_view_first;
      this.second_circle_radius = DEFAULT_RADII.external_view_second;
      this.third_circle_radius = DEFAULT_RADII.external_view_third;
    }
    else {
      this.first_circle_radius = DEFAULT_RADII.single_wheel_first;
      this.second_circle_radius = DEFAULT_RADII.single_wheel_second;
      this.third_circle_radius = DEFAULT_RADII.single_wheel_third;
    }
  }

  _count_active_planets(): number {
    return this.available_planets_setting.filter(planet => planet.is_active).length;
  }

  _is_right_panel_mode(): boolean {
    return (
      (this.chart_type === "Synastry" || this.chart_type === "Transit" || this.chart_type === "DualReturnChart")
      && this._count_active_planets() > 24
    );
  }

  private _calculate_grid_x_shift(): number {
    if (this.chart_type === "Synastry" || this.chart_type === "Transit" || this.chart_type === "DualReturnChart") {
      return 0;
    }
    const n = this._count_active_planets();
    if (n <= SECOND_COLUMN_THRESHOLD) {
      return 0;
    }
    const thresholds = this._select_planet_grid_thresholds(this.chart_type, n);
    let numCols = 4;
    if (n <= thresholds[0]) {
      numCols = 1;
    }
    else if (n <= thresholds[1]) {
      numCols = 2;
    }
    else if (n <= thresholds[2]) {
      numCols = 3;
    }
    if (numCols <= 1) {
      return 0;
    }
    const wheelRight = 100 + 2 * this.main_radius;
    const leftmostX = 645 - (numCols - 1) * GRID_COLUMN_WIDTH;
    return Math.max(0, Math.trunc(wheelRight + 20 - leftmostX));
  }

  private _select_planet_grid_thresholds(chartType: ChartType, numPoints: number): [number, number, number] {
    if (chartType === "Synastry" || chartType === "Transit" || chartType === "DualReturnChart") {
      return [1_000_000, 1_000_008, 1_000_016];
    }
    if (numPoints <= SECOND_COLUMN_THRESHOLD) {
      return [20, 28, 36];
    }
    const maxRows = 20;
    const numColumns = Math.min(4, Math.max(1, Math.ceil(numPoints / maxRows)));
    const rowsPerCol = Math.ceil(numPoints / numColumns);
    return [rowsPerCol, rowsPerCol * 2, rowsPerCol * 3];
  }

  private _apply_house_comparison_width_override(): void {
    if (this.show_house_position_comparison || this.show_cusp_position_comparison) {
      return;
    }
    if (this.chart_type === "Synastry") {
      this.width = DEFAULT_DIMENSIONS.full_width;
    }
    else if (this.chart_type === "Transit" || this.chart_type === "DualReturnChart") {
      this.width
        = this.double_chart_aspect_grid_type === "table"
          ? DEFAULT_DIMENSIONS.full_width_with_table
          : DEFAULT_DIMENSIONS.full_width;
    }
  }

  private _get_location_info(): [string, number, number] {
    if (this.chart_type === "Composite" && "first_subject" in this.first_obj && "second_subject" in this.first_obj) {
      return [
        "",
        (this.first_obj.first_subject.lat + this.first_obj.second_subject.lat) / 2,
        (this.first_obj.first_subject.lng + this.first_obj.second_subject.lng) / 2,
      ];
    }
    if ((this.chart_type === "Transit" || this.chart_type === "DualReturnChart") && this.second_obj) {
      return [this.second_obj.city ?? "", this.second_obj.lat ?? 0, this.second_obj.lng ?? 0];
    }
    return [this.first_obj.city ?? "", this.first_obj.lat ?? 0, this.first_obj.lng ?? 0];
  }

  private _apply_dynamic_height_adjustment(): void {
    const activePointsCount = this._count_active_planets();
    const offsets = { ...DEFAULT_VERTICAL_OFFSETS };
    const minimumHeight = DEFAULT_DIMENSIONS.default_height;

    if (this.chart_type === "Synastry" || this.chart_type === "Transit" || this.chart_type === "DualReturnChart") {
      this._apply_synastry_height_adjustment(activePointsCount, offsets, minimumHeight);
      return;
    }

    if (activePointsCount <= 20) {
      this.height = Math.max(this.height, minimumHeight);
      this._vertical_offsets = offsets;
      return;
    }

    const extraPoints = activePointsCount - 20;
    const extraHeight = extraPoints * 8;
    this.height = Math.max(this.height, minimumHeight + extraHeight);
    const deltaHeight = this.height - minimumHeight;
    const shift = Math.min(extraPoints * 2, 80);
    const topShift = Math.floor(shift / 2);

    offsets.grid += shift;
    offsets.title += topShift;
    offsets.elements += topShift;
    offsets.qualities += topShift;
    offsets.wheel += deltaHeight;
    offsets.aspect_grid += deltaHeight;
    offsets.lunar_phase += deltaHeight;
    offsets.bottom_left += deltaHeight;
    if (!this._is_right_panel_mode()) {
      offsets.aspect_list += deltaHeight;
    }
    this._vertical_offsets = offsets;
  }

  private _apply_synastry_height_adjustment(
    activePointsCount: number,
    offsets: typeof DEFAULT_VERTICAL_OFFSETS,
    minimumHeight: number,
  ): void {
    const baseRows = 14;
    const extraRows = Math.max(activePointsCount - baseRows, 0);
    const synastryRowHeight = 15;
    const comparisonPaddingPerRow = 4;

    offsets.title = -10;
    const rowHeightRatio = synastryRowHeight / 8;
    const topShiftFactor = Math.max(2, Math.ceil(2 * rowHeightRatio));
    const shift = Math.min(extraRows * topShiftFactor, 80);
    const baseGridPadding = 36;
    const gridPaddingPerRow = 6;
    const baseHeaderPadding = 12;
    const headerPaddingPerRow = 4;
    const minTitleToGridGap = 36;

    let gridShift = shift + baseGridPadding + extraRows * gridPaddingPerRow;
    gridShift = Math.min(gridShift, shift + 80);
    let topShift = Math.floor(shift / 2) + baseHeaderPadding + extraRows * headerPaddingPerRow;
    const missingGap = minTitleToGridGap - (gridShift - topShift);
    gridShift = Math.min(gridShift + missingGap, shift + 80);
    if (gridShift - topShift < minTitleToGridGap) {
      topShift = Math.max(0, gridShift - minTitleToGridGap);
    }

    offsets.grid += gridShift;
    offsets.title += topShift;
    offsets.elements += topShift;
    offsets.qualities += topShift;

    if (this._is_right_panel_mode()) {
      const gridContentBottom = offsets.grid + activePointsCount * synastryRowHeight + 50;
      const wheelDiameter = 2 * this.main_radius + 30;
      const wheelOffset = Math.max(50.0, gridContentBottom - wheelDiameter);
      offsets.wheel = wheelOffset;
      offsets.aspect_grid = wheelOffset;
      const contentBottom = Math.max(gridContentBottom, wheelOffset + wheelDiameter);
      this.height = Math.max(this.height, Math.trunc(contentBottom + 40));
      const delta = Math.max(this.height - minimumHeight, 0);
      offsets.lunar_phase = 518 + delta;
      offsets.bottom_left = delta;
      this._vertical_offsets = offsets;
      return;
    }

    const extraHeight = extraRows * (synastryRowHeight + comparisonPaddingPerRow);
    this.height = Math.max(this.height, minimumHeight + extraHeight);
    const deltaHeight = this.height - minimumHeight;
    offsets.wheel += deltaHeight;
    offsets.aspect_grid += deltaHeight;
    offsets.lunar_phase += deltaHeight;
    offsets.bottom_left += deltaHeight;
    offsets.aspect_list += deltaHeight;
    this._vertical_offsets = offsets;
  }

  private _adjust_height_for_extended_aspect_columns(): void {
    if (
      this.double_chart_aspect_grid_type !== "list"
      || !(this.chart_type === "Synastry" || this.chart_type === "Transit" || this.chart_type === "DualReturnChart")
      || this._is_right_panel_mode()
      || this.aspects_list.length === 0
    ) {
      return;
    }

    const perColumn = 14;
    const extendedColumnStart = 11;
    const baseCapacity = perColumn * extendedColumnStart;
    if (this.aspects_list.length <= baseCapacity) {
      return;
    }

    const translateY = 273;
    const bottomPadding = 40;
    const titleClearance = 18;
    const lineHeight = 14;
    const baselineIndex = perColumn - 1;
    const topLimitIndex = Math.ceil((-translateY + titleClearance) / lineHeight);
    const maxCapacityByTop = baselineIndex - topLimitIndex + 1;
    if (maxCapacityByTop <= perColumn) {
      return;
    }
    const requiredHeight = translateY + bottomPadding + maxCapacityByTop * lineHeight;
    if (requiredHeight <= this.height) {
      return;
    }
    const delta = requiredHeight - this.height;
    this.height = requiredHeight;
    this._vertical_offsets.wheel += delta;
    this._vertical_offsets.aspect_grid += delta;
    this._vertical_offsets.aspect_list += delta;
    this._vertical_offsets.lunar_phase += delta;
    this._vertical_offsets.bottom_left += delta;
  }

  _estimate_house_comparison_grid_width(options: {
    column_labels: string[];
    include_radix_column: boolean;
    include_title: boolean;
    minimum_width?: number;
  }): number {
    const minimumWidth = options.minimum_width ?? 250;
    const activeNames = this._get_active_point_display_names();
    const maxNameWidth = Math.max(
      ...activeNames.map(name => this._estimate_text_width(name, 10)),
      this._estimate_text_width("Sun", 10),
    );
    const widths: number[] = [15 + maxNameWidth];
    const valueOffsets = options.include_radix_column ? [90, 140] : [90];
    const maxValueWidth = Math.max(
      this._estimate_text_width("12", 10),
      this._estimate_text_width("-", 10),
      this._estimate_text_width("0", 10),
    );
    for (const offset of valueOffsets) {
      widths.push(offset + maxValueWidth);
    }
    const headerOffsets = options.include_radix_column ? [0, 77, 132] : [0, 77];
    headerOffsets.forEach((offset, index) => {
      const label = options.column_labels[index];
      if (label) {
        widths.push(offset + this._estimate_text_width(label, 10));
      }
    });
    if (options.include_title) {
      widths.push(this._estimate_text_width(this._translate("house_position_comparison", "House Position Comparison") as string, 14));
    }
    return Math.trunc(Math.max(...widths, minimumWidth));
  }

  private _estimate_text_width(text: string, fontSize = 12): number {
    if (!text) {
      return 0;
    }
    return Math.max(fontSize, text.length * fontSize * 0.7);
  }

  private _get_active_point_display_names(): string[] {
    const languageMap = this._language_model.celestial_points as Record<string, string>;
    const fallbackMap = this._fallback_language_model.celestial_points as Record<string, string>;
    return this.active_points.map(point => languageMap[point] ?? fallbackMap[point] ?? point);
  }

  private _estimate_left_content_right_edge(): number {
    const extents: number[] = [100 + 2 * this.main_radius, 645 + this._grid_x_shift + 80, 750 + this._grid_x_shift + 120];
    if (this.chart_type === "Transit" || this.chart_type === "Synastry" || this.chart_type === "DualReturnChart") {
      extents.push(910 + 80);
    }
    if (this.chart_type === "Synastry" && this.second_obj) {
      extents.push(1015 + 120);
      if (this.show_house_position_comparison || this.show_cusp_position_comparison) {
        const pointLabel = this._translate("point", "Point") as string;
        const firstLabel = this._truncate_name(this.first_obj.name, 8, "…", true);
        const secondLabel = this._truncate_name(this.second_obj.name, 8, "…", true);
        const firstGridWidth = this._estimate_house_comparison_grid_width({
          column_labels: [`${firstLabel} ${pointLabel}`, firstLabel, secondLabel],
          include_radix_column: true,
          include_title: true,
        });
        const secondGridWidth = this._estimate_house_comparison_grid_width({
          column_labels: [`${secondLabel} ${pointLabel}`, secondLabel, firstLabel],
          include_radix_column: true,
          include_title: false,
        });
        extents.push(1090 + firstGridWidth, 1290 + secondGridWidth);
        if (this.show_cusp_position_comparison) {
          extents.push(Math.max(1090 + firstGridWidth, 1290 + secondGridWidth) + 50 + 320 + 45);
        }
      }
    }
    if (this.chart_type === "Transit" && (this.show_house_position_comparison || this.show_cusp_position_comparison)) {
      const transitGridWidth = this._estimate_house_comparison_grid_width({
        column_labels: [
          this._translate("transit_point", "Transit Point") as string,
          this._translate("house_position", "Natal House") as string,
        ],
        include_radix_column: false,
        include_title: true,
        minimum_width: 170,
      });
      const houseRight = 980 + transitGridWidth;
      if (this.show_house_position_comparison) {
        extents.push(houseRight);
      }
      if (this.show_cusp_position_comparison) {
        extents.push(this.show_house_position_comparison ? houseRight + 40 + 260 : houseRight);
      }
    }
    if (this.chart_type === "DualReturnChart" && this.second_obj && (this.show_house_position_comparison || this.show_cusp_position_comparison)) {
      const firstLabel = this._translate("Natal", "Natal") as string;
      const secondLabel
        = isPlanetReturn(this.second_obj) && this.second_obj.return_type === "Solar"
          ? (this._translate("solar_return", "Solar Return") as string)
          : (this._translate("lunar_return", "Lunar Return") as string);
      const pointLabel = this._translate("point", "Point") as string;
      const firstGridWidth = this._estimate_house_comparison_grid_width({
        column_labels: [`${firstLabel} ${pointLabel}`, firstLabel, secondLabel],
        include_radix_column: true,
        include_title: true,
      });
      const secondGridWidth = this._estimate_house_comparison_grid_width({
        column_labels: [`${secondLabel} ${pointLabel}`, secondLabel, firstLabel],
        include_radix_column: true,
        include_title: false,
      });
      extents.push(1090 + firstGridWidth, 1290 + secondGridWidth);
      if (this.show_cusp_position_comparison) {
        extents.push(Math.max(1090 + firstGridWidth, 1290 + secondGridWidth) + 50 + 320 + 45);
      }
    }
    return Math.max(...extents);
  }

  _get_right_panel_aspect_params(): {
    x_offset: number;
    y_offset: number;
    aspects_per_column: number;
    line_height: number;
    column_width: number;
  } {
    const leftEdge = this._estimate_left_content_right_edge();
    const xOffset = Math.trunc(leftEdge - 50 + 30);
    const targetTitleY = this._vertical_offsets.title + 18;
    const yOffset = Math.trunc(targetTitleY + 15 - this._vertical_offsets.aspect_list);
    const lineHeight = this.height < 1000 ? 12 : 14;
    const columnWidth = this.height < 1000 ? 85 : 100;
    const usableHeight = this.height - 40 - targetTitleY;
    return {
      x_offset: xOffset,
      y_offset: yOffset,
      aspects_per_column: Math.max(14, Math.trunc(usableHeight / lineHeight)),
      line_height: lineHeight,
      column_width: columnWidth,
    };
  }

  private _calculate_full_height_column_capacity(chartHeight?: number): number {
    const perColumn = 14;
    if (chartHeight == null) {
      return perColumn;
    }
    const translateY = 273;
    const bottomPadding = 40;
    const titleClearance = 18;
    const lineHeight = 14;
    const baselineIndex = perColumn - 1;
    const topLimitIndex = Math.ceil((-translateY + titleClearance) / lineHeight);
    const maxCapacityByTop = baselineIndex - topLimitIndex + 1;
    const availableHeight = Math.max(chartHeight - translateY - bottomPadding, lineHeight);
    const allowedCapacity = Math.max(perColumn, Math.trunc(availableHeight / lineHeight));
    return Math.max(perColumn, Math.min(allowedCapacity, maxCapacityByTop));
  }

  private _calculate_double_chart_aspect_columns(totalAspects: number, chartHeight?: number): number {
    if (totalAspects <= 0) {
      return 0;
    }
    const perColumn = 14;
    const extendedStart = 10;
    const baseCapacity = perColumn * extendedStart;
    const tallCapacity = this._calculate_full_height_column_capacity(chartHeight);
    if (totalAspects <= baseCapacity) {
      return Math.ceil(totalAspects / perColumn);
    }
    return extendedStart + Math.ceil((totalAspects - baseCapacity) / tallCapacity);
  }

  private _estimate_required_width_full(): number {
    const extents: number[] = [100 + 2 * this.main_radius, 645 + this._grid_x_shift + 80, 750 + this._grid_x_shift + 120];
    const nActive = Math.max(this._count_active_planets(), 1);
    if (this.chart_type === "Natal" || this.chart_type === "Composite" || this.chart_type === "SingleReturnChart") {
      extents.push(560 + 14 * nActive);
    }
    if (this.chart_type === "Transit" || this.chart_type === "Synastry" || this.chart_type === "DualReturnChart") {
      if (this._is_right_panel_mode()) {
        const rp = this._get_right_panel_aspect_params();
        if (this.double_chart_aspect_grid_type === "list") {
          const columns = Math.max(1, Math.ceil(this.aspects_list.length / Math.max(rp.aspects_per_column, 1)));
          extents.push(50 + rp.x_offset + columns * rp.column_width);
        }
        else {
          extents.push(50 + rp.x_offset + 14 * (nActive + 1));
        }
      }
      else if (this.double_chart_aspect_grid_type === "list") {
        const columns = Math.max(1, this._calculate_double_chart_aspect_columns(this.aspects_list.length, this.height));
        extents.push(565 + columns * 105);
      }
      else {
        extents.push(550 + 14 * (nActive + 1));
      }
      extents.push(910 + 80);
    }
    if (this.chart_type === "Synastry") {
      extents.push(1015 + 120);
      if ((this.show_house_position_comparison || this.show_cusp_position_comparison) && this.second_obj) {
        const pointLabel = this._translate("point", "Point") as string;
        const firstLabel = this._truncate_name(this.first_obj.name, 8, "…", true);
        const secondLabel = this._truncate_name(this.second_obj.name, 8, "…", true);
        const firstGridWidth = this._estimate_house_comparison_grid_width({
          column_labels: [`${firstLabel} ${pointLabel}`, firstLabel, secondLabel],
          include_radix_column: true,
          include_title: true,
        });
        const secondGridWidth = this._estimate_house_comparison_grid_width({
          column_labels: [`${secondLabel} ${pointLabel}`, secondLabel, firstLabel],
          include_radix_column: true,
          include_title: false,
        });
        const firstHouseComparisonGridRight = 1090 + firstGridWidth;
        const secondHouseComparisonGridRight = 1290 + secondGridWidth;
        extents.push(firstHouseComparisonGridRight, secondHouseComparisonGridRight);
        if (this.show_cusp_position_comparison) {
          const maxHouseComparisonRight = Math.max(firstHouseComparisonGridRight, secondHouseComparisonGridRight);
          extents.push(maxHouseComparisonRight + 50 + 320 + 45);
        }
      }
    }
    if (this.chart_type === "Transit" && (this.show_house_position_comparison || this.show_cusp_position_comparison)) {
      const transitGridWidth = this._estimate_house_comparison_grid_width({
        column_labels: [
          this._translate("transit_point", "Transit Point") as string,
          this._translate("house_position", "Natal House") as string,
        ],
        include_radix_column: false,
        include_title: true,
        minimum_width: 170,
      });
      const houseComparisonGridRight = 980 + transitGridWidth;
      if (this.show_house_position_comparison) {
        extents.push(houseComparisonGridRight);
      }
      if (this.show_cusp_position_comparison) {
        extents.push(
          this.show_house_position_comparison ? houseComparisonGridRight + 40 + 260 : houseComparisonGridRight,
        );
      }
    }
    if (this.chart_type === "DualReturnChart" && (this.show_house_position_comparison || this.show_cusp_position_comparison)) {
      const firstLabel = this._translate("Natal", "Natal") as string;
      const secondLabel
        = this.second_obj && isPlanetReturn(this.second_obj) && this.second_obj.return_type === "Solar"
          ? (this._translate("solar_return", "Solar Return") as string)
          : (this._translate("lunar_return", "Lunar Return") as string);
      const pointLabel = this._translate("point", "Point") as string;
      const firstGridWidth = this._estimate_house_comparison_grid_width({
        column_labels: [`${firstLabel} ${pointLabel}`, firstLabel, secondLabel],
        include_radix_column: true,
        include_title: true,
      });
      const secondGridWidth = this._estimate_house_comparison_grid_width({
        column_labels: [`${secondLabel} ${pointLabel}`, secondLabel, firstLabel],
        include_radix_column: true,
        include_title: false,
      });
      const firstHouseComparisonGridRight = 1090 + firstGridWidth;
      const secondHouseComparisonGridRight = 1290 + secondGridWidth;
      extents.push(firstHouseComparisonGridRight, secondHouseComparisonGridRight);
      if (this.show_cusp_position_comparison) {
        const maxHouseComparisonRight = Math.max(firstHouseComparisonGridRight, secondHouseComparisonGridRight);
        extents.push(maxHouseComparisonRight + 50 + 320 + 45);
      }
    }
    return Math.trunc(Math.max(...extents) + this._padding);
  }

  private _minimum_width_for_chart_type(): number {
    const baseline = 100 + 2 * this.main_radius + this._padding;
    if (this.chart_type === "Natal" || this.chart_type === "Composite" || this.chart_type === "SingleReturnChart") {
      return Math.max(baseline, DEFAULT_DIMENSIONS.natal_width);
    }
    if (this.chart_type === "Synastry") {
      return Math.max(baseline, Math.trunc(DEFAULT_DIMENSIONS.synastry_width / 2));
    }
    if (this.chart_type === "DualReturnChart") {
      return Math.max(baseline, Math.trunc(DEFAULT_DIMENSIONS.ultra_wide_width / 2));
    }
    if (this.chart_type === "Transit") {
      return Math.max(baseline, 450);
    }
    return Math.max(baseline, DEFAULT_DIMENSIONS.natal_width);
  }

  private _update_width_to_content(): void {
    try {
      this.width = Math.max(this._estimate_required_width_full(), this._minimum_width_for_chart_type());
    }
    catch {
      // Keep defaults if auto-sizing fails.
    }
  }

  set_up_theme(theme: KerykeionChartTheme | null = null): void {
    if (theme == null) {
      this.color_style_tag = "";
      return;
    }
    this.color_style_tag = chartThemes[theme] ?? "";
  }

  private _load_language_settings(languagePack: Record<string, unknown> | null): void {
    const overrides = languagePack ? { [this.chart_language]: { ...languagePack } } : undefined;
    const languages = loadLanguageSettings(overrides);
    const fallbackData = (languages as Record<string, Record<string, unknown>>).EN;
    if (!fallbackData) {
      throw new KerykeionException("English translations are missing from LANGUAGE_SETTINGS.");
    }
    const selectedData
      = (languages as Record<string, Record<string, unknown>>)[this.chart_language] ?? fallbackData;
    this._fallback_language_model = fallbackData as unknown as KerykeionLanguageModel;
    this._language_model = selectedData as unknown as KerykeionLanguageModel;
    this._fallback_language_dict = fallbackData;
    this._language_dict = selectedData;
    this.language_settings = this._language_dict;
  }

  _translate(key: string, defaultValue: unknown): unknown {
    const fallbackValue = getTranslations(key, defaultValue, {
      language_dict: this._fallback_language_dict,
    });
    return getTranslations(key, fallbackValue, {
      language_dict: this._language_dict,
    });
  }

  _get_zodiac_info(): string {
    if (this.first_obj.zodiac_type === "Tropical") {
      return `${this._translate("zodiac", "Zodiac")}: ${this._translate("tropical", "Tropical")}`;
    }
    const modeName = this.first_obj.sidereal_mode ? (SIDEREAL_MODE_NAMES[this.first_obj.sidereal_mode] ?? this.first_obj.sidereal_mode) : "";
    return `${this._translate("ayanamsa", "Ayanamsa")}: ${modeName}`;
  }

  _setup_radix_circles(templateDict: Record<string, string | number>): void {
    templateDict.transitRing = "";
    templateDict.degreeRing = drawDegreeRing(
      this.main_radius,
      this.first_circle_radius,
      this.first_obj.seventh_house.abs_pos,
      this.chart_colors_settings.paper_0,
    );
    templateDict.background_circle = drawBackgroundCircle(
      this.main_radius,
      this.chart_colors_settings.paper_1,
      this.chart_colors_settings.paper_1,
    );
    templateDict.first_circle = drawFirstCircle(
      this.main_radius,
      this.chart_colors_settings.zodiac_radix_ring_2,
      this.chart_type,
      this.first_circle_radius,
    );
    templateDict.second_circle = drawSecondCircle(
      this.main_radius,
      this.chart_colors_settings.zodiac_radix_ring_1,
      this.chart_colors_settings.paper_1,
      this.chart_type,
      this.second_circle_radius,
    );
    templateDict.third_circle = drawThirdCircle(
      this.main_radius,
      this.chart_colors_settings.zodiac_radix_ring_0,
      this.chart_colors_settings.paper_1,
      this.chart_type,
      this.third_circle_radius,
    );
  }

  _setup_transit_circles(templateDict: Record<string, string | number>): void {
    templateDict.transitRing = drawTransitRing(
      this.main_radius,
      this.chart_colors_settings.paper_1,
      this.chart_colors_settings.zodiac_transit_ring_3,
    );
    templateDict.degreeRing = drawTransitRingDegreeSteps(this.main_radius, this.first_obj.seventh_house.abs_pos);
    templateDict.background_circle = drawBackgroundCircle(
      this.main_radius,
      this.chart_colors_settings.paper_1,
      this.chart_colors_settings.paper_1,
    );
    templateDict.first_circle = drawFirstCircle(this.main_radius, this.chart_colors_settings.zodiac_transit_ring_2, this.chart_type);
    templateDict.second_circle = drawSecondCircle(
      this.main_radius,
      this.chart_colors_settings.zodiac_transit_ring_1,
      this.chart_colors_settings.paper_1,
      this.chart_type,
    );
    templateDict.third_circle = drawThirdCircle(
      this.main_radius,
      this.chart_colors_settings.zodiac_transit_ring_0,
      this.chart_colors_settings.paper_1,
      this.chart_type,
      this.third_circle_radius,
    );
  }

  _setup_single_chart_aspects(templateDict: Record<string, string | number>): void {
    templateDict.makeDoubleChartAspectList = "";
    templateDict.makeAspectGrid = drawAspectGrid(
      this.chart_colors_settings.paper_0,
      this.available_planets_setting,
      this.aspects_list,
    );
    templateDict.makeAspects = this._draw_all_aspects_lines(this.main_radius, this.main_radius - this.third_circle_radius);
  }

  _setup_single_wheel_houses(templateDict: Record<string, string | number>, housesList: KerykeionPointModel[]): void {
    templateDict.makeHouses = drawHousesCuspsAndTextNumber(
      this.main_radius,
      housesList,
      this.chart_colors_settings.houses_radix_line,
      this.planets_settings[12]!.color,
      this.planets_settings[13]!.color,
      this.planets_settings[14]!.color,
      this.planets_settings[15]!.color,
      this.first_circle_radius,
      this.third_circle_radius,
      this.chart_type,
      null,
      null,
      this.external_view,
    );
  }

  _setup_dual_wheel_houses(
    templateDict: Record<string, string | number>,
    firstHousesList: KerykeionPointModel[],
    secondHousesList: KerykeionPointModel[],
  ): void {
    templateDict.makeHouses = drawHousesCuspsAndTextNumber(
      this.main_radius,
      firstHousesList,
      this.chart_colors_settings.houses_radix_line,
      this.planets_settings[12]!.color,
      this.planets_settings[13]!.color,
      this.planets_settings[14]!.color,
      this.planets_settings[15]!.color,
      this.first_circle_radius,
      this.third_circle_radius,
      this.chart_type,
      secondHousesList,
      this.chart_colors_settings.houses_transit_line,
      this.external_view,
    );
  }

  _setup_single_wheel_planets(templateDict: Record<string, string | number>): void {
    templateDict.makePlanets = drawPlanets(
      this.main_radius,
      this.available_kerykeion_celestial_points,
      this.available_planets_setting,
      this.third_circle_radius,
      this.first_obj.first_house.abs_pos,
      this.first_obj.seventh_house.abs_pos,
      this.chart_type,
      null,
      this.external_view,
      this.first_circle_radius,
      null,
      this.show_degree_indicators,
    );
  }

  _setup_dual_wheel_planets(templateDict: Record<string, string | number>): void {
    templateDict.makePlanets = drawPlanets(
      this.main_radius,
      this.available_kerykeion_celestial_points,
      this.available_planets_setting,
      this.third_circle_radius,
      this.first_obj.first_house.abs_pos,
      this.first_obj.seventh_house.abs_pos,
      this.chart_type,
      this.second_subject_celestial_points,
      this.external_view,
      null,
      this.second_circle_radius,
      this.show_degree_indicators,
    );
  }

  _setup_lunar_phase(
    templateDict: Record<string, string | number>,
    subject: FirstSubjectType | Exclude<SecondSubjectType, null>,
    latitude: number,
  ): void {
    templateDict.makeLunarPhase = subject.lunar_phase
      ? makeLunarPhase(subject.lunar_phase.degrees_between_s_m, latitude)
      : "";
  }

  _setup_main_houses_grid(templateDict: Record<string, string | number>, housesList: KerykeionPointModel[]): void {
    templateDict.makeMainHousesGrid = drawMainHouseGrid(
      housesList,
      this._translate("cusp", "Cusp") as string,
      this.chart_colors_settings.paper_0,
      750 + this._grid_x_shift,
    );
  }

  _setup_main_planet_grid(templateDict: Record<string, string | number>, subjectName: string, title = ""): void {
    templateDict.makeMainPlanetGrid = drawMainPlanetGrid(
      title,
      subjectName,
      this.available_kerykeion_celestial_points,
      this.chart_type,
      this._language_model.celestial_points,
      this.chart_colors_settings.paper_0,
      645 + this._grid_x_shift,
    );
  }

  _setup_secondary_houses_grid(templateDict: Record<string, string | number>, housesList: KerykeionPointModel[]): void {
    templateDict.makeSecondaryHousesGrid = drawSecondaryHouseGrid(
      housesList,
      this._translate("cusp", "Cusp") as string,
      this.chart_colors_settings.paper_0,
    );
  }

  _clear_element_quality_strings(templateDict: Record<string, string | number>): void {
    templateDict.elements_string = "";
    templateDict.fire_string = "";
    templateDict.earth_string = "";
    templateDict.air_string = "";
    templateDict.water_string = "";
    templateDict.qualities_string = "";
    templateDict.cardinal_string = "";
    templateDict.fixed_string = "";
    templateDict.mutable_string = "";
  }

  _get_perspective_string(subject: FirstSubjectType | Exclude<SecondSubjectType, null>): string {
    const perspectiveKey = subject.perspective_type.toLowerCase().replaceAll(" ", "_");
    return `${this._translate("perspective_type", "Perspective")}: ${this._translate(perspectiveKey, subject.perspective_type)}`;
  }

  _get_domification_string(): string {
    const houseKey = `houses_system_${this.first_obj.houses_system_identifier}`;
    return `${this._translate("domification", "Domification")}: ${this._translate(houseKey, this.first_obj.houses_system_name)}`;
  }

  _format_houses_system_string(subject: FirstSubjectType | Exclude<SecondSubjectType, null>): string {
    const houseKey = `houses_system_${subject.houses_system_identifier}`;
    return `${this._translate(houseKey, subject.houses_system_name)} ${this._translate("houses", "Houses")}`;
  }

  _format_latitude_string(latitude: number, useAbbreviations = false): string {
    return convertLatitudeCoordinateToString(
      latitude,
      this._translate(useAbbreviations ? "north_letter" : "north", useAbbreviations ? "N" : "North") as string,
      this._translate(useAbbreviations ? "south_letter" : "south", useAbbreviations ? "S" : "South") as string,
    );
  }

  _format_longitude_string(longitude: number, useAbbreviations = false): string {
    return convertLongitudeCoordinateToString(
      longitude,
      this._translate(useAbbreviations ? "east_letter" : "east", useAbbreviations ? "E" : "East") as string,
      this._translate(useAbbreviations ? "west_letter" : "west", useAbbreviations ? "W" : "West") as string,
    );
  }

  _draw_zodiac_circle_slices(radius: number): string {
    let output = "";
    signs.forEach((sign, index) => {
      output += drawZodiacSlice(
        this.first_circle_radius,
        this.chart_type,
        this.first_obj.seventh_house.abs_pos,
        index,
        radius,
        `fill:${this.chart_colors_settings[`zodiac_bg_${index}` as keyof typeof DEFAULT_CHART_COLORS]}; fill-opacity: 0.5;`,
        sign,
      );
    });
    return output;
  }

  _draw_all_aspects_lines(radius: number, aspectRadius: number): string {
    let output = "";
    const renderedIconPositions: Array<[number, number, number]> = [];
    for (const aspect of this.aspects_list) {
      const aspectColor = this.aspects_settings.find(item => item.name === aspect.aspect)?.color;
      if (aspectColor) {
        output += drawAspectLine(
          radius,
          aspectRadius,
          aspect,
          aspectColor,
          this.first_obj.seventh_house.abs_pos,
          this.show_aspect_icons,
          renderedIconPositions,
        );
      }
    }
    return output;
  }

  _truncate_name(name: string, maxLength = 50, ellipsisSymbol = "…", truncateAtSpace = false): string {
    const value = truncateAtSpace ? name.split(" ")[0]! : name;
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}${ellipsisSymbol}`;
  }

  private _dynamic_viewbox(): string {
    return `0 -15 ${Math.trunc(this.width)} ${Math.trunc(this.height) + 30}`;
  }

  private _wheel_only_viewbox(margin = 25): string {
    const left = 100 - margin;
    const top = 50 - margin;
    const size = 2 * this.main_radius + 2 * margin;
    return `${left} ${top} ${size} ${size}`;
  }

  private _grid_only_viewbox(margin = 10): string {
    const x0 = 50;
    const y0 = 250;
    const box = 14;
    const n = Math.max(this._count_active_planets(), 1);
    const left = (this.chart_type === "Transit" || this.chart_type === "Synastry" || this.chart_type === "DualReturnChart" ? x0 - box : x0) - margin;
    const top = y0 - box * n - margin;
    const right = x0 + box * n + margin;
    const bottom = y0 + box + margin;
    return `${left} ${top} ${Math.max(1, right - left)} ${Math.max(1, bottom - top)}`;
  }

  private _get_chart_title(customTitleOverride?: string | null): string {
    if (customTitleOverride != null) {
      return customTitleOverride;
    }
    if (this.custom_title != null) {
      return this.custom_title;
    }
    if (this.chart_type === "Natal") {
      return `${this._truncate_name(this.first_obj.name)} - ${this._translate("birth_chart", "Natal")}`;
    }
    if (this.chart_type === "Composite" && "first_subject" in this.first_obj && "second_subject" in this.first_obj) {
      return `${this._translate("composite_chart", "Composite")}: ${this._truncate_name(this.first_obj.first_subject.name)} ${this._translate("and_word", "&")} ${this._truncate_name(this.first_obj.second_subject.name)}`;
    }
    if (this.chart_type === "Transit" && this.second_obj) {
      return `${this._truncate_name(this.first_obj.name)} - ${this._translate("transits", "Transits")} ${formatIsoDateOnly(this.second_obj.iso_formatted_local_datetime)}`;
    }
    if (this.chart_type === "Synastry" && this.second_obj) {
      return `${this._translate("synastry_chart", "Synastry")}: ${this._truncate_name(this.first_obj.name)} ${this._translate("and_word", "&")} ${this._truncate_name(this.second_obj.name)}`;
    }
    if (this.chart_type === "DualReturnChart" && this.second_obj) {
      return isPlanetReturn(this.second_obj) && this.second_obj.return_type === "Solar"
        ? `${this._truncate_name(this.first_obj.name)} - ${this._translate("solar_return", "Solar")} ${formatIsoDateOnly(this.second_obj.iso_formatted_local_datetime).slice(0, 4)}`
        : `${this._truncate_name(this.first_obj.name)} - ${this._translate("lunar_return", "Lunar")} ${formatIsoYearMonth(this.second_obj.iso_formatted_local_datetime)}`;
    }
    if (this.chart_type === "SingleReturnChart" && isPlanetReturn(this.first_obj)) {
      return this.first_obj.return_type === "Solar"
        ? `${this._truncate_name(this.first_obj.name)} - ${this._translate("solar_return", "Solar")} ${formatIsoDateOnly(this.first_obj.iso_formatted_local_datetime).slice(0, 4)}`
        : `${this._truncate_name(this.first_obj.name)} - ${this._translate("lunar_return", "Lunar")} ${formatIsoYearMonth(this.first_obj.iso_formatted_local_datetime)}`;
    }
    return this._truncate_name(this.first_obj.name);
  }

  private _create_template_dictionary(options: { custom_title?: string | null } = {}): ChartTemplateModel & Record<string, string | number> {
    const templateDict: Record<string, string | number> = {
      color_style_tag: this.color_style_tag,
      chart_height: this.height,
      chart_width: this.width,
      full_wheel_translate_y: this._vertical_offsets.wheel,
      houses_and_planets_translate_y: this._vertical_offsets.grid,
      aspect_grid_translate_y: this._vertical_offsets.aspect_grid,
      aspect_list_translate_y: this._vertical_offsets.aspect_list,
      title_translate_y: this._vertical_offsets.title,
      elements_translate_y: this._vertical_offsets.elements,
      qualities_translate_y: this._vertical_offsets.qualities,
      lunar_phase_translate_y: this._vertical_offsets.lunar_phase,
      bottom_left_translate_y: this._vertical_offsets.bottom_left,
      paper_color_0: this.chart_colors_settings.paper_0,
      background_color: this.transparent_background ? "transparent" : this.chart_colors_settings.paper_1,
      makeAspectGrid: "",
      makeDoubleChartAspectList: "",
      makeHouseComparisonGrid: "",
      makeMainPlanetGrid: "",
      makeMainHousesGrid: "",
      makeSecondaryPlanetGrid: "",
      makeSecondaryHousesGrid: "",
      makeLunarPhase: "",
      top_left_0: "",
      top_left_1: "",
      top_left_2: "",
      top_left_3: "",
      top_left_4: "",
      top_left_5: "",
      bottom_left_0: "",
      bottom_left_1: "",
      bottom_left_2: "",
      bottom_left_3: "",
      bottom_left_4: "",
      elements_string: "",
      fire_string: "",
      earth_string: "",
      air_string: "",
      water_string: "",
      qualities_string: "",
      cardinal_string: "",
      fixed_string: "",
      mutable_string: "",
      transitRing: "",
      degreeRing: "",
      background_circle: "",
      first_circle: "",
      second_circle: "",
      third_circle: "",
      makeAspects: "",
      makeZodiac: this._draw_zodiac_circle_slices(this.main_radius),
      makeHouses: "",
      makePlanets: "",
      stringTitle: this._get_chart_title(options.custom_title),
      viewbox: this._dynamic_viewbox(),
    };

    for (let i = 0; i < 63; i += 1) {
      templateDict[`planets_color_${i}`] = "#000000";
    }
    for (const planet of this.planets_settings) {
      templateDict[`planets_color_${planet.id}`] = planet.color;
    }
    for (let i = 0; i < 12; i += 1) {
      templateDict[`zodiac_color_${i}`] = this.chart_colors_settings[`zodiac_icon_${i}` as keyof typeof DEFAULT_CHART_COLORS];
    }
    for (const aspect of this.aspects_settings) {
      templateDict[`orb_color_${aspect.degree}`] = aspect.color;
    }

    const totalElements = this.fire + this.earth + this.air + this.water;
    const elementPercentages
      = totalElements > 0
        ? distributePercentagesTo100({
            fire: this.fire,
            earth: this.earth,
            air: this.air,
            water: this.water,
          })
        : { fire: 0, earth: 0, air: 0, water: 0 };
    templateDict.elements_string = `${this._translate("elements", "Elements")}:`;
    templateDict.fire_string = `${this._translate("fire", "Fire")} ${elementPercentages.fire}%`;
    templateDict.earth_string = `${this._translate("earth", "Earth")} ${elementPercentages.earth}%`;
    templateDict.air_string = `${this._translate("air", "Air")} ${elementPercentages.air}%`;
    templateDict.water_string = `${this._translate("water", "Water")} ${elementPercentages.water}%`;

    const totalQualities = this.cardinal + this.fixed + this.mutable;
    const qualityPercentages
      = totalQualities > 0
        ? distributePercentagesTo100({
            cardinal: this.cardinal,
            fixed: this.fixed,
            mutable: this.mutable,
          })
        : { cardinal: 0, fixed: 0, mutable: 0 };
    templateDict.qualities_string = `${this._translate("qualities", "Qualities")}:`;
    templateDict.cardinal_string = `${this._translate("cardinal", "Cardinal")} ${qualityPercentages.cardinal}%`;
    templateDict.fixed_string = `${this._translate("fixed", "Fixed")} ${qualityPercentages.fixed}%`;
    templateDict.mutable_string = `${this._translate("mutable", "Mutable")} ${qualityPercentages.mutable}%`;

    const Renderer = CHART_RENDERERS[this.chart_type];
    new Renderer(this).render(templateDict);
    return templateDict as ChartTemplateModel & Record<string, string | number>;
  }

  private _generate_modern_content(showZodiacBackgroundRing = true): string {
    const housesList = getHousesList(this.first_obj);
    const aspectsDicts = this.aspects_list.map(aspect => ({ ...aspect }));
    if (this.second_obj && (this.chart_type === "Transit" || this.chart_type === "Synastry" || this.chart_type === "DualReturnChart")) {
      return drawModernDualHoroscope(
        this.available_kerykeion_celestial_points,
        housesList,
        this.second_subject_celestial_points,
        aspectsDicts,
        this.first_obj.seventh_house.abs_pos,
        this.available_planets_setting,
        this.aspects_settings,
        this.chart_type,
        showZodiacBackgroundRing,
      );
    }
    return drawModernHoroscope(
      this.available_kerykeion_celestial_points,
      housesList,
      aspectsDicts,
      this.first_obj.seventh_house.abs_pos,
      this.available_planets_setting,
      this.aspects_settings,
      showZodiacBackgroundRing,
    );
  }

  private _validate_chart_style(style: KerykeionChartStyle): void {
    if (!chartStyles.includes(style)) {
      throw new KerykeionException(`Style ${JSON.stringify(style)} is not available. Allowed values: ${chartStyles.join(", ")}.`);
    }
  }

  private _apply_svg_post_processing(template: string, minify: boolean, removeCssVariables: boolean): string {
    let output = template;
    if (removeCssVariables) {
      output = inlineCssVariablesInSvg(output);
    }
    if (minify) {
      output = scourMinify(output);
    }
    else {
      output = output.replaceAll("\"", "'");
    }
    return output;
  }

  generate_svg_string(
    minify = false,
    remove_css_variables = false,
    options: {
      custom_title?: string | null;
      style?: KerykeionChartStyle | typeof _UNSET;
      show_zodiac_background_ring?: boolean | typeof _UNSET;
    } = {},
  ): string {
    const effectiveStyle = options.style === undefined || options.style === _UNSET ? this._style : options.style;
    const effectiveRing
      = options.show_zodiac_background_ring === undefined || options.show_zodiac_background_ring === _UNSET
        ? this._show_zodiac_background_ring
        : options.show_zodiac_background_ring;
    this._validate_chart_style(effectiveStyle);

    const templateData = this._create_template_dictionary({ custom_title: options.custom_title });
    const rawTemplate = chartTemplates.chart;
    let template: string;
    if (effectiveStyle === "modern") {
      const modernContent = this._generate_modern_content(effectiveRing);
      const scale = (2 * this.main_radius) / 100;
      template = substituteTemplate(rawTemplate, {
        ...templateData,
        background_circle: `<g transform="scale(${scale.toFixed(4)})">\n${modernContent}\n</g>`,
        makeZodiac: "",
        first_circle: "",
        second_circle: "",
        third_circle: "",
        transitRing: "",
        degreeRing: "",
        makeHouses: "",
        makePlanets: "",
        makeAspects: "",
      });
    }
    else {
      template = substituteTemplate(rawTemplate, templateData);
    }
    return this._apply_svg_post_processing(template, minify, remove_css_variables);
  }

  private _get_default_filename_suffix(suffix = ""): string {
    if (this.chart_type === "DualReturnChart" && this.second_obj && isPlanetReturn(this.second_obj)) {
      if (this.second_obj.return_type === "Lunar") {
        return `${this.first_obj.name} - ${this.chart_type} Chart - Lunar Return${suffix}`;
      }
      if (this.second_obj.return_type === "Solar") {
        return `${this.first_obj.name} - ${this.chart_type} Chart - Solar Return${suffix}`;
      }
    }
    const externalAliasSuffixes = new Set([" - Wheel Only", " - Aspect Grid Only", " - Modern Wheel Only"]);
    const chartTypeName
      = this.external_view && this.chart_type === "Natal" && externalAliasSuffixes.has(suffix)
        ? "ExternalNatal"
        : this.chart_type;
    return `${this.first_obj.name} - ${chartTypeName} Chart${suffix}`;
  }

  private _write_svg_to_disk(
    content: string,
    outputPath?: string | null,
    filename?: string | null,
    defaultSuffix = "",
  ): string {
    const nodeRuntime = requireNodeRuntime("ChartDrawer.save_svg");
    const outputDirectory = outputPath || getDefaultOutputDirectory();
    nodeRuntime.fs.mkdirSync(outputDirectory, { recursive: true });
    const resolved = nodeRuntime.path.join(
      outputDirectory,
      filename ? `${filename}.svg` : `${this._get_default_filename_suffix(defaultSuffix)}.svg`,
    );
    nodeRuntime.fs.writeFileSync(resolved, content, "utf8");
    return resolved;
  }

  save_svg(
    outputPath?: string | null,
    filename?: string | null,
    minify = false,
    remove_css_variables = false,
    options: {
      custom_title?: string | null;
      style?: KerykeionChartStyle | typeof _UNSET;
      show_zodiac_background_ring?: boolean | typeof _UNSET;
    } = {},
  ): string {
    const effectiveStyle = options.style === undefined || options.style === _UNSET ? this._style : options.style;
    const suffix = effectiveStyle === "modern" ? " - Modern" : "";
    const content = this.generate_svg_string(minify, remove_css_variables, options);
    return this._write_svg_to_disk(content, outputPath, filename, suffix);
  }

  generate_wheel_only_svg_string(
    minify = false,
    remove_css_variables = false,
    options: {
      style?: KerykeionChartStyle | typeof _UNSET;
      show_zodiac_background_ring?: boolean | typeof _UNSET;
    } = {},
  ): string {
    const effectiveStyle = options.style === undefined || options.style === _UNSET ? this._style : options.style;
    const effectiveRing
      = options.show_zodiac_background_ring === undefined || options.show_zodiac_background_ring === _UNSET
        ? this._show_zodiac_background_ring
        : options.show_zodiac_background_ring;
    this._validate_chart_style(effectiveStyle);
    const templateDict = this._create_template_dictionary();
    let template: string;
    if (effectiveStyle === "modern") {
      const rawTemplate = chartTemplates.modern_wheel;
      template = substituteTemplate(rawTemplate, {
        ...templateDict,
        makeModernHoroscope: this._generate_modern_content(effectiveRing),
        viewbox: "0 0 100 100",
      });
    }
    else {
      const rawTemplate = chartTemplates.wheel_only;
      template = substituteTemplate(rawTemplate, {
        ...templateDict,
        viewbox: this._wheel_only_viewbox(),
      });
    }
    return this._apply_svg_post_processing(template, minify, remove_css_variables);
  }

  save_wheel_only_svg_file(
    outputPath?: string | null,
    filename?: string | null,
    minify = false,
    remove_css_variables = false,
    options: {
      style?: KerykeionChartStyle | typeof _UNSET;
      show_zodiac_background_ring?: boolean | typeof _UNSET;
    } = {},
  ): string {
    const effectiveStyle = options.style === undefined || options.style === _UNSET ? this._style : options.style;
    const suffix = effectiveStyle === "modern" ? " - Modern Wheel Only" : " - Wheel Only";
    const content = this.generate_wheel_only_svg_string(minify, remove_css_variables, options);
    return this._write_svg_to_disk(content, outputPath, filename, suffix);
  }

  generate_aspect_grid_only_svg_string(minify = false, remove_css_variables = false): string {
    const rawTemplate = chartTemplates.aspect_grid_only;
    const templateDict = this._create_template_dictionary();
    const aspectGrid
      = this.chart_type === "Transit" || this.chart_type === "Synastry" || this.chart_type === "DualReturnChart"
        ? drawTransitAspectGrid(this.chart_colors_settings.paper_0, this.available_planets_setting, this.aspects_list)
        : drawAspectGrid(this.chart_colors_settings.paper_0, this.available_planets_setting, this.aspects_list, 50, 250);
    const template = substituteTemplate(rawTemplate, {
      ...templateDict,
      makeAspectGrid: aspectGrid,
      viewbox: this._grid_only_viewbox(),
    });
    return this._apply_svg_post_processing(template, minify, remove_css_variables);
  }

  save_aspect_grid_only_svg_file(
    outputPath?: string | null,
    filename?: string | null,
    minify = false,
    remove_css_variables = false,
  ): string {
    const content = this.generate_aspect_grid_only_svg_string(minify, remove_css_variables);
    return this._write_svg_to_disk(content, outputPath, filename, " - Aspect Grid Only");
  }
}
