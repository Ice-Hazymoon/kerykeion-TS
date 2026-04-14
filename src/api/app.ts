import type { infer as ZodInfer, ZodType } from "zod";
import type { AstrologicalPoint } from "../core/schemas/literals";

import { Hono } from "hono";
import { ZodError } from "zod";
import { AstrologicalSubjectFactory } from "../core/astrological-subject-factory";
import { ChartDataFactory } from "../core/chart-data-factory";
import { MoonPhaseDetailsFactory } from "../core/moon-phase-details/factory";
import { readEnv } from "../core/runtime";
import { initializeSweph } from "../core/sweph";
import { buildErrorResponse, buildSubject, calculateReturnChartData, chartDataPayload, chartPayload, contextPayload, createCompositeChartData, createMoonPhaseOverview, createNatalChartData, createSynastryChartData, createTransitChartData, currentUtcComponents, dump, moonPhaseContextPayload, moonPhasePayload, resolveActivePoints, subjectContextPayload } from "./router-utils";
import {
  birthChartDataRequestSchema,
  birthChartRequestSchema,
  birthDataRequestSchema,
  compositeChartDataRequestSchema,
  compositeChartRequestSchema,
  moonPhaseRequestSchema,
  nowChartRequestSchema,
  nowMoonPhaseRequestSchema,
  nowSubjectRequestSchema,
  planetaryReturnDataRequestSchema,
  planetaryReturnRequestSchema,
  synastryChartDataRequestSchema,
  synastryChartRequestSchema,
  transitChartDataRequestSchema,
  transitChartRequestSchema,
} from "./schemas";

function validationErrorBody(error: ZodError) {
  return {
    status: "ERROR",
    message: error.issues.map(issue => issue.message).join("; "),
    error_type: "ValidationError",
    issues: error.issues,
  };
}

interface ContextLike {
  req: { json: () => Promise<unknown> };
  json: (body: unknown, status?: 200 | 400 | 500) => Response;
}

async function parseBody<T>(c: ContextLike, schema: ZodType<T>): Promise<T> {
  return schema.parse(await c.req.json());
}

function errorResponse(c: ContextLike, error: unknown) {
  if (error instanceof ZodError) {
    return c.json(validationErrorBody(error), 400);
  }
  const response = buildErrorResponse(error);
  return c.json(response.body, response.status as 400 | 500);
}

async function handleRoute<T>(
  c: ContextLike,
  schema: ZodType<T>,
  handler: (body: T) => Promise<unknown>,
) {
  try {
    const body = await parseBody(c, schema);
    return c.json(await handler(body), 200);
  }
  catch (error) {
    return errorResponse(c, error);
  }
}

