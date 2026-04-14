import type {
  AstrologicalSubjectModel,
  ChartDataModel,
  CompositeSubjectModel,
  DualChartDataModel,
  KerykeionPointModel,
  MoonPhaseOverviewModel,
  PlanetReturnModel,
  PointInHouseModel,
  SingleChartDataModel,
} from "./schemas/models";
import { getAvailableAstrologicalPointsList, getHousesList } from "./utilities";

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: "☌",
  opposition: "☍",
  trine: "△",
  square: "□",
  sextile: "⚹",
  quincunx: "⚻",
  semisquare: "∠",
  sesquisquare: "⚼",
  quintile: "Q",
};

const MOVEMENT_SYMBOLS: Record<string, string> = {
  Applying: "→",
  Separating: "←",
  Static: "=",
};

type SubjectLike = AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
type ReportModel = ChartDataModel | AstrologicalSubjectModel | MoonPhaseOverviewModel;
type ReportKind = "subject" | "single_chart" | "dual_chart" | "moon_phase_overview";

function visualLength(value: string): number {
  return value.length + (value.match(/\uFE0F/g)?.length ?? 0);
}

function padDisplay(value: string, width: number): string {
  return value + " ".repeat(Math.max(0, width - visualLength(value)));
}

function buildAsciiTable(rows: Array<Array<string | number>>, title: string): string {
  const stringRows = rows.map(row => row.map(cell => String(cell)));
  const columnCount = Math.max(...stringRows.map(row => row.length), 0);
  const normalizedRows = stringRows.map((row) => {
    const next = [...row];
    while (next.length < columnCount) {
      next.push("");
    }
    return next;
  });
  const widths = Array.from({ length: columnCount }, (_, index) =>
    Math.max(...normalizedRows.map(row => visualLength(row[index] ?? "")), 0));

  const separator = `+${widths.map(width => "-".repeat(width + 2)).join("+")}+`;
  const titleLine
    = title && visualLength(title) <= visualLength(separator) - 2
      ? `+${title}${separator.slice(title.length + 1)}`
      : separator;

  const renderRow = (row: string[]) =>
    `| ${row.map((cell, index) => padDisplay(cell, widths[index]!)).join(" | ")} |`;

  if (normalizedRows.length === 0) {
    return [titleLine, separator].join("\n");
  }

  const header = renderRow(normalizedRows[0]!);
  const body = normalizedRows.slice(1).map(renderRow);
  return [titleLine, header, separator, ...body, separator].join("\n");
}

function isAstrologicalSubjectModel(model: ReportModel): model is AstrologicalSubjectModel {
  return "year" in model && "month" in model && "day" in model && "hour" in model && "minute" in model;
}

function isAstrologicalSubjectLike(subject: SubjectLike): subject is AstrologicalSubjectModel {
  return "year" in subject && "month" in subject && "day" in subject && "hour" in subject && "minute" in subject;
}

function isSingleChartDataModel(model: ReportModel): model is SingleChartDataModel {
  return "chart_type" in model && "subject" in model;
}

function isDualChartDataModel(model: ReportModel): model is DualChartDataModel {
  return "chart_type" in model && "first_subject" in model && "second_subject" in model;
}

function isMoonPhaseOverviewModel(model: ReportModel): model is MoonPhaseOverviewModel {
  return "datestamp" in model && "moon" in model && !("chart_type" in model);
}

function isCompositeSubjectModel(subject: SubjectLike): subject is CompositeSubjectModel {
  return "first_subject" in subject && "second_subject" in subject && "composite_chart_type" in subject;
}

function isPlanetReturnModel(subject: SubjectLike): subject is PlanetReturnModel {
  return "return_type" in subject;
}

function isoDateParts(isoDatetime?: string | null): { year: string; month: string; day: string } | null {
  if (!isoDatetime) {
    return null;
  }
  const match = isoDatetime.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }
  return { year: match[1]!, month: match[2]!, day: match[3]! };
}

function formatIsoDate(isoDatetime?: string | null): string {
  const parts = isoDateParts(isoDatetime);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : (isoDatetime ?? "");
}

function extractYear(isoDatetime?: string | null): string | null {
  return isoDateParts(isoDatetime)?.year ?? null;
}

