import type {
  AspectMovementType,
  AspectName,
  AstrologicalPoint,
  CompositeChartType,
  Element,
  House,
  HousesSystemIdentifier,
  KerykeionChartLanguage,
  KerykeionChartStyle,
  KerykeionChartTheme,
  LunarPhaseEmoji,
  LunarPhaseName,
  PerspectiveType,
  PointType,
  Quality,
  RelationshipScoreDescription,
  ReturnType,
  SiderealMode,
  Sign,
  SignNumber,
  SignsEmoji,
  ZodiacType,
} from "./literals";

export interface MoonPhaseSunPositionModel {
  altitude?: number | null;
  azimuth?: number | null;
  distance?: number | null;
}

export interface MoonPhaseSolarEclipseModel {
  timestamp?: number | null;
  datestamp?: string | null;
  type?: string | null;
  visibility_regions?: string | null;
}

export interface MoonPhaseSunInfoModel {
  sunrise?: number | null;
  sunrise_timestamp?: string | null;
  sunset?: number | null;
  sunset_timestamp?: string | null;
  solar_noon?: string | null;
  day_length?: string | null;
  position?: MoonPhaseSunPositionModel | null;
  next_solar_eclipse?: MoonPhaseSolarEclipseModel | null;
}

export interface MoonPhaseZodiacModel {
  sun_sign: Sign;
  moon_sign: Sign;
}

export interface MoonPhaseMoonPositionModel {
  altitude?: number | null;
  azimuth?: number | null;
  distance?: number | null;
  parallactic_angle?: number | null;
  phase_angle?: number | null;
}

export interface MoonPhaseViewingEquipmentModel {
  filters?: string | null;
  telescope?: string | null;
  best_magnification?: string | null;
}

export interface MoonPhaseViewingConditionsModel {
  phase_quality?: string | null;
  recommended_equipment?: MoonPhaseViewingEquipmentModel | null;
}

export interface MoonPhaseVisibilityModel {
  visible_hours?: number | null;
  best_viewing_time?: string | null;
  visibility_rating?: string | null;
  illumination?: string | null;
  viewing_conditions?: MoonPhaseViewingConditionsModel | null;
}

export interface MoonPhaseEventMomentModel {
  timestamp?: number | null;
  datestamp?: string | null;
  days_ago?: number | null;
  days_ahead?: number | null;
  name?: string | null;
  description?: string | null;
}

export interface MoonPhaseMajorPhaseWindowModel {
  last?: MoonPhaseEventMomentModel | null;
  next?: MoonPhaseEventMomentModel | null;
}

export interface MoonPhaseUpcomingPhasesModel {
  new_moon?: MoonPhaseMajorPhaseWindowModel | null;
  first_quarter?: MoonPhaseMajorPhaseWindowModel | null;
  full_moon?: MoonPhaseMajorPhaseWindowModel | null;
  last_quarter?: MoonPhaseMajorPhaseWindowModel | null;
}

export interface MoonPhaseIlluminationDetailsModel {
  percentage?: number | null;
  visible_fraction?: number | null;
  phase_angle?: number | null;
}

export interface MoonPhaseMoonDetailedModel {
  position?: MoonPhaseMoonPositionModel | null;
  visibility?: MoonPhaseVisibilityModel | null;
  upcoming_phases?: MoonPhaseUpcomingPhasesModel | null;
  illumination_details?: MoonPhaseIlluminationDetailsModel | null;
}

export interface MoonPhaseOptimalViewingPeriodModel {
  start_time?: string | null;
  end_time?: string | null;
  duration_hours?: number | null;
  viewing_quality?: string | null;
  recommendations?: string[] | null;
}

export interface MoonPhaseEventsModel {
  moonrise_visible?: boolean | null;
  moonset_visible?: boolean | null;
  optimal_viewing_period?: MoonPhaseOptimalViewingPeriodModel | null;
}

export interface MoonPhaseEclipseModel {
  timestamp?: number | null;
  datestamp?: string | null;
  type?: string | null;
  visibility_regions?: string | null;
}

export interface MoonPhaseMoonSummaryModel {
  phase?: number | null;
  phase_name?: LunarPhaseName | null;
  major_phase?: string | null;
  stage?: string | null;
  illumination?: string | null;
  age_days?: number | null;
  lunar_cycle?: string | null;
  emoji?: LunarPhaseEmoji | null;
  zodiac?: MoonPhaseZodiacModel | null;
  moonrise?: string | null;
  moonrise_timestamp?: number | null;
  moonset?: string | null;
  moonset_timestamp?: number | null;
  next_lunar_eclipse?: MoonPhaseEclipseModel | null;
  detailed?: MoonPhaseMoonDetailedModel | null;
  events?: MoonPhaseEventsModel | null;
}

export interface MoonPhaseLocationModel {
  latitude?: string | null;
  longitude?: string | null;
  precision?: number | null;
  using_default_location?: boolean | null;
  note?: string | null;
}

