import { LANGUAGE_SETTINGS } from "./translation-strings";

const SENTINEL = Symbol("translation-missing");

type UnknownMapping = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownMapping {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function deepMerge(base: UnknownMapping, overrides: UnknownMapping): UnknownMapping {
  const merged: UnknownMapping = {};

  for (const [key, value] of Object.entries(base)) {
    merged[key] = deepClone(value);
  }

  for (const [key, value] of Object.entries(overrides)) {
    const current = merged[key];
    if (isRecord(current) && isRecord(value)) {
      merged[key] = deepMerge(current, value);
    }
    else {
      merged[key] = deepClone(value);
    }
  }

  return merged;
}

function deepGet(mapping: UnknownMapping, dottedKey: string): unknown {
  let current: unknown = mapping;
  for (const segment of dottedKey.split(".")) {
    if (isRecord(current) && segment in current) {
      current = current[segment];
    }
    else {
      return SENTINEL;
    }
  }
  return current;
}

function selectLanguage(languageDict?: UnknownMapping | null, language?: string | null): UnknownMapping {
  if (languageDict) {
    return languageDict;
  }

  const fallback = LANGUAGE_SETTINGS.EN as UnknownMapping;
  if (!language) {
    return fallback;
  }

  return (LANGUAGE_SETTINGS[language as keyof typeof LANGUAGE_SETTINGS] as UnknownMapping | undefined) ?? fallback;
}

export function loadLanguageSettings(overrides?: UnknownMapping | null): typeof LANGUAGE_SETTINGS {
  const languages = deepClone(LANGUAGE_SETTINGS) as UnknownMapping;
  if (!overrides) {
    return languages as typeof LANGUAGE_SETTINGS;
  }

  const data = isRecord(overrides.language_settings) ? overrides.language_settings : overrides;
  return deepMerge(languages, data) as typeof LANGUAGE_SETTINGS;
}

export function getTranslations<T>(
  value: string,
  defaultValue: T,
  options: {
    language?: string | null;
    language_dict?: UnknownMapping | null;
  } = {},
): T {
  const primary = selectLanguage(options.language_dict, options.language);
  let result = deepGet(primary, value);

  if (result === SENTINEL) {
    result = deepGet(LANGUAGE_SETTINGS.EN as UnknownMapping, value);
  }

  if (result === SENTINEL || result == null) {
    return defaultValue;
  }

  return result as T;
}

export const load_language_settings = loadLanguageSettings;
export const get_translations = getTranslations;
export { deepMerge };