export class ReportGenerator {
  readonly model: ReportModel;
  private readonly includeAspectsDefault: boolean;
  private readonly maxAspectsDefault: number | null;

  chart_type: string | null = null;
  private modelKind!: ReportKind;
  private chartData: ChartDataModel | null = null;
  private primarySubject: SubjectLike | null = null;
  private secondarySubject: SubjectLike | null = null;
  private activePoints: string[] = [];
  private activeAspects: Array<Record<string, unknown>> = [];

  constructor(model: ReportModel, options: { include_aspects?: boolean; max_aspects?: number | null } = {}) {
    this.model = model;
    this.includeAspectsDefault = options.include_aspects ?? true;
    this.maxAspectsDefault = options.max_aspects ?? null;
    this.resolveModel();
  }

  generate_report(options: { include_aspects?: boolean; max_aspects?: number | null } = {}): string {
    const includeAspects = options.include_aspects ?? this.includeAspectsDefault;
    const maxAspects = options.max_aspects ?? this.maxAspectsDefault;

    const sections
      = this.modelKind === "moon_phase_overview"
        ? this.buildMoonPhaseOverviewReport()
        : this.modelKind === "subject"
          ? this.buildSubjectReport()
          : this.modelKind === "single_chart"
            ? this.buildSingleChartReport({ includeAspects, maxAspects })
            : this.buildDualChartReport({ includeAspects, maxAspects });

    const title = this.buildTitle().trim();
    return [title, ...sections.filter(Boolean)].join("\n\n");
  }

  print_report(options: { include_aspects?: boolean; max_aspects?: number | null } = {}): void {
    console.log(this.generate_report(options));
  }

  private resolveModel(): void {
    if (isMoonPhaseOverviewModel(this.model)) {
      this.modelKind = "moon_phase_overview";
      this.chart_type = "MoonPhaseOverview";
      return;
    }
    if (isAstrologicalSubjectModel(this.model)) {
      this.modelKind = "subject";
      this.chart_type = "Subject";
      this.primarySubject = this.model;
      this.activePoints = [...this.model.active_points];
      return;
    }
    if (isSingleChartDataModel(this.model)) {
      this.modelKind = "single_chart";
      this.chart_type = this.model.chart_type;
      this.chartData = this.model;
      this.primarySubject = this.model.subject;
      this.activePoints = [...this.model.subject.active_points];
      this.activeAspects = this.model.active_aspects.map(aspect => ({ ...aspect }));
      return;
    }
    if (isDualChartDataModel(this.model)) {
      this.modelKind = "dual_chart";
      this.chart_type = this.model.chart_type;
      this.chartData = this.model;
      this.primarySubject = this.model.first_subject;
      this.secondarySubject = this.model.second_subject;
      this.activePoints = [...this.model.active_points];
      this.activeAspects = this.model.active_aspects.map(aspect => ({ ...aspect }));
      return;
    }
    throw new TypeError(
      `Unsupported model type ${typeof this.model}. Supported models: AstrologicalSubjectModel, SingleChartDataModel, DualChartDataModel, MoonPhaseOverviewModel.`,
    );
  }

  private buildSubjectReport(): string[] {
    if (!this.primarySubject) {
      return [];
    }
    return [
      this.subjectDataReport(this.primarySubject, "Astrological Subject"),
      this.celestialPointsReport(this.primarySubject, "Celestial Points"),
      this.housesReport(this.primarySubject, "Houses"),
      this.lunarPhaseReport(this.primarySubject),
    ];
  }

