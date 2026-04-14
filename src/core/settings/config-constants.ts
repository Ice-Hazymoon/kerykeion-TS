import type { AstrologicalPoint } from "../schemas/literals";
import type { ActiveAspect } from "../schemas/models";

export const ZODIAC_TYPE_TROPICAL = "Tropical";
export const ZODIAC_TYPE_SIDEREAL = "Sidereal";

export const PERSPECTIVE_APPARENT_GEOCENTRIC = "Apparent Geocentric";
export const PERSPECTIVE_TRUE_GEOCENTRIC = "True Geocentric";
export const PERSPECTIVE_HELIOCENTRIC = "Heliocentric";
export const PERSPECTIVE_TOPOCENTRIC = "Topocentric";

export const CHART_TYPE_NATAL = "Natal";
export const CHART_TYPE_TRANSIT = "Transit";
export const CHART_TYPE_SYNASTRY = "Synastry";
export const CHART_TYPE_COMPOSITE = "Composite";
export const CHART_TYPE_SINGLE_RETURN = "SingleReturnChart";
export const CHART_TYPE_DUAL_RETURN = "DualReturnChart";

export const DEFAULT_CITY = "Greenwich";
export const DEFAULT_NATION = "GB";
export const DEFAULT_TIMEZONE = "Etc/GMT";
export const DEFAULT_LATITUDE = 51.5074;
export const DEFAULT_LONGITUDE = 0.0;

export const DEGREES_FULL_CIRCLE = 360;
export const DEGREES_HALF_CIRCLE = 180;
export const DEGREES_PER_SIGN = 30;
export const LUNAR_PHASES_COUNT = 28;

export const ASPECT_DEGREE_CONJUNCTION = 0;
export const ASPECT_DEGREE_SEMI_SEXTILE = 30;
export const ASPECT_DEGREE_SEMI_SQUARE = 45;
export const ASPECT_DEGREE_SEXTILE = 60;
export const ASPECT_DEGREE_QUINTILE = 72;
export const ASPECT_DEGREE_SQUARE = 90;
export const ASPECT_DEGREE_TRINE = 120;
export const ASPECT_DEGREE_SESQUIQUADRATE = 135;
export const ASPECT_DEGREE_BIQUINTILE = 144;
export const ASPECT_DEGREE_QUINCUNX = 150;
export const ASPECT_DEGREE_OPPOSITION = 180;

export const HOUSE_SYSTEM_PLACIDUS = "P";
export const HOUSE_SYSTEM_KOCH = "K";
export const HOUSE_SYSTEM_WHOLE_SIGN = "W";
export const HOUSE_SYSTEM_CAMPANUS = "C";
export const HOUSE_SYSTEM_REGIOMONTANUS = "R";
export const HOUSE_SYSTEM_EQUAL = "E";
export const HOUSE_SYSTEM_MORINUS = "M";

export const ELEMENT_FIRE = "Fire";
export const ELEMENT_EARTH = "Earth";
export const ELEMENT_AIR = "Air";
export const ELEMENT_WATER = "Water";

export const QUALITY_CARDINAL = "Cardinal";
export const QUALITY_FIXED = "Fixed";
export const QUALITY_MUTABLE = "Mutable";

export const TRADITIONAL_ASTROLOGY_ACTIVE_POINTS: AstrologicalPoint[] = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "True_North_Lunar_Node",
  "True_South_Lunar_Node",
];

export const DEFAULT_ACTIVE_POINTS: AstrologicalPoint[] = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "True_North_Lunar_Node",
  "True_South_Lunar_Node",
  "Chiron",
  "Mean_Lilith",
  "Ascendant",
  "Medium_Coeli",
  "Descendant",
  "Imum_Coeli",
];

export const ALL_ACTIVE_POINTS: AstrologicalPoint[] = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Mean_North_Lunar_Node",
  "True_North_Lunar_Node",
  "Mean_South_Lunar_Node",
  "True_South_Lunar_Node",
  "Chiron",
  "Mean_Lilith",
  "True_Lilith",
  "Earth",
  "Pholus",
  "Ceres",
  "Pallas",
  "Juno",
  "Vesta",
  "Eris",
  "Sedna",
  "Haumea",
  "Makemake",
  "Ixion",
  "Orcus",
  "Quaoar",
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
  "Ascendant",
  "Medium_Coeli",
  "Descendant",
  "Imum_Coeli",
  "Vertex",
  "Anti_Vertex",
  "Pars_Fortunae",
  "Pars_Spiritus",
  "Pars_Amoris",
  "Pars_Fidei",
];

export const DEFAULT_ACTIVE_ASPECTS: ActiveAspect[] = [
  { name: "conjunction", orb: 10 },
  { name: "opposition", orb: 10 },
  { name: "trine", orb: 8 },
  { name: "sextile", orb: 6 },
  { name: "square", orb: 5 },
  { name: "quintile", orb: 1 },
];

export const ALL_ACTIVE_ASPECTS: ActiveAspect[] = [
  { name: "conjunction", orb: 10 },
  { name: "opposition", orb: 10 },
  { name: "trine", orb: 8 },
  { name: "sextile", orb: 6 },
  { name: "square", orb: 5 },
  { name: "quintile", orb: 1 },
  { name: "semi-sextile", orb: 1 },
  { name: "semi-square", orb: 1 },
  { name: "sesquiquadrate", orb: 1 },
  { name: "biquintile", orb: 1 },
  { name: "quincunx", orb: 1 },
];

export const DISCEPOLO_SCORE_ACTIVE_ASPECTS: ActiveAspect[] = [
  { name: "conjunction", orb: 8 },
  { name: "semi-sextile", orb: 2 },
  { name: "semi-square", orb: 2 },
  { name: "sextile", orb: 4 },
  { name: "square", orb: 5 },
  { name: "trine", orb: 7 },
  { name: "sesquiquadrate", orb: 2 },
  { name: "opposition", orb: 8 },
];
