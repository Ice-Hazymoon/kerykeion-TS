import { z } from "zod";

import {
  aspectNames,
  astrologicalPoints,
  chartLanguages,
  chartStyles,
  chartThemes,
  housesSystemIdentifiers,
  perspectiveTypes,
  siderealModes,
  zodiacTypes,
} from "../core/schemas/literals";

const pointLowerToCanonical = Object.fromEntries(
  astrologicalPoints.map(point => [point.toLowerCase(), point]),
) as Record<string, (typeof astrologicalPoints)[number]>;

const pointAliases: Record<string, (typeof astrologicalPoints)[number]> = {
  mean_node: "Mean_North_Lunar_Node",
  true_node: "True_North_Lunar_Node",
  north_node: "Mean_North_Lunar_Node",
  south_node: "Mean_South_Lunar_Node",
  mean_south_node: "Mean_South_Lunar_Node",
  true_south_node: "True_South_Lunar_Node",
  mc: "Medium_Coeli",
  ic: "Imum_Coeli",
  asc: "Ascendant",
  desc: "Descendant",
  lilith: "Mean_Lilith",
};

function normalizePointName(name: string): string {
  const lower = name.toLowerCase();
  return pointAliases[lower] ?? pointLowerToCanonical[lower] ?? name;
}

function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  }
  catch {
    return false;
  }
}

const timezoneSchema = z.string().refine(isValidTimeZone, {
  message: "Please use a valid timezone from the IANA database.",
});

const activePointSchema = z
  .string()
  .transform(value => normalizePointName(value))
  .refine(value => astrologicalPoints.includes(value as (typeof astrologicalPoints)[number]), {
    message: "Invalid astrological point.",
  })
  .transform(value => value as (typeof astrologicalPoints)[number]);

const activeAspectSchema = z
  .object({
    name: z.enum(aspectNames),
    orb: z.number(),
  })
  .strict();

const distributionMethodSchema = z.enum(["weighted", "pure_count"]);

const abstractBaseSubjectObject = z
  .object({
    year: z.number().int().min(1).max(3000),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    second: z.number().int().min(0).max(59).optional().default(0),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    altitude: z.number().nullable().optional(),
    city: z.string(),
    nation: z.string().nullable().optional(),
    timezone: timezoneSchema.nullable().optional(),
    is_dst: z.boolean().nullable().optional(),
    geonames_username: z.string().nullable().optional(),
  })
  .strict();

function refineAbstractBaseSubject(
  value: z.infer<typeof abstractBaseSubjectObject>,
  ctx: z.RefinementCtx,
) {
  const hasLat = value.latitude !== null && value.latitude !== undefined;
  const hasLng = value.longitude !== null && value.longitude !== undefined;
  const hasTz = value.timezone !== null && value.timezone !== undefined;
  const presentCoordinates = [hasLat, hasLng, hasTz].filter(Boolean).length;

  if (presentCoordinates === 0 && !value.geonames_username) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide latitude, longitude, timezone or specify geonames_username.",
    });
  }
  else if (presentCoordinates > 0 && presentCoordinates < 3 && !value.geonames_username) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide all location fields (latitude, longitude, timezone) or geonames_username.",
    });
  }

  if (value.nation && value.nation.toLowerCase() !== "null") {
    if (value.nation.length !== 2 || !/^[a-z]+$/i.test(value.nation)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nation"],
        message: "It must be a 2-letter country code (ISO 3166-1 alpha-2).",
      });
    }
  }
}

export const subjectSchema = abstractBaseSubjectObject
  .extend({
    name: z.string(),
    zodiac_type: z.enum(zodiacTypes).optional().default("Tropical"),
    sidereal_mode: z.enum(siderealModes).nullable().optional(),
    perspective_type: z.enum(perspectiveTypes).optional().default("Apparent Geocentric"),
    houses_system_identifier: z.enum(housesSystemIdentifiers).optional().default("P"),
    custom_ayanamsa_t0: z.number().nullable().optional(),
    custom_ayanamsa_ayan_t0: z.number().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    refineAbstractBaseSubject(value, ctx);
    if (value.sidereal_mode && value.zodiac_type !== "Sidereal") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["zodiac_type"],
        message: "Set zodiac_type='Sidereal' when sidereal_mode is provided.",
      });
    }
    if (value.sidereal_mode === "USER") {
      if (value.custom_ayanamsa_t0 == null || value.custom_ayanamsa_ayan_t0 == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "custom_ayanamsa_t0 and custom_ayanamsa_ayan_t0 are required when sidereal_mode='USER'.",
        });
      }
    }
  });