  private buildMoonPhaseOverviewReport(): string[] {
    if (!isMoonPhaseOverviewModel(this.model)) {
      return [];
    }
    const overview = this.model;
    const sections: string[] = [];

    const moonData: Array<Array<string | number>> = [["Field", "Value"]];
    if (overview.moon.phase_name != null) {
      moonData.push(["Phase Name", `${overview.moon.phase_name} ${overview.moon.emoji ?? ""}`.trim()]);
    }
    if (overview.moon.major_phase != null) {
      moonData.push(["Major Phase", overview.moon.major_phase]);
    }
    if (overview.moon.stage != null) {
      moonData.push(["Stage", overview.moon.stage.charAt(0).toUpperCase() + overview.moon.stage.slice(1)]);
    }
    if (overview.moon.illumination != null) {
      moonData.push(["Illumination", overview.moon.illumination]);
    }
    if (overview.moon.age_days != null) {
      moonData.push(["Age (days)", String(overview.moon.age_days)]);
    }
    if (overview.moon.lunar_cycle != null) {
      moonData.push(["Lunar Cycle", overview.moon.lunar_cycle]);
    }
    if (overview.moon.zodiac != null) {
      moonData.push(["Sun Sign", overview.moon.zodiac.sun_sign]);
      moonData.push(["Moon Sign", overview.moon.zodiac.moon_sign]);
    }
    if (moonData.length > 1) {
      sections.push(buildAsciiTable(moonData, "Moon Summary"));
    }

    const illumination = overview.moon.detailed?.illumination_details;
    if (illumination) {
      const data: Array<Array<string | number>> = [["Field", "Value"]];
      if (illumination.percentage != null) {
        data.push([
          "Percentage",
          `${Number.isInteger(illumination.percentage) ? illumination.percentage.toFixed(1) : illumination.percentage}%`,
        ]);
      }
      if (illumination.visible_fraction != null) {
        data.push(["Visible Fraction", illumination.visible_fraction.toFixed(4)]);
      }
      if (illumination.phase_angle != null) {
        data.push(["Phase Angle", `${illumination.phase_angle.toFixed(2)}°`]);
      }
      if (data.length > 1) {
        sections.push(buildAsciiTable(data, "Illumination Details"));
      }
    }

    const phases = overview.moon.detailed?.upcoming_phases;
    if (phases) {
      const data: Array<Array<string | number>> = [["Phase", "Last", "Next"]];
      for (const [label, window] of [
        ["New Moon", phases.new_moon],
        ["First Quarter", phases.first_quarter],
        ["Full Moon", phases.full_moon],
        ["Last Quarter", phases.last_quarter],
      ] as const) {
        if (window) {
          data.push([label, window.last?.datestamp ?? "N/A", window.next?.datestamp ?? "N/A"]);
        }
      }
      if (data.length > 1) {
        sections.push(buildAsciiTable(data, "Upcoming Phases"));
      }
    }

    if (overview.moon.next_lunar_eclipse) {
      const data: Array<Array<string | number>> = [["Field", "Value"]];
      if (overview.moon.next_lunar_eclipse.datestamp) {
        data.push(["Date", overview.moon.next_lunar_eclipse.datestamp]);
      }
      if (overview.moon.next_lunar_eclipse.type) {
        data.push(["Type", overview.moon.next_lunar_eclipse.type]);
      }
      if (data.length > 1) {
        sections.push(buildAsciiTable(data, "Next Lunar Eclipse"));
      }
    }

    if (overview.sun) {
      const data: Array<Array<string | number>> = [["Field", "Value"]];
      if (overview.sun.sunrise_timestamp != null) {
        data.push(["Sunrise", overview.sun.sunrise_timestamp]);
      }
      if (overview.sun.sunset_timestamp != null) {
        data.push(["Sunset", overview.sun.sunset_timestamp]);
      }
      if (overview.sun.solar_noon != null) {
        data.push(["Solar Noon", overview.sun.solar_noon]);
      }
      if (overview.sun.day_length != null) {
        data.push(["Day Length", overview.sun.day_length]);
      }
      if (overview.sun.position?.altitude != null) {
        data.push(["Sun Altitude", `${overview.sun.position.altitude.toFixed(2)}°`]);
      }
      if (overview.sun.position?.azimuth != null) {
        data.push(["Sun Azimuth", `${overview.sun.position.azimuth.toFixed(2)}°`]);
      }
      if (data.length > 1) {
        sections.push(buildAsciiTable(data, "Sun Info"));
      }

      if (overview.sun.next_solar_eclipse) {
        const eclipseData: Array<Array<string | number>> = [["Field", "Value"]];
        if (overview.sun.next_solar_eclipse.datestamp) {
          eclipseData.push(["Date", overview.sun.next_solar_eclipse.datestamp]);
        }
        if (overview.sun.next_solar_eclipse.type) {
          eclipseData.push(["Type", overview.sun.next_solar_eclipse.type]);
        }
        if (eclipseData.length > 1) {
          sections.push(buildAsciiTable(eclipseData, "Next Solar Eclipse"));
        }
      }
    }

    if (overview.location) {
      const data: Array<Array<string | number>> = [["Field", "Value"]];
      if (overview.location.latitude != null) {
        data.push(["Latitude", overview.location.latitude]);
      }
      if (overview.location.longitude != null) {
        data.push(["Longitude", overview.location.longitude]);
      }
      if (overview.location.using_default_location != null) {
        data.push(["Default Location", overview.location.using_default_location ? "Yes" : "No"]);
      }
      if (data.length > 1) {
        sections.push(buildAsciiTable(data, "Location"));
      }
    }

    return sections;
  }