export function createApp(): Hono {
  initializeSweph();

  const app = new Hono();
  const moonPhaseHandler = async (body: ZodInfer<typeof moonPhaseRequestSchema>) =>
    moonPhasePayload(await createMoonPhaseOverview(body));
  const moonPhaseContextHandler = async (body: ZodInfer<typeof moonPhaseRequestSchema>) =>
    moonPhaseContextPayload(await createMoonPhaseOverview(body));
  const nowMoonPhaseHandler = async (body: ZodInfer<typeof nowMoonPhaseRequestSchema>) => {
    const now = currentUtcComponents();
    const subject = await AstrologicalSubjectFactory.fromBirthData({
      name: "Moon Phase",
      year: now.year,
      month: now.month,
      day: now.day,
      hour: now.hour,
      minute: now.minute,
      seconds: now.second,
      city: "Greenwich",
      nation: "GB",
      lng: -0.001545,
      lat: 51.477928,
      tz_str: "Etc/UTC",
      online: false,
      active_points: resolveActivePoints(null),
      suppress_geonames_warning: true,
    });
    return moonPhasePayload(
      MoonPhaseDetailsFactory.fromSubject(subject, {
        using_default_location: body.using_default_location,
        location_precision: body.location_precision,
      }),
    );
  };
  const nowMoonPhaseContextHandler = async (body: ZodInfer<typeof nowMoonPhaseRequestSchema>) => {
    const now = currentUtcComponents();
    const subject = await AstrologicalSubjectFactory.fromBirthData({
      name: "Moon Phase",
      year: now.year,
      month: now.month,
      day: now.day,
      hour: now.hour,
      minute: now.minute,
      seconds: now.second,
      city: "Greenwich",
      nation: "GB",
      lng: -0.001545,
      lat: 51.477928,
      tz_str: "Etc/UTC",
      online: false,
      active_points: resolveActivePoints(null),
      suppress_geonames_warning: true,
    });
    return moonPhaseContextPayload(
      MoonPhaseDetailsFactory.fromSubject(subject, {
        using_default_location: body.using_default_location,
        location_precision: body.location_precision,
      }),
    );
  };

  app.get("/health", c => c.json({ status: "OK" }, 200));
  app.get("/", c =>
    c.json(
      {
        status: "OK",
        environment: readEnv("ENV_TYPE") ?? "dev",
        debug: readEnv("NODE_ENV") !== "production",
      },
      200,
    ));

  app.post("/api/v5/subject", async c =>
    handleRoute(c, birthDataRequestSchema, async (body) => {
      const subject = await buildSubject(body.subject, { active_points: body.active_points });
      return { status: "OK", subject: dump(subject) };
    }));

  app.post("/api/v5/now/subject", async c =>
    handleRoute(c, nowSubjectRequestSchema, async (body) => {
      const now = currentUtcComponents();
      const subject = await AstrologicalSubjectFactory.fromBirthData({
        name: body.name,
        year: now.year,
        month: now.month,
        day: now.day,
        hour: now.hour,
        minute: now.minute,
        seconds: now.second,
        city: "Greenwich",
        nation: "GB",
        lng: -0.001545,
        lat: 51.477928,
        tz_str: "Etc/UTC",
        online: false,
        zodiac_type: body.zodiac_type,
        sidereal_mode: body.sidereal_mode ?? undefined,
        perspective_type: body.perspective_type,
        houses_system_identifier: body.houses_system_identifier,
        active_points: resolveActivePoints(null),
        suppress_geonames_warning: true,
      });
      return { status: "OK", subject: dump(subject) };
    }));

  app.post("/api/v5/compatibility-score", async c =>
    handleRoute(c, synastryChartDataRequestSchema, async (body) => {
      const chartData = await createSynastryChartData(body);
      if (!chartData.relationship_score) {
        throw new Error("Relationship score computation failed");
      }
      return {
        status: "OK",
        score: chartData.relationship_score.score_value,
        score_description: chartData.relationship_score.score_description,
        is_destiny_sign: chartData.relationship_score.is_destiny_sign,
        aspects: chartData.relationship_score.aspects,
        score_breakdown: chartData.relationship_score.score_breakdown,
        chart_data: dump(chartData),
      };
    }));

  app.post("/api/v5/chart-data/birth-chart", async c =>
    handleRoute(c, birthChartDataRequestSchema, async body => chartDataPayload(await createNatalChartData(body))));

  app.post("/api/v5/chart-data/synastry", async c =>
    handleRoute(c, synastryChartDataRequestSchema, async body =>
      chartDataPayload(await createSynastryChartData(body))));

  app.post("/api/v5/chart-data/composite", async c =>
    handleRoute(c, compositeChartDataRequestSchema, async body =>
      chartDataPayload(await createCompositeChartData(body))));

  app.post("/api/v5/chart-data/transit", async c =>
    handleRoute(c, transitChartDataRequestSchema, async body =>
      chartDataPayload(await createTransitChartData(body))));

  app.post("/api/v5/chart-data/solar-return", async c =>
    handleRoute(c, planetaryReturnDataRequestSchema, async body =>
      chartDataPayload(await calculateReturnChartData(body, "Solar"))));

  app.post("/api/v5/chart-data/lunar-return", async c =>
    handleRoute(c, planetaryReturnDataRequestSchema, async body =>
      chartDataPayload(await calculateReturnChartData(body, "Lunar"))));

  app.post("/api/v5/context/subject", async c =>
    handleRoute(c, birthDataRequestSchema, async (body) => {
      const subject = await buildSubject(body.subject, { active_points: body.active_points });
      return subjectContextPayload(subject);
    }));

  app.post("/api/v5/context/birth-chart", async c =>
    handleRoute(c, birthChartDataRequestSchema, async body => contextPayload(await createNatalChartData(body))));

  app.post("/api/v5/context/synastry", async c =>
    handleRoute(c, synastryChartDataRequestSchema, async body =>
      contextPayload(await createSynastryChartData(body))));

  app.post("/api/v5/context/composite", async c =>
    handleRoute(c, compositeChartDataRequestSchema, async body =>
      contextPayload(await createCompositeChartData(body))));

  app.post("/api/v5/context/transit", async c =>
    handleRoute(c, transitChartDataRequestSchema, async body =>
      contextPayload(await createTransitChartData(body))));

  app.post("/api/v5/context/solar-return", async c =>
    handleRoute(c, planetaryReturnDataRequestSchema, async body => ({
      ...contextPayload(await calculateReturnChartData(body, "Solar")),
      return_type: "Solar",
      wheel_type: body.wheel_type,
    })));

  app.post("/api/v5/context/lunar-return", async c =>
    handleRoute(c, planetaryReturnDataRequestSchema, async body => ({
      ...contextPayload(await calculateReturnChartData(body, "Lunar")),
      return_type: "Lunar",
      wheel_type: body.wheel_type,
    })));

  app.post("/api/v5/moon-phase", async c => handleRoute(c, moonPhaseRequestSchema, moonPhaseHandler));
  app.post("/api/v5/moon-phase/context", async c => handleRoute(c, moonPhaseRequestSchema, moonPhaseContextHandler));
  app.post("/api/v5/context/moon-phase", async c => handleRoute(c, moonPhaseRequestSchema, moonPhaseContextHandler));
  app.post("/api/v5/moon-phase/now-utc", async c => handleRoute(c, nowMoonPhaseRequestSchema, nowMoonPhaseHandler));
  app.post("/api/v5/now/moon-phase", async c => handleRoute(c, nowMoonPhaseRequestSchema, nowMoonPhaseHandler));
  app.post("/api/v5/moon-phase/now-utc/context", async c =>
    handleRoute(c, nowMoonPhaseRequestSchema, nowMoonPhaseContextHandler));
  app.post("/api/v5/now/context/moon-phase", async c =>
    handleRoute(c, nowMoonPhaseRequestSchema, nowMoonPhaseContextHandler));

  app.post("/api/v5/now/chart", async c =>
    handleRoute(c, nowChartRequestSchema, async (body) => {
      const now = currentUtcComponents();
      const resolvedActivePoints = resolveActivePoints(body.active_points);
      const nowChartActivePoints: AstrologicalPoint[]
        = body.active_points == null
          ? [
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
              "Mean_Lilith",
              "Chiron",
              "Ascendant",
              "Medium_Coeli",
              "Descendant",
              "Imum_Coeli",
            ]
          : [...resolvedActivePoints];
      const subject = await AstrologicalSubjectFactory.fromBirthData({
        name: body.name,
        year: now.year,
        month: now.month,
        day: now.day,
        hour: now.hour,
        minute: now.minute,
        seconds: now.second,
        city: "Greenwich",
        nation: "GB",
        lng: -0.001545,
        lat: 51.477928,
        tz_str: "Etc/UTC",
        online: false,
        zodiac_type: body.zodiac_type,
        sidereal_mode: body.sidereal_mode ?? undefined,
        perspective_type: body.perspective_type,
        houses_system_identifier: body.houses_system_identifier,
        active_points: resolvedActivePoints,
        suppress_geonames_warning: true,
      });
      const chartData = ChartDataFactory.createNatalChartData(
        subject,
        resolvedActivePoints,
        body.active_aspects ?? undefined,
        {
          distribution_method: body.distribution_method,
          custom_distribution_weights: body.custom_distribution_weights ?? null,
        },
      );
      chartData.active_points = nowChartActivePoints;
      return chartPayload(
        chartData,
        body.theme,
        body.language,
        body.split_chart,
        body.transparent_background,
        body.show_house_position_comparison,
        body.show_cusp_position_comparison,
        body.show_degree_indicators,
        body.show_aspect_icons,
        body.custom_title,
        body.style,
        body.show_zodiac_background_ring,
        body.double_chart_aspect_grid_type,
      );
    }));

  app.post("/api/v5/now/context", async c =>
    handleRoute(c, nowSubjectRequestSchema, async (body) => {
      const now = currentUtcComponents();
      const subject = await AstrologicalSubjectFactory.fromBirthData({
        name: body.name,
        year: now.year,
        month: now.month,
        day: now.day,
        hour: now.hour,
        minute: now.minute,
        seconds: now.second,
        city: "Greenwich",
        nation: "GB",
        lng: -0.001545,
        lat: 51.477928,
        tz_str: "Etc/UTC",
        online: false,
        zodiac_type: body.zodiac_type,
        sidereal_mode: body.sidereal_mode ?? undefined,
        perspective_type: body.perspective_type,
        houses_system_identifier: body.houses_system_identifier,
        active_points: resolveActivePoints(null),
        suppress_geonames_warning: true,
      });
      return subjectContextPayload(subject);
    }));

  app.post("/api/v5/chart/birth-chart", async c =>
    handleRoute(c, birthChartRequestSchema, async body =>
      chartPayload(
        await createNatalChartData(body),
        body.theme,
        body.language,
        body.split_chart,
        body.transparent_background,
        body.show_house_position_comparison,
        body.show_cusp_position_comparison,
        body.show_degree_indicators,
        body.show_aspect_icons,
        body.custom_title,
        body.style,
        body.show_zodiac_background_ring,
        body.double_chart_aspect_grid_type,
      )));

  app.post("/api/v5/chart/synastry", async c =>
    handleRoute(c, synastryChartRequestSchema, async body =>
      chartPayload(
        await createSynastryChartData(body),
        body.theme,
        body.language,
        body.split_chart,
        body.transparent_background,
        body.show_house_position_comparison,
        body.show_cusp_position_comparison,
        body.show_degree_indicators,
        body.show_aspect_icons,
        body.custom_title,
        body.style,
        body.show_zodiac_background_ring,
        body.double_chart_aspect_grid_type,
      )));

  app.post("/api/v5/chart/composite", async c =>
    handleRoute(c, compositeChartRequestSchema, async body =>
      chartPayload(
        await createCompositeChartData(body),
        body.theme,
        body.language,
        body.split_chart,
        body.transparent_background,
        body.show_house_position_comparison,
        body.show_cusp_position_comparison,
        body.show_degree_indicators,
        body.show_aspect_icons,
        body.custom_title,
        body.style,
        body.show_zodiac_background_ring,
        body.double_chart_aspect_grid_type,
      )));

  app.post("/api/v5/chart/transit", async c =>
    handleRoute(c, transitChartRequestSchema, async body =>
      chartPayload(
        await createTransitChartData(body),
        body.theme,
        body.language,
        body.split_chart,
        body.transparent_background,
        body.show_house_position_comparison,
        body.show_cusp_position_comparison,
        body.show_degree_indicators,
        body.show_aspect_icons,
        body.custom_title,
        body.style,
        body.show_zodiac_background_ring,
        body.double_chart_aspect_grid_type,
      )));

  app.post("/api/v5/chart/solar-return", async c =>
    handleRoute(c, planetaryReturnRequestSchema, async body => ({
      ...chartPayload(
        await calculateReturnChartData(body, "Solar"),
        body.theme,
        body.language,
        body.split_chart,
        body.transparent_background,
        body.show_house_position_comparison,
        body.show_cusp_position_comparison,
        body.show_degree_indicators,
        body.show_aspect_icons,
        body.custom_title,
        body.style,
        body.show_zodiac_background_ring,
        body.double_chart_aspect_grid_type,
      ),
      return_type: "Solar",
      wheel_type: body.wheel_type,
    })));

  app.post("/api/v5/chart/lunar-return", async c =>
    handleRoute(c, planetaryReturnRequestSchema, async body => ({
      ...chartPayload(
        await calculateReturnChartData(body, "Lunar"),
        body.theme,
        body.language,
        body.split_chart,
        body.transparent_background,
        body.show_house_position_comparison,
        body.show_cusp_position_comparison,
        body.show_degree_indicators,
        body.show_aspect_icons,
        body.custom_title,
        body.style,
        body.show_zodiac_background_ring,
        body.double_chart_aspect_grid_type,
      ),
      return_type: "Lunar",
      wheel_type: body.wheel_type,
    })));

  return app;
}
