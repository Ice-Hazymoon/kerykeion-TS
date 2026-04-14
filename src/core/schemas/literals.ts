export const zodiacTypes = ["Tropical", "Sidereal"] as const;
export type ZodiacType = (typeof zodiacTypes)[number];

export const signs = [
  "Ari",
  "Tau",
  "Gem",
  "Can",
  "Leo",
  "Vir",
  "Lib",
  "Sco",
  "Sag",
  "Cap",
  "Aqu",
  "Pis",
] as const;
export type Sign = (typeof signs)[number];

export const signNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
export type SignNumber = (typeof signNumbers)[number];

export const aspectMovementTypes = ["Applying", "Separating", "Static"] as const;
export type AspectMovementType = (typeof aspectMovementTypes)[number];

export const houses = [
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
] as const;
export type House = (typeof houses)[number];

export const houseNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type HouseNumber = (typeof houseNumbers)[number];

export const astrologicalPoints = [
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
  "Pars_Fortunae",
  "Pars_Spiritus",
  "Pars_Amoris",
  "Pars_Fidei",
  "Vertex",
  "Anti_Vertex",
  "Ascendant",
  "Medium_Coeli",
  "Descendant",
  "Imum_Coeli",
] as const;
export type AstrologicalPoint = (typeof astrologicalPoints)[number];
export type Planet = AstrologicalPoint;
export type AxialCusps = AstrologicalPoint;

export const elements = ["Air", "Fire", "Earth", "Water"] as const;
export type Element = (typeof elements)[number];

export const qualities = ["Cardinal", "Fixed", "Mutable"] as const;
export type Quality = (typeof qualities)[number];

export const chartTypes = [
  "Natal",
  "Synastry",
  "Transit",
  "Composite",
  "DualReturnChart",
  "SingleReturnChart",
] as const;
export type ChartType = (typeof chartTypes)[number];

export const pointTypes = ["AstrologicalPoint", "House"] as const;
export type PointType = (typeof pointTypes)[number];

export const lunarPhaseEmojis = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"] as const;
export type LunarPhaseEmoji = (typeof lunarPhaseEmojis)[number];

export const lunarPhaseNames = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
] as const;
export type LunarPhaseName = (typeof lunarPhaseNames)[number];

export const siderealModes = [
  "FAGAN_BRADLEY",
  "LAHIRI",
  "DELUCE",
  "RAMAN",
  "USHASHASHI",
  "KRISHNAMURTI",
  "DJWHAL_KHUL",
  "YUKTESHWAR",
  "JN_BHASIN",
  "BABYL_KUGLER1",
  "BABYL_KUGLER2",
  "BABYL_KUGLER3",
  "BABYL_HUBER",
  "BABYL_ETPSC",
  "ALDEBARAN_15TAU",
  "HIPPARCHOS",
  "SASSANIAN",
  "J2000",
  "J1900",
  "B1950",
  "ARYABHATA",
  "ARYABHATA_522",
  "ARYABHATA_MSUN",
  "GALCENT_0SAG",
  "GALCENT_COCHRANE",
  "GALCENT_MULA_WILHELM",
  "GALCENT_RGILBRAND",
  "GALEQU_FIORENZA",
  "GALEQU_IAU1958",
  "GALEQU_MULA",
  "GALEQU_TRUE",
  "GALALIGN_MARDYKS",
  "KRISHNAMURTI_VP291",
  "LAHIRI_1940",
  "LAHIRI_ICRC",
  "LAHIRI_VP285",
  "SURYASIDDHANTA",
  "SURYASIDDHANTA_MSUN",
  "SS_CITRA",
  "SS_REVATI",
  "TRUE_CITRA",
  "TRUE_MULA",
  "TRUE_PUSHYA",
  "TRUE_REVATI",
  "TRUE_SHEORAN",
  "BABYL_BRITTON",
  "VALENS_MOON",
  "USER",
] as const;
export type SiderealMode = (typeof siderealModes)[number];

export const housesSystemIdentifiers = [
  "A",
  "B",
  "C",
  "D",
  "F",
  "H",
  "I",
  "i",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
] as const;
export type HousesSystemIdentifier = (typeof housesSystemIdentifiers)[number];

export const perspectiveTypes = [
  "Apparent Geocentric",
  "Heliocentric",
  "Topocentric",
  "True Geocentric",
] as const;
export type PerspectiveType = (typeof perspectiveTypes)[number];

export const signsEmojis = ["♈️", "♉️", "♊️", "♋️", "♌️", "♍️", "♎️", "♏️", "♐️", "♑️", "♒️", "♓️"] as const;
export type SignsEmoji = (typeof signsEmojis)[number];

export const chartThemes = [
  "light",
  "dark",
  "dark-high-contrast",
  "classic",
  "strawberry",
  "black-and-white",
] as const;
export type KerykeionChartTheme = (typeof chartThemes)[number];

export const chartStyles = ["classic", "modern"] as const;
export type KerykeionChartStyle = (typeof chartStyles)[number];

export const chartLanguages = ["EN", "FR", "PT", "IT", "CN", "ES", "RU", "TR", "DE", "HI"] as const;
export type KerykeionChartLanguage = (typeof chartLanguages)[number];

export const relationshipScoreDescriptions = [
  "Minimal",
  "Medium",
  "Important",
  "Very Important",
  "Exceptional",
  "Rare Exceptional",
] as const;
export type RelationshipScoreDescription = (typeof relationshipScoreDescriptions)[number];

export const compositeChartTypes = ["Midpoint"] as const;
export type CompositeChartType = (typeof compositeChartTypes)[number];

export const aspectNames = [
  "conjunction",
  "semi-sextile",
  "semi-square",
  "sextile",
  "quintile",
  "square",
  "trine",
  "sesquiquadrate",
  "biquintile",
  "quincunx",
  "opposition",
] as const;
export type AspectName = (typeof aspectNames)[number];

export const returnTypes = ["Lunar", "Solar"] as const;
export type ReturnType = (typeof returnTypes)[number];