  private buildSingleChartReport(options: { includeAspects: boolean; maxAspects: number | null }): string[] {
    if (!this.chartData || !this.primarySubject) {
      return [];
    }
    const sections: string[] = [this.subjectDataReport(this.primarySubject, this.primarySubjectLabel())];

    if (isCompositeSubjectModel(this.primarySubject)) {
      sections.push(this.subjectDataReport(this.primarySubject.first_subject, "Composite – First Subject"));
      sections.push(this.subjectDataReport(this.primarySubject.second_subject, "Composite – Second Subject"));
    }

    sections.push(
      this.celestialPointsReport(this.primarySubject, `${this.primarySubjectLabel()} Celestial Points`),
      this.housesReport(this.primarySubject, `${this.primarySubjectLabel()} Houses`),
      this.lunarPhaseReport(this.primarySubject),
      this.elementsReport(),
      this.qualitiesReport(),
      this.activeConfigurationReport(),
    );

    if (options.includeAspects) {
      sections.push(this.aspectsReport({ maxAspects: options.maxAspects }));
    }

    return sections;
  }

  private buildDualChartReport(options: { includeAspects: boolean; maxAspects: number | null }): string[] {
    if (!this.chartData || !this.primarySubject) {
      return [];
    }
    const [primaryLabel, secondaryLabel] = this.subjectRoleLabels();
    const sections: string[] = [this.subjectDataReport(this.primarySubject, primaryLabel)];

    if (this.secondarySubject) {
      sections.push(this.subjectDataReport(this.secondarySubject, secondaryLabel));
    }

    sections.push(this.celestialPointsReport(this.primarySubject, `${primaryLabel} Celestial Points`));
    if (this.secondarySubject) {
      sections.push(this.celestialPointsReport(this.secondarySubject, `${secondaryLabel} Celestial Points`));
    }

    sections.push(this.housesReport(this.primarySubject, `${primaryLabel} Houses`));
    if (this.secondarySubject) {
      sections.push(this.housesReport(this.secondarySubject, `${secondaryLabel} Houses`));
    }

    sections.push(
      this.lunarPhaseReport(this.primarySubject),
      this.elementsReport(),
      this.qualitiesReport(),
      this.houseComparisonReport(),
      this.relationshipScoreReport(),
      this.activeConfigurationReport(),
    );

    if (options.includeAspects) {
      sections.push(this.aspectsReport({ maxAspects: options.maxAspects }));
    }

    return sections;
  }