export const transitSubjectSchema = abstractBaseSubjectObject
  .extend({
    name: z.string().optional().default("Transit"),
  })
  .superRefine(refineAbstractBaseSubject);

const chartDataConfigurationSchema = z
  .object({
    active_points: z.array(activePointSchema).nullable().optional(),
    active_aspects: z.array(activeAspectSchema).nullable().optional(),
    distribution_method: distributionMethodSchema.optional().default("weighted"),
    custom_distribution_weights: z.record(z.string(), z.number()).nullable().optional(),
  })
  .strict();

const chartRenderingSchema = chartDataConfigurationSchema
  .extend({
    theme: z.enum(chartThemes).optional().default("classic"),
    language: z.enum(chartLanguages).optional().default("EN"),
    split_chart: z.boolean().optional().default(false),
    transparent_background: z.boolean().optional().default(false),
    show_house_position_comparison: z.boolean().optional().default(true),
    show_cusp_position_comparison: z.boolean().optional().default(true),
    show_degree_indicators: z.boolean().optional().default(true),
    show_aspect_icons: z.boolean().optional().default(true),
    custom_title: z
      .string()
      .max(40)
      .nullable()
      .optional()
      .transform((value) => {
        if (value == null) {
          return undefined;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }),
    style: z.enum(chartStyles).optional().default("classic"),
    show_zodiac_background_ring: z.boolean().optional().default(true),
    double_chart_aspect_grid_type: z.enum(["list", "table"]).optional().default("list"),
  })
  .strict();

const nowSubjectDefinitionSchema = z
  .object({
    name: z.string().optional().default("Now"),
    zodiac_type: z.enum(zodiacTypes).optional().default("Tropical"),
    sidereal_mode: z.enum(siderealModes).nullable().optional(),
    perspective_type: z.enum(perspectiveTypes).optional().default("Apparent Geocentric"),
    houses_system_identifier: z.enum(housesSystemIdentifiers).optional().default("P"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.sidereal_mode && value.zodiac_type !== "Sidereal") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["zodiac_type"],
        message: "Set zodiac_type='Sidereal' when sidereal_mode is provided.",
      });
    }
  });

export const birthDataRequestSchema = chartDataConfigurationSchema
  .extend({
    subject: subjectSchema,
  })
  .strict();

export const birthChartDataRequestSchema = chartDataConfigurationSchema
  .extend({
    subject: subjectSchema,
  })
  .strict();

export const birthChartRequestSchema = chartRenderingSchema
  .extend({
    subject: subjectSchema,
  })
  .strict();

export const synastryChartDataRequestSchema = chartDataConfigurationSchema
  .extend({
    first_subject: subjectSchema,
    second_subject: subjectSchema,
    include_house_comparison: z.boolean().optional().default(true),
    include_relationship_score: z.boolean().optional().default(true),
  })
  .strict();

export const synastryChartRequestSchema = chartRenderingSchema
  .extend({
    first_subject: subjectSchema,
    second_subject: subjectSchema,
    include_house_comparison: z.boolean().optional().default(true),
    include_relationship_score: z.boolean().optional().default(true),
  })
  .strict();

export const transitChartDataRequestSchema = chartDataConfigurationSchema
  .extend({
    first_subject: subjectSchema,
    transit_subject: transitSubjectSchema,
    include_house_comparison: z.boolean().optional().default(true),
  })
  .strict();

export const transitChartRequestSchema = chartRenderingSchema
  .extend({
    first_subject: subjectSchema,
    transit_subject: transitSubjectSchema,
    include_house_comparison: z.boolean().optional().default(true),
  })
  .strict();

export const compositeChartDataRequestSchema = chartDataConfigurationSchema
  .extend({
    first_subject: subjectSchema,
    second_subject: subjectSchema,
  })
  .strict();

export const compositeChartRequestSchema = chartRenderingSchema
  .extend({
    first_subject: subjectSchema,
    second_subject: subjectSchema,
  })
  .strict();

export const nowSubjectRequestSchema = nowSubjectDefinitionSchema;

export const nowChartRequestSchema = nowSubjectDefinitionSchema.merge(chartRenderingSchema);

