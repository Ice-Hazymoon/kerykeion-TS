import type { AstrologicalPoint, House } from "./literals";

export interface KerykeionSettingsCelestialPointModel {
  id: number;
  name: AstrologicalPoint | House;
  color: string;
  element_points: number;
  label: string;
  is_active?: boolean | null;
}

export type KerykeionLanguageCelestialPointModel = Record<AstrologicalPoint, string>;

export interface KerykeionLanguageModel {
  celestial_points: KerykeionLanguageCelestialPointModel;
  weekdays: Record<string, string>;
  [key: string]: string | Record<string, string>;
}

export interface KerykeionSettingsModel {
  language_settings: Record<string, KerykeionLanguageModel>;
  [key: string]: unknown;
}