  private buildTitle(): string {
    if (this.modelKind === "moon_phase_overview" && isMoonPhaseOverviewModel(this.model)) {
      const baseTitle = `Moon Phase Overview — ${this.model.datestamp}`;
      return `${"=".repeat(visualLength(baseTitle))}\n${baseTitle}\n${"=".repeat(visualLength(baseTitle))}`;
    }
    if (!this.primarySubject) {
      return "";
    }

    let baseTitle = `${this.primarySubject.name} — Chart Report`;
    if (this.modelKind === "subject") {
      baseTitle = `${this.primarySubject.name} — Subject Report`;
    }
    else if (this.chart_type === "Natal") {
      baseTitle = `${this.primarySubject.name} — Natal Chart Report`;
    }
    else if (this.chart_type === "Composite") {
      baseTitle = isCompositeSubjectModel(this.primarySubject)
        ? `${this.primarySubject.first_subject.name} & ${this.primarySubject.second_subject.name} — Composite Report`
        : `${this.primarySubject.name} — Composite Report`;
    }
    else if (this.chart_type === "SingleReturnChart") {
      const year = extractYear(this.primarySubject.iso_formatted_local_datetime);
      baseTitle
        = isPlanetReturnModel(this.primarySubject) && this.primarySubject.return_type === "Solar"
          ? `${this.primarySubject.name} — Solar Return ${year ?? ""}`.trim()
          : `${this.primarySubject.name} — Lunar Return ${year ?? ""}`.trim();
    }
    else if (this.chart_type === "Transit") {
      baseTitle = `${this.primarySubject.name} — Transit ${formatIsoDate(this.secondarySubject?.iso_formatted_local_datetime)}`.trim();
    }
    else if (this.chart_type === "Synastry") {
      baseTitle = `${this.primarySubject.name} & ${this.secondarySubject?.name ?? "Unknown"} — Synastry Report`;
    }
    else if (this.chart_type === "DualReturnChart") {
      const year = extractYear(this.secondarySubject?.iso_formatted_local_datetime);
      baseTitle
        = this.secondarySubject && isPlanetReturnModel(this.secondarySubject) && this.secondarySubject.return_type === "Solar"
          ? `${this.primarySubject.name} — Solar Return Comparison ${year ?? ""}`.trim()
          : `${this.primarySubject.name} — Lunar Return Comparison ${year ?? ""}`.trim();
    }

    return `${"=".repeat(visualLength(baseTitle))}\n${baseTitle}\n${"=".repeat(visualLength(baseTitle))}`;
  }

  private primarySubjectLabel(): string {
    if (this.chart_type === "Composite") {
      return "Composite Chart";
    }
    if (this.chart_type === "SingleReturnChart") {
      return this.primarySubject && isPlanetReturnModel(this.primarySubject) && this.primarySubject.return_type === "Solar"
        ? "Solar Return Chart"
        : "Lunar Return Chart";
    }
    return `${this.chart_type ?? "Chart"}`;
  }

  private subjectRoleLabels(): [string, string] {
    if (this.chart_type === "Transit") {
      return ["Natal Subject", "Transit Subject"];
    }
    if (this.chart_type === "Synastry") {
      return ["First Subject", "Second Subject"];
    }
    if (this.chart_type === "DualReturnChart") {
      return ["Natal Subject", "Return Subject"];
    }
    return ["Primary Subject", "Secondary Subject"];
  }

  private subjectDataReport(subject: SubjectLike, label: string): string {
    const birthData: Array<Array<string | number>> = [["Field", "Value"], ["Name", subject.name]];

    if (isCompositeSubjectModel(subject)) {
      birthData.push(["Composite Members", `${subject.first_subject.name} & ${subject.second_subject.name}`]);
      birthData.push(["Composite Type", subject.composite_chart_type]);
    }
    if (isPlanetReturnModel(subject)) {
      birthData.push(["Return Type", subject.return_type]);
    }
    if (isAstrologicalSubjectLike(subject) && !isPlanetReturnModel(subject) && !isCompositeSubjectModel(subject)) {
      birthData.push(["Date", `${String(subject.day).padStart(2, "0")}/${String(subject.month).padStart(2, "0")}/${subject.year}`]);
      birthData.push(["Time", `${String(subject.hour).padStart(2, "0")}:${String(subject.minute).padStart(2, "0")}`]);
    }
    if (subject.city) {
      birthData.push(["City", subject.city]);
    }
    if (subject.nation) {
      birthData.push(["Nation", subject.nation]);
    }
    if (subject.lat != null) {
      birthData.push(["Latitude", `${subject.lat.toFixed(4)}°`]);
    }
    if (subject.lng != null) {
      birthData.push(["Longitude", `${subject.lng.toFixed(4)}°`]);
    }
    if (subject.tz_str) {
      birthData.push(["Timezone", subject.tz_str]);
    }
    if (subject.day_of_week) {
      birthData.push(["Day of Week", subject.day_of_week]);
    }
    if (subject.iso_formatted_local_datetime) {
      birthData.push(["ISO Local Datetime", subject.iso_formatted_local_datetime]);
    }

    const settingsData: Array<Array<string | number>> = [["Setting", "Value"]];
    settingsData.push(["Zodiac Type", String(subject.zodiac_type)]);
    if (subject.sidereal_mode) {
      settingsData.push(["Sidereal Mode", String(subject.sidereal_mode)]);
    }
    settingsData.push(["Houses System", String(subject.houses_system_name)]);
    settingsData.push(["Perspective Type", String(subject.perspective_type)]);
    if (subject.julian_day != null) {
      settingsData.push(["Julian Day", subject.julian_day.toFixed(6)]);
    }
    if (subject.active_points?.length) {
      settingsData.push(["Active Points Count", String(subject.active_points.length)]);
    }

    return [
      buildAsciiTable(birthData, `${label} — Birth Data`),
      buildAsciiTable(settingsData, `${label} — Settings`),
    ].join("\n\n");
  }