const returnLocationSchema = z
  .object({
    city: z.string().nullable().optional(),
    nation: z.string().nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    timezone: timezoneSchema.nullable().optional(),
    altitude: z.number().nullable().optional(),
    geonames_username: z.string().nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasLat = value.latitude != null;
    const hasLng = value.longitude != null;
    const hasTz = value.timezone != null;
    const coordsCount = [hasLat, hasLng, hasTz].filter(Boolean).length;

    if (coordsCount === 0 && !value.geonames_username && !(value.city && value.nation)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide latitude, longitude, timezone, or supply geonames_username with city and nation.",
      });
    }
    else if (coordsCount > 0 && coordsCount < 3 && !value.geonames_username) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide all location fields (latitude, longitude, timezone) or geonames_username.",
      });
    }

    if (value.nation && (value.nation.length !== 2 || !/^[a-z]+$/i.test(value.nation))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nation"],
        message: "It must be a 2-letter country code (ISO 3166-1 alpha-2).",
      });
    }
  })
  .transform(value => ({
    ...value,
    nation: value.nation ? value.nation.toUpperCase() : value.nation,
    ...(value.geonames_username && value.latitude != null && value.longitude != null && value.timezone != null
      ? { geonames_username: undefined }
      : {}),
  }));

const planetaryReturnFields = {
  subject: subjectSchema,
  year: z.number().int().min(1).max(3000).nullable().optional(),
  month: z.number().int().min(1).max(12).nullable().optional(),
  day: z.number().int().min(1).max(31).nullable().optional().default(1),
  iso_datetime: z.string().nullable().optional(),
  wheel_type: z.enum(["dual", "single"]).optional().default("dual"),
  include_house_comparison: z.boolean().optional().default(true),
  return_location: returnLocationSchema.nullable().optional(),
} as const;

function withReturnValidation<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((value: any, ctx) => {
    if (!value.year && !value.iso_datetime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either 'iso_datetime' or 'year' (with optional month and day) to locate the return.",
      });
    }
    if (value.month && !value.year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Month can only be provided together with a year.",
      });
    }
    if (value.day && value.day !== 1 && !value.month) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Day can only be provided together with month and year.",
      });
    }
  });
}

export const planetaryReturnRequestSchema = withReturnValidation(
  chartRenderingSchema
    .extend(planetaryReturnFields)
    .strict()
    .transform(value => ({
      ...value,
      include_house_comparison:
        value.wheel_type === "single" ? false : value.include_house_comparison,
    })),
);

export const planetaryReturnDataRequestSchema = withReturnValidation(
  chartDataConfigurationSchema
    .extend(planetaryReturnFields)
    .strict()
    .transform(value => ({
      ...value,
      include_house_comparison:
        value.wheel_type === "single" ? false : value.include_house_comparison,
    })),
);

export const moonPhaseRequestSchema = z
  .object({
    year: z.number().int().min(1).max(3000),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    second: z.number().int().min(0).max(59).optional().default(0),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: timezoneSchema,
    using_default_location: z.boolean().optional().default(false),
    location_precision: z.number().int().min(0).max(10).optional().default(0),
  })
  .strict();

export const nowMoonPhaseRequestSchema = z
  .object({
    using_default_location: z.boolean().optional().default(true),
    location_precision: z.number().int().min(0).max(10).optional().default(0),
  })
  .strict();

export type SubjectInput = z.infer<typeof subjectSchema>;
export type TransitSubjectInput = z.infer<typeof transitSubjectSchema>;
export type BirthChartDataRequestInput = z.infer<typeof birthChartDataRequestSchema>;
export type BirthChartRequestInput = z.infer<typeof birthChartRequestSchema>;
export type SynastryChartDataRequestInput = z.infer<typeof synastryChartDataRequestSchema>;
export type SynastryChartRequestInput = z.infer<typeof synastryChartRequestSchema>;
export type TransitChartDataRequestInput = z.infer<typeof transitChartDataRequestSchema>;
export type TransitChartRequestInput = z.infer<typeof transitChartRequestSchema>;
export type CompositeChartDataRequestInput = z.infer<typeof compositeChartDataRequestSchema>;
export type CompositeChartRequestInput = z.infer<typeof compositeChartRequestSchema>;
export type PlanetaryReturnRequestInput = z.infer<typeof planetaryReturnRequestSchema>;
export type PlanetaryReturnDataRequestInput = z.infer<typeof planetaryReturnDataRequestSchema>;
export type MoonPhaseRequestInput = z.infer<typeof moonPhaseRequestSchema>;
