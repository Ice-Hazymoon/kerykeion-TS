import type {
  AspectModel,
  AstrologicalBaseModel,
  AstrologicalSubjectModel,
  CompositeSubjectModel,
  DualChartDataModel,
  ElementDistributionModel,
  HouseComparisonModel,
  KerykeionPointModel,
  LunarPhaseModel,
  MoonPhaseOverviewModel,
  PlanetReturnModel,
  PointInHouseModel,
  QualityDistributionModel,
  SingleChartDataModel,
  TransitMomentModel,
  TransitsTimeRangeModel,
} from "./schemas/models";

const SIGN_FULL_NAMES: Record<string, string> = {
  Ari: "Aries",
  Tau: "Taurus",
  Gem: "Gemini",
  Can: "Cancer",
  Leo: "Leo",
  Vir: "Virgo",
  Lib: "Libra",
  Sco: "Scorpio",
  Sag: "Sagittarius",
  Cap: "Capricorn",
  Aqu: "Aquarius",
  Pis: "Pisces",
};

function xmlEscape(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function xmlAttrEscape(value: unknown): string {
  return xmlEscape(value).replaceAll("\"", "&quot;");
}

function formatAttrs(attrs: Record<string, unknown>): string {
  const parts = Object.entries(attrs)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}="${xmlAttrEscape(value)}"`);
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

function selfClosingTag(tag: string, attrs: Record<string, unknown> = {}): string {
  return `<${tag}${formatAttrs(attrs)} />`;
}

function openTag(tag: string, attrs: Record<string, unknown> = {}): string {
  return `<${tag}${formatAttrs(attrs)}>`;
}

function closeTag(tag: string): string {
  return `</${tag}>`;
}

function textElement(tag: string, text: unknown, attrs: Record<string, unknown> = {}): string {
  if (text === null || text === undefined) {
    return "";
  }
  return `${openTag(tag, attrs)}${xmlEscape(text)}${closeTag(tag)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKerykeionPointModel(value: unknown): value is KerykeionPointModel {
  return (
    isRecord(value)
    && "name" in value
    && "position" in value
    && "sign" in value
    && "abs_pos" in value
    && "quality" in value
    && "element" in value
    && "point_type" in value
  );
}

function isLunarPhaseModel(value: unknown): value is LunarPhaseModel {
  return (
    isRecord(value)
    && "degrees_between_s_m" in value
    && "moon_phase" in value
    && "moon_phase_name" in value
    && "moon_emoji" in value
  );
}

function isAspectModel(value: unknown): value is AspectModel {
  return (
    isRecord(value)
    && "p1_name" in value
    && "p2_name" in value
    && "aspect" in value
    && "orbit" in value
    && "aspect_degrees" in value
  );
}

function isElementDistributionModel(value: unknown): value is ElementDistributionModel {
  return isRecord(value) && "fire_percentage" in value && "earth_percentage" in value;
}

function isQualityDistributionModel(value: unknown): value is QualityDistributionModel {
  return isRecord(value) && "cardinal_percentage" in value && "fixed_percentage" in value;
}

function isPointInHouseModel(value: unknown): value is PointInHouseModel {
  return (
    isRecord(value)
    && "point_name" in value
    && "point_owner_name" in value
    && "projected_house_name" in value
    && "projected_house_owner_name" in value
  );
}

function isHouseComparisonModel(value: unknown): value is HouseComparisonModel {
  return (
    isRecord(value)
    && "first_subject_name" in value
    && "second_subject_name" in value
    && "first_points_in_second_houses" in value
    && "second_points_in_first_houses" in value
  );
}

function isMoonPhaseOverviewModel(value: unknown): value is MoonPhaseOverviewModel {
  return isRecord(value) && "timestamp" in value && "datestamp" in value && "moon" in value;
}

function isTransitMomentModel(value: unknown): value is TransitMomentModel {
  return isRecord(value) && "date" in value && "aspects" in value && !("subject" in value);
}

function isTransitsTimeRangeModel(value: unknown): value is TransitsTimeRangeModel {
  return isRecord(value) && "transits" in value && Array.isArray(value.transits);
}

function isSingleChartDataModel(value: unknown): value is SingleChartDataModel {
  return isRecord(value) && "chart_type" in value && "subject" in value && "element_distribution" in value;
}

function isDualChartDataModel(value: unknown): value is DualChartDataModel {
  return isRecord(value) && "chart_type" in value && "first_subject" in value && "second_subject" in value;
}

function isCompositeSubjectModel(value: unknown): value is CompositeSubjectModel {
  return isRecord(value) && "composite_chart_type" in value && "first_subject" in value && "second_subject" in value;
}

function isPlanetReturnModel(value: unknown): value is PlanetReturnModel {
  return isRecord(value) && "return_type" in value;
}

function isAstrologicalSubjectModel(value: unknown): value is AstrologicalSubjectModel {
  return isRecord(value) && "year" in value && "month" in value && "day" in value && "hour" in value && "minute" in value;
}

function isAstrologicalBaseModel(value: unknown): value is AstrologicalBaseModel {
  return (
    isRecord(value)
    && "name" in value
    && "zodiac_type" in value
    && "houses_system_name" in value
    && "perspective_type" in value
    && "houses_names_list" in value
    && "active_points" in value
  );
}

export function kerykeionPointToContext(point: KerykeionPointModel): string {
  const fullSignName = SIGN_FULL_NAMES[point.sign] ?? point.sign;
  const attrs: Record<string, unknown> = {
    name: point.name,
    position: point.position.toFixed(2),
    sign: fullSignName,
    abs_pos: point.abs_pos.toFixed(2),
    quality: point.quality,
    element: point.element,
  };

  if (point.house !== null && point.house !== undefined) {
    attrs.house = String(point.house).replaceAll("_", " ");
  }
  if (point.retrograde !== null && point.retrograde !== undefined) {
    attrs.motion = point.retrograde ? "retrograde" : "direct";
  }
  if (point.speed !== null && point.speed !== undefined) {
    attrs.speed = point.speed.toFixed(4);
  }
  if (point.declination !== null && point.declination !== undefined) {
    attrs.declination = point.declination.toFixed(2);
  }

  return selfClosingTag("point", attrs);
}

export function lunarPhaseToContext(lunarPhase: LunarPhaseModel): string {
  return selfClosingTag("lunar_phase", {
    name: lunarPhase.moon_phase_name,
    phase: String(lunarPhase.moon_phase),
    degrees_between: lunarPhase.degrees_between_s_m.toFixed(2),
    emoji: lunarPhase.moon_emoji,
  });
}

export function aspectToContext(
  aspect: AspectModel,
  isSynastry = false,
  isTransit = false,
): string {
  if (isSynastry) {
    return selfClosingTag("aspect", {
      type: aspect.aspect,
      p1_name: aspect.p1_name,
      p1_owner: aspect.p1_owner,
      p2_name: aspect.p2_name,
      p2_owner: isTransit ? "Transit" : aspect.p2_owner,
      orb: aspect.orbit.toFixed(2),
      angle: String(aspect.aspect_degrees),
    });
  }

  return selfClosingTag("aspect", {
    type: aspect.aspect,
    p1: aspect.p1_name,
    p2: aspect.p2_name,
    orb: aspect.orbit.toFixed(2),
    angle: String(aspect.aspect_degrees),
    movement: aspect.aspect_movement.toLowerCase(),
  });
}

export function pointInHouseToContext(pointInHouse: PointInHouseModel): string {
  const attrs: Record<string, unknown> = {
    point_name: pointInHouse.point_name,
    point_owner: pointInHouse.point_owner_name,
    degree: pointInHouse.point_degree.toFixed(2),
    sign: pointInHouse.point_sign,
  };

  if (pointInHouse.point_owner_house_name) {
    attrs.owner_house = pointInHouse.point_owner_house_name;
  }

  attrs.projected_house = pointInHouse.projected_house_name;
  attrs.projected_house_owner = pointInHouse.projected_house_owner_name;

  return selfClosingTag("point_in_house", attrs);
}

export function houseComparisonToContext(
  houseComparison: HouseComparisonModel,
  isTransit = false,
): string {
  const lines = [openTag("house_overlay")];

  if (houseComparison.first_points_in_second_houses.length > 0) {
    lines.push(
      `  ${openTag("first_points_in_second", {
        subject: houseComparison.first_subject_name,
        target: houseComparison.second_subject_name,
      })}`,
    );
    for (const point of houseComparison.first_points_in_second_houses) {
      lines.push(`    ${pointInHouseToContext(point)}`);
    }
    lines.push(`  ${closeTag("first_points_in_second")}`);
  }

  if (houseComparison.second_points_in_first_houses.length > 0) {
    lines.push(
      `  ${openTag("second_points_in_first", {
        subject: isTransit ? "Transit" : houseComparison.second_subject_name,
        target: houseComparison.first_subject_name,
      })}`,
    );
    for (const point of houseComparison.second_points_in_first_houses) {
      lines.push(`    ${pointInHouseToContext(point)}`);
    }
    lines.push(`  ${closeTag("second_points_in_first")}`);
  }

  if (houseComparison.first_cusps_in_second_houses.length > 0) {
    lines.push(
      `  ${openTag("first_cusps_in_second", {
        subject: houseComparison.first_subject_name,
        target: isTransit ? "Transit" : houseComparison.second_subject_name,
      })}`,
    );
    for (const point of houseComparison.first_cusps_in_second_houses) {
      lines.push(`    ${pointInHouseToContext(point)}`);
    }
    lines.push(`  ${closeTag("first_cusps_in_second")}`);
  }

  if (houseComparison.second_cusps_in_first_houses.length > 0) {
    lines.push(
      `  ${openTag("second_cusps_in_first", {
        subject: isTransit ? "Transit" : houseComparison.second_subject_name,
        target: houseComparison.first_subject_name,
      })}`,
    );
    for (const point of houseComparison.second_cusps_in_first_houses) {
      lines.push(`    ${pointInHouseToContext(point)}`);
    }
    lines.push(`  ${closeTag("second_cusps_in_first")}`);
  }

  lines.push(closeTag("house_overlay"));
  return lines.join("\n");
}

export function elementDistributionToContext(distribution: ElementDistributionModel): string {
  return selfClosingTag("element_distribution", {
    fire: `${distribution.fire_percentage}%`,
    earth: `${distribution.earth_percentage}%`,
    air: `${distribution.air_percentage}%`,
    water: `${distribution.water_percentage}%`,
  });
}

export function qualityDistributionToContext(distribution: QualityDistributionModel): string {
  return selfClosingTag("quality_distribution", {
    cardinal: `${distribution.cardinal_percentage}%`,
    fixed: `${distribution.fixed_percentage}%`,
    mutable: `${distribution.mutable_percentage}%`,
  });
}

export function astrologicalSubjectToContext(
  subject: AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel,
  isTransitSubject = false,
): string {
  const lines = [openTag("chart", { name: subject.name })];

  if (isAstrologicalSubjectModel(subject) && !isPlanetReturnModel(subject) && !isCompositeSubjectModel(subject)) {
    lines.push(
      `  ${selfClosingTag(isTransitSubject ? "transit_data" : "birth_data", {
        date: `${subject.year}-${String(subject.month).padStart(2, "0")}-${String(subject.day).padStart(2, "0")} ${String(subject.hour).padStart(2, "0")}:${String(subject.minute).padStart(2, "0")}`,
        city: subject.city,
        nation: subject.nation,
        lat: subject.lat.toFixed(2),
        lng: subject.lng.toFixed(2),
        lng_dir: subject.lng < 0 ? "W" : "E",
        tz: subject.tz_str,
      })}`,
    );
  }

  const configAttrs: Record<string, unknown> = {
    zodiac: subject.zodiac_type,
    house_system: subject.houses_system_name,
    perspective: subject.perspective_type,
  };
  if (subject.sidereal_mode) {
    configAttrs.sidereal_mode = subject.sidereal_mode;
  }
  lines.push(`  ${selfClosingTag("config", configAttrs)}`);

  if (isCompositeSubjectModel(subject)) {
    lines.push(
      `  ${selfClosingTag("composite_info", {
        type: subject.composite_chart_type,
        first_subject: subject.first_subject.name,
        second_subject: subject.second_subject.name,
      })}`,
    );
  }

  if (isPlanetReturnModel(subject)) {
    lines.push(`  ${selfClosingTag("return_info", { type: subject.return_type })}`);
  }

  const celestialPointNames = [
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "chiron",
    "mean_lilith",
    "true_lilith",
    "ceres",
    "pallas",
    "juno",
    "vesta",
  ] as const;

  const planets = celestialPointNames
    .map(name => subject[name])
    .filter(isKerykeionPointModel)
    .map(point => `    ${kerykeionPointToContext(point)}`);

  if (planets.length > 0) {
    lines.push(`  ${openTag("planets")}`);
    lines.push(...planets);
    lines.push(`  ${closeTag("planets")}`);
  }

  const axisNames = [
    "ascendant",
    "descendant",
    "medium_coeli",
    "imum_coeli",
    "vertex",
    "anti_vertex",
    "true_north_lunar_node",
    "true_south_lunar_node",
  ] as const;

  const axes = axisNames
    .map(name => subject[name])
    .filter(isKerykeionPointModel)
    .map(point => `    ${kerykeionPointToContext(point)}`);

  if (axes.length > 0) {
    lines.push(`  ${openTag("axes")}`);
    lines.push(...axes);
    lines.push(`  ${closeTag("axes")}`);
  }

  const houseNames = [
    "first_house",
    "second_house",
    "third_house",
    "fourth_house",
    "fifth_house",
    "sixth_house",
    "seventh_house",
    "eighth_house",
    "ninth_house",
    "tenth_house",
    "eleventh_house",
    "twelfth_house",
  ] as const;

  lines.push(`  ${openTag("houses")}`);
  for (const houseName of houseNames) {
    const house = subject[houseName];
    if (house) {
      lines.push(
        `    ${selfClosingTag("house", {
          name: house.name,
          cusp: house.position.toFixed(2),
          sign: SIGN_FULL_NAMES[house.sign] ?? house.sign,
        })}`,
      );
    }
  }
  lines.push(`  ${closeTag("houses")}`);

  if (subject.lunar_phase) {
    lines.push(`  ${lunarPhaseToContext(subject.lunar_phase)}`);
  }

  lines.push(closeTag("chart"));
  return lines.join("\n");
}

export function singleChartDataToContext(chartData: SingleChartDataModel): string {
  const lines = [openTag("chart_analysis", { type: chartData.chart_type })];

  for (const line of astrologicalSubjectToContext(chartData.subject).split("\n")) {
    lines.push(`  ${line}`);
  }

  lines.push(`  ${elementDistributionToContext(chartData.element_distribution)}`);
  lines.push(`  ${qualityDistributionToContext(chartData.quality_distribution)}`);

  if (chartData.aspects.length > 0) {
    lines.push(`  ${openTag("aspects", { count: String(chartData.aspects.length) })}`);
    for (const aspect of chartData.aspects) {
      lines.push(`    ${aspectToContext(aspect)}`);
    }
    lines.push(`  ${closeTag("aspects")}`);
  }

  lines.push(`  ${textElement("active_points", chartData.active_points.join(", "))}`);
  lines.push(
    `  ${textElement(
      "active_aspects",
      chartData.active_aspects.map(aspect => `${aspect.name} (${aspect.orb})`).join(", "),
    )}`,
  );

  lines.push(closeTag("chart_analysis"));
  return lines.join("\n");
}

export function dualChartDataToContext(chartData: DualChartDataModel): string {
  const lines = [openTag("chart_analysis", { type: chartData.chart_type })];
  const isTransit = chartData.chart_type === "Transit";

  lines.push(`  ${openTag("first_subject")}`);
  for (const line of astrologicalSubjectToContext(chartData.first_subject).split("\n")) {
    lines.push(`    ${line}`);
  }
  lines.push(`  ${closeTag("first_subject")}`);

  const wrapperTag = isTransit ? "transit_subject" : "second_subject";
  lines.push(`  ${openTag(wrapperTag)}`);
  for (const line of astrologicalSubjectToContext(chartData.second_subject, isTransit).split("\n")) {
    lines.push(`    ${line}`);
  }
  lines.push(`  ${closeTag(wrapperTag)}`);

  if (chartData.aspects.length > 0) {
    lines.push(`  ${openTag("aspects", { count: String(chartData.aspects.length) })}`);
    for (const aspect of chartData.aspects) {
      lines.push(`    ${aspectToContext(aspect, true, isTransit)}`);
    }
    lines.push(`  ${closeTag("aspects")}`);
  }

  if (chartData.house_comparison) {
    for (const line of houseComparisonToContext(chartData.house_comparison, isTransit).split("\n")) {
      lines.push(`  ${line}`);
    }
  }

  if (chartData.relationship_score) {
    lines.push(
      `  ${selfClosingTag("relationship_score", {
        value: String(chartData.relationship_score.score_value),
        max: "44",
        description: chartData.relationship_score.score_description,
        destiny_sign: String(chartData.relationship_score.is_destiny_sign).toLowerCase(),
      })}`,
    );
  }

  lines.push(`  ${elementDistributionToContext(chartData.element_distribution)}`);
  lines.push(`  ${qualityDistributionToContext(chartData.quality_distribution)}`);
  lines.push(`  ${textElement("active_points", chartData.active_points.join(", "))}`);
  lines.push(
    `  ${textElement(
      "active_aspects",
      chartData.active_aspects.map(aspect => `${aspect.name} (${aspect.orb})`).join(", "),
    )}`,
  );

  lines.push(closeTag("chart_analysis"));
  return lines.join("\n");
}

export function transitMomentToContext(transit: TransitMomentModel): string {
  if (transit.aspects.length === 0) {
    return selfClosingTag("transit_moment", { date: transit.date, aspects: "0" });
  }

  const lines = [openTag("transit_moment", { date: transit.date })];
  lines.push(`  ${openTag("aspects", { count: String(transit.aspects.length) })}`);
  for (const aspect of transit.aspects) {
    lines.push(`    ${aspectToContext(aspect, true, true)}`);
  }
  lines.push(`  ${closeTag("aspects")}`);
  lines.push(closeTag("transit_moment"));
  return lines.join("\n");
}

export function transitsTimeRangeToContext(transits: TransitsTimeRangeModel): string {
  const attrs: Record<string, unknown> = { moments: String(transits.transits.length) };
  if (transits.subject) {
    attrs.subject = transits.subject.name;
  }
  if (transits.dates && transits.dates.length > 0) {
    attrs.from_date = transits.dates[0];
    attrs.to_date = transits.dates[transits.dates.length - 1];
  }

  const lines = [openTag("transit_analysis", attrs)];
  for (const transit of transits.transits) {
    for (const line of transitMomentToContext(transit).split("\n")) {
      lines.push(`  ${line}`);
    }
  }
  lines.push(closeTag("transit_analysis"));
  return lines.join("\n");
}

export function moonPhaseOverviewToContext(overview: MoonPhaseOverviewModel): string {
  const lines = [
    openTag("moon_phase_overview", {
      timestamp: String(overview.timestamp),
      datestamp: overview.datestamp,
    }),
  ];

  const moon = overview.moon;
  lines.push(`  ${openTag("moon")}`);
  if (moon.phase !== null && moon.phase !== undefined) {
    lines.push(`    ${textElement("phase", moon.phase.toFixed(3))}`);
  }
  if (moon.phase_name) {
    lines.push(`    ${textElement("phase_name", moon.phase_name)}`);
  }
  if (moon.major_phase) {
    lines.push(`    ${textElement("major_phase", moon.major_phase)}`);
  }
  if (moon.stage) {
    lines.push(`    ${textElement("stage", moon.stage)}`);
  }
  if (moon.illumination) {
    lines.push(`    ${textElement("illumination", moon.illumination)}`);
  }
  if (moon.age_days !== null && moon.age_days !== undefined) {
    lines.push(`    ${textElement("age_days", String(moon.age_days))}`);
  }
  if (moon.lunar_cycle) {
    lines.push(`    ${textElement("lunar_cycle", moon.lunar_cycle)}`);
  }
  if (moon.emoji) {
    lines.push(`    ${textElement("emoji", moon.emoji)}`);
  }
  if (moon.zodiac) {
    lines.push(
      `    ${selfClosingTag("zodiac", {
        sun_sign: moon.zodiac.sun_sign,
        moon_sign: moon.zodiac.moon_sign,
      })}`,
    );
  }
  if (moon.moonrise) {
    lines.push(`    ${textElement("moonrise", moon.moonrise)}`);
  }
  if (moon.moonrise_timestamp !== null && moon.moonrise_timestamp !== undefined) {
    lines.push(`    ${textElement("moonrise_timestamp", String(moon.moonrise_timestamp))}`);
  }
  if (moon.moonset) {
    lines.push(`    ${textElement("moonset", moon.moonset)}`);
  }
  if (moon.moonset_timestamp !== null && moon.moonset_timestamp !== undefined) {
    lines.push(`    ${textElement("moonset_timestamp", String(moon.moonset_timestamp))}`);
  }
  if (moon.next_lunar_eclipse) {
    lines.push(
      `    ${selfClosingTag("next_lunar_eclipse", {
        timestamp:
          moon.next_lunar_eclipse.timestamp !== null && moon.next_lunar_eclipse.timestamp !== undefined
            ? String(moon.next_lunar_eclipse.timestamp)
            : null,
        datestamp: moon.next_lunar_eclipse.datestamp,
        type: moon.next_lunar_eclipse.type,
        visibility_regions: moon.next_lunar_eclipse.visibility_regions,
      })}`,
    );
  }

  if (moon.detailed) {
    lines.push(`    ${openTag("detailed")}`);
    if (moon.detailed.position) {
      lines.push(
        `      ${selfClosingTag("position", {
          altitude:
            moon.detailed.position.altitude !== null && moon.detailed.position.altitude !== undefined
              ? moon.detailed.position.altitude.toFixed(2)
              : null,
          azimuth:
            moon.detailed.position.azimuth !== null && moon.detailed.position.azimuth !== undefined
              ? moon.detailed.position.azimuth.toFixed(2)
              : null,
          distance:
            moon.detailed.position.distance !== null && moon.detailed.position.distance !== undefined
              ? moon.detailed.position.distance.toFixed(2)
              : null,
          parallactic_angle:
            moon.detailed.position.parallactic_angle !== null
            && moon.detailed.position.parallactic_angle !== undefined
              ? moon.detailed.position.parallactic_angle.toFixed(2)
              : null,
          phase_angle:
            moon.detailed.position.phase_angle !== null && moon.detailed.position.phase_angle !== undefined
              ? moon.detailed.position.phase_angle.toFixed(2)
              : null,
        })}`,
      );
    }
    if (moon.detailed.visibility) {
      const visibilityAttrs: Record<string, unknown> = {
        visible_hours:
          moon.detailed.visibility.visible_hours !== null && moon.detailed.visibility.visible_hours !== undefined
            ? moon.detailed.visibility.visible_hours.toFixed(1)
            : null,
        best_viewing_time: moon.detailed.visibility.best_viewing_time,
        visibility_rating: moon.detailed.visibility.visibility_rating,
        illumination: moon.detailed.visibility.illumination,
      };
      if (moon.detailed.visibility.viewing_conditions) {
        lines.push(`      ${openTag("visibility", visibilityAttrs)}`);
        const conditions = moon.detailed.visibility.viewing_conditions;
        const conditionAttrs: Record<string, unknown> = { phase_quality: conditions.phase_quality };
        if (conditions.recommended_equipment) {
          lines.push(`        ${openTag("viewing_conditions", conditionAttrs)}`);
          lines.push(
            `          ${selfClosingTag("recommended_equipment", {
              filters: conditions.recommended_equipment.filters,
              telescope: conditions.recommended_equipment.telescope,
              best_magnification: conditions.recommended_equipment.best_magnification,
            })}`,
          );
          lines.push(`        ${closeTag("viewing_conditions")}`);
        }
        else {
          lines.push(`        ${selfClosingTag("viewing_conditions", conditionAttrs)}`);
        }
        lines.push(`      ${closeTag("visibility")}`);
      }
      else {
        lines.push(`      ${selfClosingTag("visibility", visibilityAttrs)}`);
      }
    }
    if (moon.detailed.upcoming_phases) {
      lines.push(`      ${openTag("upcoming_phases")}`);
      for (const [phaseTag, phaseWindow] of [
        ["new_moon", moon.detailed.upcoming_phases.new_moon],
        ["first_quarter", moon.detailed.upcoming_phases.first_quarter],
        ["full_moon", moon.detailed.upcoming_phases.full_moon],
        ["last_quarter", moon.detailed.upcoming_phases.last_quarter],
      ] as const) {
        if (!phaseWindow) {
          continue;
        }
        lines.push(`        ${openTag(phaseTag)}`);
        for (const [momentTag, moment] of [
          ["last", phaseWindow.last],
          ["next", phaseWindow.next],
        ] as const) {
          if (!moment) {
            continue;
          }
          lines.push(
            `          ${selfClosingTag(momentTag, {
              timestamp:
                moment.timestamp !== null && moment.timestamp !== undefined ? String(moment.timestamp) : null,
              datestamp: moment.datestamp,
              days_ago: moment.days_ago !== null && moment.days_ago !== undefined ? String(moment.days_ago) : null,
              days_ahead:
                moment.days_ahead !== null && moment.days_ahead !== undefined
                  ? String(moment.days_ahead)
                  : null,
              name: moment.name,
              description: moment.description,
            })}`,
          );
        }
        lines.push(`        ${closeTag(phaseTag)}`);
      }
      lines.push(`      ${closeTag("upcoming_phases")}`);
    }
    if (moon.detailed.illumination_details) {
      lines.push(
        `      ${selfClosingTag("illumination_details", {
          percentage:
            moon.detailed.illumination_details.percentage !== null
            && moon.detailed.illumination_details.percentage !== undefined
              ? moon.detailed.illumination_details.percentage.toFixed(1)
              : null,
          visible_fraction:
            moon.detailed.illumination_details.visible_fraction !== null
            && moon.detailed.illumination_details.visible_fraction !== undefined
              ? moon.detailed.illumination_details.visible_fraction.toFixed(4)
              : null,
          phase_angle:
            moon.detailed.illumination_details.phase_angle !== null
            && moon.detailed.illumination_details.phase_angle !== undefined
              ? moon.detailed.illumination_details.phase_angle.toFixed(2)
              : null,
        })}`,
      );
    }
    lines.push(`    ${closeTag("detailed")}`);
  }

  if (moon.events) {
    const eventAttrs: Record<string, unknown> = {
      moonrise_visible:
        moon.events.moonrise_visible !== null && moon.events.moonrise_visible !== undefined
          ? String(moon.events.moonrise_visible).toLowerCase()
          : null,
      moonset_visible:
        moon.events.moonset_visible !== null && moon.events.moonset_visible !== undefined
          ? String(moon.events.moonset_visible).toLowerCase()
          : null,
    };
    if (moon.events.optimal_viewing_period) {
      lines.push(`    ${openTag("events", eventAttrs)}`);
      const optimal = moon.events.optimal_viewing_period;
      const optimalAttrs: Record<string, unknown> = {
        start_time: optimal.start_time,
        end_time: optimal.end_time,
        duration_hours:
          optimal.duration_hours !== null && optimal.duration_hours !== undefined
            ? optimal.duration_hours.toFixed(1)
            : null,
        viewing_quality: optimal.viewing_quality,
      };
      if (optimal.recommendations && optimal.recommendations.length > 0) {
        lines.push(`      ${openTag("optimal_viewing_period", optimalAttrs)}`);
        for (const recommendation of optimal.recommendations) {
          lines.push(`        ${textElement("recommendation", recommendation)}`);
        }
        lines.push(`      ${closeTag("optimal_viewing_period")}`);
      }
      else {
        lines.push(`      ${selfClosingTag("optimal_viewing_period", optimalAttrs)}`);
      }
      lines.push(`    ${closeTag("events")}`);
    }
    else {
      lines.push(`    ${selfClosingTag("events", eventAttrs)}`);
    }
  }

  lines.push(`  ${closeTag("moon")}`);

  if (overview.sun) {
    lines.push(`  ${openTag("sun")}`);
    if (overview.sun.sunrise !== null && overview.sun.sunrise !== undefined) {
      lines.push(`    ${textElement("sunrise", String(overview.sun.sunrise))}`);
    }
    if (overview.sun.sunrise_timestamp) {
      lines.push(`    ${textElement("sunrise_timestamp", overview.sun.sunrise_timestamp)}`);
    }
    if (overview.sun.sunset !== null && overview.sun.sunset !== undefined) {
      lines.push(`    ${textElement("sunset", String(overview.sun.sunset))}`);
    }
    if (overview.sun.sunset_timestamp) {
      lines.push(`    ${textElement("sunset_timestamp", overview.sun.sunset_timestamp)}`);
    }
    if (overview.sun.solar_noon) {
      lines.push(`    ${textElement("solar_noon", overview.sun.solar_noon)}`);
    }
    if (overview.sun.day_length) {
      lines.push(`    ${textElement("day_length", overview.sun.day_length)}`);
    }
    if (overview.sun.position) {
      lines.push(
        `    ${selfClosingTag("position", {
          altitude:
            overview.sun.position.altitude !== null && overview.sun.position.altitude !== undefined
              ? overview.sun.position.altitude.toFixed(2)
              : null,
          azimuth:
            overview.sun.position.azimuth !== null && overview.sun.position.azimuth !== undefined
              ? overview.sun.position.azimuth.toFixed(2)
              : null,
          distance:
            overview.sun.position.distance !== null && overview.sun.position.distance !== undefined
              ? overview.sun.position.distance.toFixed(2)
              : null,
        })}`,
      );
    }
    if (overview.sun.next_solar_eclipse) {
      lines.push(
        `    ${selfClosingTag("next_solar_eclipse", {
          timestamp:
            overview.sun.next_solar_eclipse.timestamp !== null
            && overview.sun.next_solar_eclipse.timestamp !== undefined
              ? String(overview.sun.next_solar_eclipse.timestamp)
              : null,
          datestamp: overview.sun.next_solar_eclipse.datestamp,
          type: overview.sun.next_solar_eclipse.type,
          visibility_regions: overview.sun.next_solar_eclipse.visibility_regions,
        })}`,
      );
    }
    lines.push(`  ${closeTag("sun")}`);
  }

  if (overview.location) {
    lines.push(
      `  ${selfClosingTag("location", {
        latitude: overview.location.latitude,
        longitude: overview.location.longitude,
        precision:
          overview.location.precision !== null && overview.location.precision !== undefined
            ? String(overview.location.precision)
            : null,
        using_default_location:
          overview.location.using_default_location !== null
          && overview.location.using_default_location !== undefined
            ? String(overview.location.using_default_location).toLowerCase()
            : null,
        note: overview.location.note,
      })}`,
    );
  }

  lines.push(closeTag("moon_phase_overview"));
  return lines.join("\n");
}

export function toContext(
  model:
    | KerykeionPointModel
    | LunarPhaseModel
    | AstrologicalSubjectModel
    | CompositeSubjectModel
    | PlanetReturnModel
    | AspectModel
    | SingleChartDataModel
    | DualChartDataModel
    | ElementDistributionModel
    | QualityDistributionModel
    | TransitMomentModel
    | TransitsTimeRangeModel
    | PointInHouseModel
    | HouseComparisonModel
    | MoonPhaseOverviewModel,
): string {
  if (isSingleChartDataModel(model)) {
    return singleChartDataToContext(model);
  }
  if (isDualChartDataModel(model)) {
    return dualChartDataToContext(model);
  }
  if (isTransitsTimeRangeModel(model)) {
    return transitsTimeRangeToContext(model);
  }
  if (isTransitMomentModel(model)) {
    return transitMomentToContext(model);
  }
  if (isMoonPhaseOverviewModel(model)) {
    return moonPhaseOverviewToContext(model);
  }
  if (isAstrologicalBaseModel(model)) {
    return astrologicalSubjectToContext(
      model,
    );
  }
  if (isKerykeionPointModel(model)) {
    return kerykeionPointToContext(model);
  }
  if (isLunarPhaseModel(model)) {
    return lunarPhaseToContext(model);
  }
  if (isAspectModel(model)) {
    return aspectToContext(model);
  }
  if (isElementDistributionModel(model)) {
    return elementDistributionToContext(model);
  }
  if (isQualityDistributionModel(model)) {
    return qualityDistributionToContext(model);
  }
  if (isPointInHouseModel(model)) {
    return pointInHouseToContext(model);
  }
  if (isHouseComparisonModel(model)) {
    return houseComparisonToContext(model);
  }

  const rawModel = model as unknown;
  const typeName
    = typeof rawModel === "object" && rawModel !== null
      ? (rawModel as { constructor?: { name?: string } }).constructor?.name ?? typeof rawModel
      : typeof rawModel;
  throw new TypeError(
    `Unsupported model type: ${typeName}. Supported types are: KerykeionPointModel, LunarPhaseModel, AstrologicalSubjectModel, CompositeSubjectModel, PlanetReturnModel, AspectModel, SingleChartDataModel, DualChartDataModel, ElementDistributionModel, QualityDistributionModel, TransitMomentModel, TransitsTimeRangeModel, PointInHouseModel, HouseComparisonModel, MoonPhaseOverviewModel`,
  );
}