  private celestialPointsReport(subject: SubjectLike, title: string): string {
    const points = this.collectCelestialPoints(subject);
    if (points.length === 0) {
      return "No celestial points data available.";
    }

    const mainPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
    const nodes = ["Mean_North_Lunar_Node", "True_North_Lunar_Node"];
    const angles = ["Ascendant", "Medium_Coeli", "Descendant", "Imum_Coeli"];
    const sortedPoints: KerykeionPointModel[] = [];
    for (const name of [...angles, ...mainPlanets, ...nodes]) {
      sortedPoints.push(...points.filter(point => point.name === name));
    }
    const usedNames = new Set([...angles, ...mainPlanets, ...nodes]);
    sortedPoints.push(...points.filter(point => !usedNames.has(point.name)));

    const data: Array<Array<string | number>> = [["Point", "Sign", "Position", "Speed", "Decl.", "Ret.", "House"]];
    for (const point of sortedPoints) {
      data.push([
        point.name.replaceAll("_", " "),
        `${point.sign} ${point.emoji}`,
        `${point.position.toFixed(2)}°`,
        point.speed != null ? `${point.speed >= 0 ? "+" : ""}${point.speed.toFixed(4)}°/d` : "N/A",
        point.declination != null ? `${point.declination >= 0 ? "+" : ""}${point.declination.toFixed(2)}°` : "N/A",
        point.retrograde ? "R" : "-",
        point.house ? point.house.replaceAll("_", " ") : "-",
      ]);
    }
    return buildAsciiTable(data, title);
  }

  private collectCelestialPoints(subject: SubjectLike): KerykeionPointModel[] {
    if (isAstrologicalSubjectLike(subject) && !isPlanetReturnModel(subject) && !isCompositeSubjectModel(subject)) {
      return getAvailableAstrologicalPointsList(subject);
    }
    const points: KerykeionPointModel[] = [];
    for (const pointName of subject.active_points ?? []) {
      const attr = (subject as unknown as Record<string, unknown>)[String(pointName).toLowerCase()];
      if (attr && typeof attr === "object") {
        points.push(attr as KerykeionPointModel);
      }
    }
    return points;
  }

  private housesReport(subject: SubjectLike, title: string): string {
    let houses: KerykeionPointModel[];
    try {
      houses = getHousesList(subject);
    }
    catch {
      return "No houses data available.";
    }
    if (houses.length === 0) {
      return "No houses data available.";
    }
    const data: Array<Array<string | number>> = [["House", "Sign", "Position", "Absolute Position"]];
    for (const house of houses) {
      data.push([
        house.name.replaceAll("_", " "),
        `${house.sign} ${house.emoji}`,
        `${house.position.toFixed(2)}°`,
        `${house.abs_pos.toFixed(2)}°`,
      ]);
    }
    const tableTitle = subject.houses_system_name ? `${title} (${subject.houses_system_name})` : title;
    return buildAsciiTable(data, tableTitle);
  }

  private lunarPhaseReport(subject: SubjectLike): string {
    if (!subject.lunar_phase) {
      return "";
    }
    return buildAsciiTable(
      [
        ["Lunar Phase Information", "Value"],
        ["Phase Name", `${subject.lunar_phase.moon_phase_name} ${subject.lunar_phase.moon_emoji}`],
        ["Sun-Moon Angle", `${subject.lunar_phase.degrees_between_s_m.toFixed(2)}°`],
        ["Lunation Day", String(subject.lunar_phase.moon_phase)],
      ],
      "Lunar Phase",
    );
  }