export interface MoonPhaseOverviewModel {
  timestamp: number;
  datestamp: string;
  sun?: MoonPhaseSunInfoModel | null;
  moon: MoonPhaseMoonSummaryModel;
  location?: MoonPhaseLocationModel | null;
}

export interface LunarPhaseModel {
  degrees_between_s_m: number;
  moon_phase: number;
  moon_emoji: LunarPhaseEmoji;
  moon_phase_name: LunarPhaseName;
}

export interface KerykeionPointModel {
  name: AstrologicalPoint | House;
  quality: Quality;
  element: Element;
  sign: Sign;
  sign_num: SignNumber;
  position: number;
  abs_pos: number;
  emoji: string;
  point_type: PointType;
  house?: House | null;
  retrograde?: boolean | null;
  speed?: number | null;
  declination?: number | null;
  magnitude?: number | null;
}

export interface AstrologicalBaseModel {
  name: string;
  city?: string | null;
  nation?: string | null;
  lng?: number | null;
  lat?: number | null;
  tz_str?: string | null;
  iso_formatted_local_datetime?: string | null;
  iso_formatted_utc_datetime?: string | null;
  julian_day?: number | null;
  day_of_week?: string | null;
  zodiac_type: ZodiacType;
  sidereal_mode: SiderealMode | null;
  houses_system_identifier: HousesSystemIdentifier;
  houses_system_name: string;
  perspective_type: PerspectiveType;
  ayanamsa_value?: number | null;
  sun?: KerykeionPointModel | null;
  moon?: KerykeionPointModel | null;
  mercury?: KerykeionPointModel | null;
  venus?: KerykeionPointModel | null;
  mars?: KerykeionPointModel | null;
  jupiter?: KerykeionPointModel | null;
  saturn?: KerykeionPointModel | null;
  uranus?: KerykeionPointModel | null;
  neptune?: KerykeionPointModel | null;
  pluto?: KerykeionPointModel | null;
  ascendant?: KerykeionPointModel | null;
  descendant?: KerykeionPointModel | null;
  medium_coeli?: KerykeionPointModel | null;
  imum_coeli?: KerykeionPointModel | null;
  chiron?: KerykeionPointModel | null;
  earth?: KerykeionPointModel | null;
  pholus?: KerykeionPointModel | null;
  mean_lilith?: KerykeionPointModel | null;
  true_lilith?: KerykeionPointModel | null;
  ceres?: KerykeionPointModel | null;
  pallas?: KerykeionPointModel | null;
  juno?: KerykeionPointModel | null;
  vesta?: KerykeionPointModel | null;
  eris?: KerykeionPointModel | null;
  sedna?: KerykeionPointModel | null;
  haumea?: KerykeionPointModel | null;
  makemake?: KerykeionPointModel | null;
  ixion?: KerykeionPointModel | null;
  orcus?: KerykeionPointModel | null;
  quaoar?: KerykeionPointModel | null;
  regulus?: KerykeionPointModel | null;
  spica?: KerykeionPointModel | null;
  aldebaran?: KerykeionPointModel | null;
  antares?: KerykeionPointModel | null;
  sirius?: KerykeionPointModel | null;
  fomalhaut?: KerykeionPointModel | null;
  algol?: KerykeionPointModel | null;
  betelgeuse?: KerykeionPointModel | null;
  canopus?: KerykeionPointModel | null;
  procyon?: KerykeionPointModel | null;
  arcturus?: KerykeionPointModel | null;
  pollux?: KerykeionPointModel | null;
  deneb?: KerykeionPointModel | null;
  altair?: KerykeionPointModel | null;
  rigel?: KerykeionPointModel | null;
  achernar?: KerykeionPointModel | null;
  capella?: KerykeionPointModel | null;
  vega?: KerykeionPointModel | null;
  alcyone?: KerykeionPointModel | null;
  alphecca?: KerykeionPointModel | null;
  algorab?: KerykeionPointModel | null;
  deneb_algedi?: KerykeionPointModel | null;
  alkaid?: KerykeionPointModel | null;
  pars_fortunae?: KerykeionPointModel | null;
  pars_spiritus?: KerykeionPointModel | null;
  pars_amoris?: KerykeionPointModel | null;
  pars_fidei?: KerykeionPointModel | null;
  vertex?: KerykeionPointModel | null;
  anti_vertex?: KerykeionPointModel | null;
  first_house: KerykeionPointModel;
  second_house: KerykeionPointModel;
  third_house: KerykeionPointModel;
  fourth_house: KerykeionPointModel;
  fifth_house: KerykeionPointModel;
  sixth_house: KerykeionPointModel;
  seventh_house: KerykeionPointModel;
  eighth_house: KerykeionPointModel;
  ninth_house: KerykeionPointModel;
  tenth_house: KerykeionPointModel;
  eleventh_house: KerykeionPointModel;
  twelfth_house: KerykeionPointModel;
  mean_north_lunar_node?: KerykeionPointModel | null;
  true_north_lunar_node?: KerykeionPointModel | null;
  mean_south_lunar_node?: KerykeionPointModel | null;
  true_south_lunar_node?: KerykeionPointModel | null;
  houses_names_list: House[];
  active_points: AstrologicalPoint[];
  lunar_phase?: LunarPhaseModel | null;
}

