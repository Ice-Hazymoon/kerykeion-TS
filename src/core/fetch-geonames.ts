import { getOptionalNodeRuntime } from "./node-runtime";
import { readEnv } from "./runtime";

const DEFAULT_GEONAMES_CACHE_NAME = "cache/kerykeion_geonames_cache.json";
const GEONAMES_CACHE_ENV_VAR = "KERYKEION_GEONAMES_CACHE_NAME";
const TRANSIENT_GEONAMES_ERROR_CODES = new Set([13, 18, 19, 20, 22]);
const inMemoryCaches = new Map<string, Record<string, CacheEntry>>();

interface CacheEntry {
  expiresAt: number;
  payload: unknown;
}

interface GeoNamesResponseStatus {
  value?: number;
  message?: string;
}

interface GeoNamesApiResponse {
  status?: GeoNamesResponseStatus;
  geonames?: Array<{
    name: string;
    lat: string;
    lng: string;
    countryCode: string;
  }>;
  timezoneId?: string;
}

function resolveCacheName(cacheName?: string): string {
  return cacheName ?? readEnv(GEONAMES_CACHE_ENV_VAR) ?? DEFAULT_GEONAMES_CACHE_NAME;
}

function ensureDirectory(filePath: string): void {
  const nodeRuntime = getOptionalNodeRuntime();
  if (!nodeRuntime) {
    return;
  }

  const dir = nodeRuntime.path.dirname(filePath);
  nodeRuntime.fs.mkdirSync(dir, { recursive: true });
}

function readCache(cacheFile: string): Record<string, CacheEntry> {
  const cached = inMemoryCaches.get(cacheFile);
  if (cached) {
    return cached;
  }

  const nodeRuntime = getOptionalNodeRuntime();
  if (!nodeRuntime || !nodeRuntime.fs.existsSync(cacheFile)) {
    return {};
  }

  try {
    const parsed = JSON.parse(nodeRuntime.fs.readFileSync(cacheFile, "utf8")) as Record<string, CacheEntry>;
    inMemoryCaches.set(cacheFile, parsed);
    return parsed;
  }
  catch {
    return {};
  }
}

function writeCache(cacheFile: string, cache: Record<string, CacheEntry>): void {
  inMemoryCaches.set(cacheFile, cache);

  const nodeRuntime = getOptionalNodeRuntime();
  if (!nodeRuntime) {
    return;
  }

  ensureDirectory(cacheFile);
  nodeRuntime.fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), "utf8");
}

function shouldCacheGeonamesPayload(payload: GeoNamesApiResponse): boolean {
  const errorCode = payload.status?.value ?? 0;
  return !TRANSIENT_GEONAMES_ERROR_CODES.has(errorCode);
}

export class FetchGeonames {
  static defaultCacheName = DEFAULT_GEONAMES_CACHE_NAME;

  readonly username: string;
  readonly cityName: string;
  readonly countryCode: string;
  readonly cacheExpireAfterDays: number;
  readonly cacheFile: string;
  readonly baseUrl = "http://api.geonames.org/searchJSON";
  readonly timezoneUrl = "http://api.geonames.org/timezoneJSON";

  constructor(
    cityName: string,
    countryCode: string,
    username = "century.boy",
    cacheExpireAfterDays = 30,
    cacheName?: string,
  ) {
    this.username = username;
    this.cityName = cityName;
    this.countryCode = countryCode;
    this.cacheExpireAfterDays = cacheExpireAfterDays;
    this.cacheFile = resolveCacheName(cacheName ?? FetchGeonames.defaultCacheName);
  }

  static setDefaultCacheName(cacheName: string): void {
    FetchGeonames.defaultCacheName = cacheName;
  }

  private async fetchJson(
    url: string,
  ): Promise<{ payload: GeoNamesApiResponse | null; fromCache: boolean }> {
    const cache = readCache(this.cacheFile);
    const cached = cache[url];
    if (cached && cached.expiresAt > Date.now()) {
      return { payload: cached.payload as GeoNamesApiResponse, fromCache: true };
    }

    const response = await fetch(url);
    if (!response.ok) {
      return { payload: null, fromCache: false };
    }

    const payload = (await response.json()) as GeoNamesApiResponse;
    if (shouldCacheGeonamesPayload(payload)) {
      cache[url] = {
        expiresAt: Date.now() + this.cacheExpireAfterDays * 24 * 60 * 60 * 1000,
        payload,
      };
      writeCache(this.cacheFile, cache);
    }

    return { payload, fromCache: false };
  }

  private async getTimezone(
    lat: string | number,
    lon: string | number,
  ): Promise<Record<string, string | boolean>> {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lon),
      username: this.username,
    });
    const url = `${this.timezoneUrl}?${params.toString()}`;
    const { payload, fromCache } = await this.fetchJson(url);
    if (!payload?.timezoneId) {
      return {};
    }
    return {
      timezonestr: payload.timezoneId,
      from_tz_cache: fromCache,
    };
  }

  private async getCountryData(
    cityName: string,
    countryCode: string,
  ): Promise<Record<string, string | boolean>> {
    const params = new URLSearchParams({
      q: cityName,
      country: countryCode,
      username: this.username,
      maxRows: "1",
      style: "SHORT",
      featureClass: "P",
    });
    const url = `${this.baseUrl}?${params.toString()}`;
    const { payload, fromCache } = await this.fetchJson(url);
    const geoname = payload?.geonames?.[0];
    if (!geoname) {
      return {};
    }
    return {
      name: geoname.name,
      lat: geoname.lat,
      lng: geoname.lng,
      countryCode: geoname.countryCode,
      from_country_cache: fromCache,
    };
  }

  async getSerializedData(): Promise<Record<string, string | boolean>> {
    const cityData = await this.getCountryData(this.cityName, this.countryCode);
    const lat = cityData.lat;
    const lng = cityData.lng;
    if (typeof lat !== "string" || typeof lng !== "string") {
      return {};
    }

    const timezoneResponse = await this.getTimezone(lat, lng);
    return {
      ...timezoneResponse,
      ...cityData,
    };
  }
}