  private elementsReport(): string {
    const distribution = this.chartData?.element_distribution;
    if (!distribution) {
      return "";
    }
    const total = distribution.fire + distribution.earth + distribution.air + distribution.water;
    if (total === 0) {
      return "";
    }
    const counts = [distribution.fire, distribution.earth, distribution.air, distribution.water, total];
    const formatCount = (value: number) =>
      counts.some(item => !Number.isInteger(item)) && Number.isInteger(value) ? value.toFixed(1) : String(value);
    return buildAsciiTable(
      [
        ["Element", "Count", "Percentage"],
        ["Fire 🔥", formatCount(distribution.fire), `${((distribution.fire / total) * 100).toFixed(1)}%`],
        ["Earth 🌍", formatCount(distribution.earth), `${((distribution.earth / total) * 100).toFixed(1)}%`],
        ["Air 💨", formatCount(distribution.air), `${((distribution.air / total) * 100).toFixed(1)}%`],
        ["Water 💧", formatCount(distribution.water), `${((distribution.water / total) * 100).toFixed(1)}%`],
        ["Total", formatCount(total), "100%"],
      ],
      "Element Distribution",
    );
  }

  private qualitiesReport(): string {
    const distribution = this.chartData?.quality_distribution;
    if (!distribution) {
      return "";
    }
    const total = distribution.cardinal + distribution.fixed + distribution.mutable;
    if (total === 0) {
      return "";
    }
    const counts = [distribution.cardinal, distribution.fixed, distribution.mutable, total];
    const formatCount = (value: number) =>
      counts.some(item => !Number.isInteger(item)) && Number.isInteger(value) ? value.toFixed(1) : String(value);
    return buildAsciiTable(
      [
        ["Quality", "Count", "Percentage"],
        ["Cardinal", formatCount(distribution.cardinal), `${((distribution.cardinal / total) * 100).toFixed(1)}%`],
        ["Fixed", formatCount(distribution.fixed), `${((distribution.fixed / total) * 100).toFixed(1)}%`],
        ["Mutable", formatCount(distribution.mutable), `${((distribution.mutable / total) * 100).toFixed(1)}%`],
        ["Total", formatCount(total), "100%"],
      ],
      "Quality Distribution",
    );
  }

  private activeConfigurationReport(): string {
    const sections: string[] = [];
    if (this.activePoints.length > 0) {
      sections.push(
        buildAsciiTable(
          [["#", "Active Point"], ...this.activePoints.map((point, index) => [String(index + 1), point])],
          "Active Celestial Points",
        ),
      );
    }
    if (this.activeAspects.length > 0) {
      sections.push(
        buildAsciiTable(
          [
            ["Aspect", "Orb (°)"],
            ...this.activeAspects.map(aspect => [String(aspect.name ?? ""), aspect.orb != null ? String(aspect.orb) : "-"]),
          ],
          "Active Aspects Configuration",
        ),
      );
    }
    return sections.join("\n\n");
  }

  private aspectsReport(options: { maxAspects: number | null }): string {
    const aspects = this.chartData?.aspects ? [...this.chartData.aspects] : [];
    if (aspects.length === 0) {
      return this.chartData ? "No aspects data available." : "";
    }
    const totalAspects = aspects.length;
    const visibleAspects = options.maxAspects != null ? aspects.slice(0, options.maxAspects) : aspects;
    const isDual = !!this.chartData && "first_subject" in this.chartData;
    const data: Array<Array<string | number>> = [
      isDual
        ? ["Point 1", "Owner 1", "Aspect", "Point 2", "Owner 2", "Orb", "Movement"]
        : ["Point 1", "Aspect", "Point 2", "Orb", "Movement"],
    ];
    for (const aspect of visibleAspects) {
      const symbol = ASPECT_SYMBOLS[aspect.aspect.toLowerCase()] ?? aspect.aspect;
      const movementSymbol = MOVEMENT_SYMBOLS[aspect.aspect_movement] ?? "";
      const movement = `${aspect.aspect_movement} ${movementSymbol}`.trim();
      if (isDual) {
        data.push([
          aspect.p1_name.replaceAll("_", " "),
          aspect.p1_owner,
          `${aspect.aspect} ${symbol}`,
          aspect.p2_name.replaceAll("_", " "),
          aspect.p2_owner,
          `${aspect.orbit.toFixed(2)}°`,
          movement,
        ]);
      }
      else {
        data.push([
          aspect.p1_name.replaceAll("_", " "),
          `${aspect.aspect} ${symbol}`,
          aspect.p2_name.replaceAll("_", " "),
          `${aspect.orbit.toFixed(2)}°`,
          movement,
        ]);
      }
    }
    const suffix = options.maxAspects != null ? ` (showing ${visibleAspects.length} of ${totalAspects})` : "";
    return buildAsciiTable(data, `Aspects${suffix}`);
  }