export interface AstrologicalSubjectModel extends AstrologicalBaseModel {
  city: string;
  nation: string;
  lng: number;
  lat: number;
  tz_str: string;
  iso_formatted_local_datetime: string;
  iso_formatted_utc_datetime: string;
  julian_day: number;
  day_of_week: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  is_diurnal: boolean;
}

export interface CompositeSubjectModel extends AstrologicalBaseModel {
  first_subject: AstrologicalSubjectModel;
  second_subject: AstrologicalSubjectModel;
  composite_chart_type: CompositeChartType;
}

export interface PlanetReturnModel extends AstrologicalBaseModel {
  return_type: ReturnType;
}

export interface EphemerisDictModel {
  date: string;
  planets: KerykeionPointModel[];
  houses: KerykeionPointModel[];
}

export interface AspectModel {
  p1_name: string;
  p1_owner: string;
  p1_abs_pos: number;
  p2_name: string;
  p2_owner: string;
  p2_abs_pos: number;
  aspect: string;
  orbit: number;
  aspect_degrees: number;
  diff: number;
  p1: number;
  p2: number;
  p1_speed: number;
  p2_speed: number;
  aspect_movement: AspectMovementType;
}

export interface ZodiacSignModel {
  sign: Sign;
  quality: Quality;
  element: Element;
  emoji: SignsEmoji;
  sign_num: SignNumber;
}

export interface RelationshipScoreAspectModel {
  p1_name: string;
  p2_name: string;
  aspect: string;
  orbit: number;
}

export interface ScoreBreakdownItemModel {
  rule: string;
  description: string;
  points: number;
  details?: string | null;
}

export interface RelationshipScoreModel {
  score_value: number;
  score_description: RelationshipScoreDescription;
  is_destiny_sign: boolean;
  aspects: RelationshipScoreAspectModel[];
  score_breakdown: ScoreBreakdownItemModel[];
  subjects: AstrologicalSubjectModel[];
}

export interface ActiveAspect {
  name: AspectName;
  orb: number;
}

export interface TransitMomentModel {
  date: string;
  aspects: AspectModel[];
}

export interface SingleChartAspectsModel {
  subject: AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
  aspects: AspectModel[];
  active_points: AstrologicalPoint[];
  active_aspects: ActiveAspect[];
}

export interface DualChartAspectsModel {
  first_subject: AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
  second_subject: AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
  aspects: AspectModel[];
  active_points: AstrologicalPoint[];
  active_aspects: ActiveAspect[];
}

export interface TransitsTimeRangeModel {
  transits: TransitMomentModel[];
  subject?: AstrologicalSubjectModel | null;
  dates?: string[] | null;
}

export interface PointInHouseModel {
  point_name: string;
  point_degree: number;
  point_sign: string;
  point_owner_name: string;
  point_owner_house_number?: number | null;
  point_owner_house_name?: string | null;
  projected_house_number: number;
  projected_house_name: string;
  projected_house_owner_name: string;
}

export interface HouseComparisonModel {
  first_subject_name: string;
  second_subject_name: string;
  first_points_in_second_houses: PointInHouseModel[];
  second_points_in_first_houses: PointInHouseModel[];
  first_cusps_in_second_houses: PointInHouseModel[];
  second_cusps_in_first_houses: PointInHouseModel[];
}

export interface ElementDistributionModel {
  fire: number;
  earth: number;
  air: number;
  water: number;
  fire_percentage: number;
  earth_percentage: number;
  air_percentage: number;
  water_percentage: number;
}

export interface QualityDistributionModel {
  cardinal: number;
  fixed: number;
  mutable: number;
  cardinal_percentage: number;
  fixed_percentage: number;
  mutable_percentage: number;
}

export interface SingleChartDataModel {
  chart_type: "Natal" | "Composite" | "SingleReturnChart";
  subject: AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
  aspects: AspectModel[];
  element_distribution: ElementDistributionModel;
  quality_distribution: QualityDistributionModel;
  active_points: AstrologicalPoint[];
  active_aspects: ActiveAspect[];
}

export interface DualChartDataModel {
  chart_type: "Transit" | "Synastry" | "DualReturnChart";
  first_subject: AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
  second_subject: AstrologicalSubjectModel | PlanetReturnModel;
  aspects: AspectModel[];
  house_comparison?: HouseComparisonModel | null;
  relationship_score?: RelationshipScoreModel | null;
  element_distribution: ElementDistributionModel;
  quality_distribution: QualityDistributionModel;
  active_points: AstrologicalPoint[];
  active_aspects: ActiveAspect[];
}

export type ChartDataModel = SingleChartDataModel | DualChartDataModel;

export interface ChartRenderingOptions {
  theme?: KerykeionChartTheme;
  language?: KerykeionChartLanguage;
  style?: KerykeionChartStyle;
}
