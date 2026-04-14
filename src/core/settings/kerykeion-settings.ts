import { LANGUAGE_SETTINGS } from "./translation-strings";
import { deepMerge } from "./translations";

type SettingsSource = Record<string, unknown> | null | undefined;

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export function loadSettingsMapping(settingsSource?: SettingsSource): Record<string, unknown> {
  let languageSettings = deepClone(LANGUAGE_SETTINGS) as Record<string, unknown>;

  if (settingsSource) {
    let overrides = settingsSource;
    if (
      typeof overrides === "object"
      && overrides !== null
      && "language_settings" in overrides
      && typeof overrides.language_settings === "object"
      && overrides.language_settings !== null
    ) {
      overrides = overrides.language_settings as Record<string, unknown>;
    }

    languageSettings = deepMerge(languageSettings, overrides);
  }

  return { language_settings: languageSettings };
}

export const load_settings_mapping = loadSettingsMapping;
export type { SettingsSource };
export { LANGUAGE_SETTINGS };