  private houseComparisonReport(): string {
    if (!this.chartData || !("house_comparison" in this.chartData) || !this.chartData.house_comparison) {
      return "";
    }
    const comparison = this.chartData.house_comparison;
    const sections = [
      this.renderPointInHouseTable(
        comparison.first_points_in_second_houses,
        `${comparison.first_subject_name} points in ${comparison.second_subject_name} houses`,
      ),
      this.renderPointInHouseTable(
        comparison.second_points_in_first_houses,
        `${comparison.second_subject_name} points in ${comparison.first_subject_name} houses`,
      ),
      this.renderCuspInHouseTable(
        comparison.first_cusps_in_second_houses,
        `${comparison.first_subject_name} cusps in ${comparison.second_subject_name} houses`,
      ),
      this.renderCuspInHouseTable(
        comparison.second_cusps_in_first_houses,
        `${comparison.second_subject_name} cusps in ${comparison.first_subject_name} houses`,
      ),
    ];
    return sections.filter(Boolean).join("\n\n");
  }

  private renderPointInHouseTable(points: PointInHouseModel[], title: string): string {
    if (points.length === 0) {
      return "";
    }
    const data: Array<Array<string | number>> = [["Point", "Owner House", "Projected House", "Sign", "Degree"]];
    for (const point of points) {
      const ownerHouse
        = point.point_owner_house_number != null || point.point_owner_house_name != null
          ? `${point.point_owner_house_number ?? "-"} (${point.point_owner_house_name ?? "-"})`
          : "-";
      data.push([
        `${point.point_owner_name} – ${point.point_name.replaceAll("_", " ")}`,
        ownerHouse,
        `${point.projected_house_number} (${point.projected_house_name})`,
        point.point_sign,
        `${point.point_degree.toFixed(2)}°`,
      ]);
    }
    return buildAsciiTable(data, title);
  }

  private renderCuspInHouseTable(points: PointInHouseModel[], title: string): string {
    if (points.length === 0) {
      return "";
    }
    const data: Array<Array<string | number>> = [["Point", "Projected House", "Sign", "Degree"]];
    for (const point of points) {
      data.push([
        `${point.point_owner_name} – ${point.point_name.replaceAll("_", " ")}`,
        `${point.projected_house_number} (${point.projected_house_name})`,
        point.point_sign,
        `${point.point_degree.toFixed(2)}°`,
      ]);
    }
    return buildAsciiTable(data, title);
  }

  private relationshipScoreReport(): string {
    if (!this.chartData || !("relationship_score" in this.chartData) || !this.chartData.relationship_score) {
      return "";
    }
    const score = this.chartData.relationship_score;
    const sections = [
      buildAsciiTable(
        [
          ["Metric", "Value"],
          ["Score", String(score.score_value)],
          ["Description", String(score.score_description)],
          ["Destiny Signature", score.is_destiny_sign ? "Yes" : "No"],
        ],
        "Relationship Score Summary",
      ),
    ];

    if (score.aspects.length > 0) {
      sections.push(
        buildAsciiTable(
          [
            ["Point 1", "Aspect", "Point 2", "Orb"],
            ...score.aspects.map(aspect => [
              aspect.p1_name.replaceAll("_", " "),
              aspect.aspect,
              aspect.p2_name.replaceAll("_", " "),
              `${aspect.orbit.toFixed(2)}°`,
            ]),
          ],
          "Score Supporting Aspects",
        ),
      );
    }

    return sections.join("\n\n");
  }
}
