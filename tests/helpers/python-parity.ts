import { execFileSync } from "node:child_process";
import path from "node:path";

import { astrologicalPoints } from "../../src/core/schemas/literals";

const PYTHON_PATH = path.join(process.cwd(), ".venv-pyref", "bin", "python");

export function runPython(script: string, args: string[] = []): string {
  return execFileSync(PYTHON_PATH, ["-c", script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
    },
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function runPythonJson<T>(script: string, args: string[] = []): T {
  return JSON.parse(runPython(script, args)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  if (Object.is(value, -0) || Math.abs(value) < 1e-12) {
    return 0;
  }
  return Number(value.toFixed(9));
}

function isPointModel(record: Record<string, unknown>): boolean {
  return "point_type" in record && "sign" in record && "position" in record && "abs_pos" in record;
}

function isSubjectLikeModel(record: Record<string, unknown>): boolean {
  return "zodiac_type" in record && "houses_system_identifier" in record && "active_points" in record;
}

function isMoonPhaseLocationModel(record: Record<string, unknown>): boolean {
  return "latitude" in record && "longitude" in record && "precision" in record;
}

function isMoonPhaseRootModel(record: Record<string, unknown>): boolean {
  return "timestamp" in record && "datestamp" in record && "moon" in record && "sun" in record;
}

function isMoonPhaseMoonModel(record: Record<string, unknown>): boolean {
  return "age_days" in record && "major_phase" in record && "illumination" in record;
}

function isMoonPhaseEventMomentModel(record: Record<string, unknown>): boolean {
  return "timestamp" in record && "datestamp" in record && !("moon" in record) && !("sun" in record);
}

const subjectNullableKeys = [
  "ayanamsa_value",
  "city",
  "day_of_week",
  "iso_formatted_local_datetime",
  "iso_formatted_utc_datetime",
  "julian_day",
  "lat",
  "lng",
  "nation",
  "tz_str",
] as const;

export function toPythonModelJson<T>(value: T): T {
  const normalize = (input: unknown): unknown => {
    if (typeof input === "number") {
      return normalizeNumber(input);
    }

    if (Array.isArray(input)) {
      return input.map(item => normalize(item));
    }

    if (!isRecord(input)) {
      return input;
    }

    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(input)) {
      if (key.startsWith("_") || key === "seconds" || key === "is_dst") {
        continue;
      }
      if (key === "altitude" && isSubjectLikeModel(input)) {
        continue;
      }
      result[key] = normalize(entry);
    }

    if (isPointModel(input)) {
      for (const key of ["house", "retrograde", "speed", "declination", "magnitude"] as const) {
        if (!(key in result)) {
          result[key] = null;
        }
      }
    }

    if (isSubjectLikeModel(input)) {
      for (const key of subjectNullableKeys) {
        if (!(key in result)) {
          result[key] = null;
        }
      }

      for (const pointName of astrologicalPoints) {
        const pointKey = pointName.toLowerCase();
        if (!(pointKey in result)) {
          result[pointKey] = null;
        }
      }
    }

    if ("return_type" in input) {
      for (const key of ["year", "month", "day", "hour", "minute", "is_diurnal"] as const) {
        delete result[key];
      }
    }

    if (isMoonPhaseLocationModel(input) && !("note" in result)) {
      result.note = null;
    }

    if (isMoonPhaseLocationModel(input) && result.longitude === "0") {
      result.longitude = "0.0";
    }

    if (isMoonPhaseRootModel(input)) {
      for (const key of ["events"] as const) {
        if (!(key in result)) {
          result[key] = null;
        }
      }
    }

    if (isMoonPhaseMoonModel(input)) {
      for (const key of ["events", "moonrise", "moonrise_timestamp", "moonset", "moonset_timestamp"] as const) {
        if (!(key in result)) {
          result[key] = null;
        }
      }
    }

    if (isMoonPhaseEventMomentModel(input)) {
      for (const key of ["days_ago", "days_ahead", "name", "description"] as const) {
        if (!(key in result)) {
          result[key] = null;
        }
      }
    }

    return result;
  };

  return JSON.parse(JSON.stringify(normalize(value))) as T;
}

export function normalizeMultilineText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}
