/* eslint-disable antfu/no-top-level-await, ts/consistent-type-definitions, ts/method-signature-style */
import { constants } from "../generated/sweph/constants";
// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore -- generated Emscripten runtime ships as JS; the adapter below provides the exact TypeScript surface.
import createSwephModule from "../generated/sweph/emscripten/sweph.mjs";

const ERR_BUFFER_BYTES = 512;
const DOUBLE_BYTES = Float64Array.BYTES_PER_ELEMENT;
const POINTS_LIST_LENGTH = 8;
const POINTS_BUFFER_LENGTH = 10;
const HOUSE_BUFFER_LENGTH = 37;

type CalcResult = {
  flag: number;
  error: string;
  data: [number, number, number, number, number, number];
};

type FixStarResult = CalcResult & {
  name: string;
};

type FixStarMagnitudeResult = {
  flag: number;
  error: string;
  name: string;
  data: number;
};

type HousesResult = {
  flag: number;
  data: {
    houses: number[];
    points: [number, number, number, number, number, number, number, number];
  };
};

type HousesExResult = HousesResult & {
  error: string;
  data: HousesResult["data"] & {
    housesSpeed: number[];
    pointsSpeed: number[];
  };
};

type RiseTransResult = {
  flag: number;
  error: string;
  data: number;
};

type AyanamsaResult = {
  flag: number;
  error: string;
  data: number;
};

type EclipseWhenResult = {
  flag: number;
  error: string;
  data: number[];
};

type CrossResult = {
  date: number;
  error: string;
};

type SwephAdapter = {
  readonly constants: typeof constants;
  close(): void;
  set_ephe_path(path?: string): void;
  set_topo(geolon: number, geolat: number, geoalt: number): void;
  set_sid_mode(mode: number, t0: number, ayanT0: number): void;
  julday(year: number, month: number, day: number, hour: number, gregflag: number): number;
  difdeg2n(p1: number, p2: number): number;
  calc_ut(tjdUt: number, ipl: number, iflag: number): CalcResult;
  houses_ex(tjdUt: number, iflag: number, geolat: number, geolon: number, hsys: string): HousesResult;
  houses_ex2(tjdUt: number, iflag: number, geolat: number, geolon: number, hsys: string): HousesExResult;
  house_name(hsys: string): string;
  azalt(
    tjdUt: number,
    calcFlag: number,
    geopos: [number, number, number],
    atpress: number,
    attemp: number,
    xin: [number, number, number],
  ): [number, number, number];
  rise_trans(
    tjdUt: number,
    ipl: number,
    starname: string | null,
    epheflag: number,
    rsmi: number,
    geopos: [number, number, number],
    atpress: number,
    attemp: number,
  ): RiseTransResult;
  sol_eclipse_when_glob(tjdStart: number, ifl: number, ifltype: number, backwards: boolean): EclipseWhenResult;
  lun_eclipse_when(tjdStart: number, ifl: number, ifltype: number, backwards: boolean): EclipseWhenResult;
  solcross_ut(x2cross: number, jdUt: number, flag: number): CrossResult;
  mooncross_ut(x2cross: number, jdUt: number, flag: number): CrossResult;
  fixstar_ut(star: string, tjdUt: number, iflag: number): FixStarResult;
  fixstar2_mag(star: string): FixStarMagnitudeResult;
  get_ayanamsa_ex_ut(tjdUt: number, iflag: number): AyanamsaResult;
};

type EmscriptenSwephModule = {
  _malloc(size: number): number;
  _free(ptr: number): void;
  _sweph_init(): number;
  _swe_calc_ut(tjdUt: number, ipl: number, iflag: number, xxPtr: number, errPtr: number): number;
  _swe_set_topo(geolon: number, geolat: number, geoalt: number): void;
  _swe_set_sid_mode(mode: number, t0: number, ayanT0: number): void;
  _swe_close(): void;
  _swe_julday(year: number, month: number, day: number, hour: number, gregflag: number): number;
  _swe_difdeg2n(p1: number, p2: number): number;
  _swe_houses_ex2(
    tjdUt: number,
    iflag: number,
    geolat: number,
    geolon: number,
    hsys: number,
    cuspsPtr: number,
    ascmcPtr: number,
    cuspSpeedPtr: number,
    ascmcSpeedPtr: number,
    errPtr: number,
  ): number;
  _swe_houses_ex(
    tjdUt: number,
    iflag: number,
    geolat: number,
    geolon: number,
    hsys: number,
    cuspsPtr: number,
    ascmcPtr: number,
  ): number;
  _swe_azalt(
    tjdUt: number,
    calcFlag: number,
    geoposPtr: number,
    atpress: number,
    attemp: number,
    xinPtr: number,
    xazPtr: number,
  ): void;
  _swe_rise_trans(
    tjdUt: number,
    ipl: number,
    starnamePtr: number,
    epheflag: number,
    rsmi: number,
    geoposPtr: number,
    atpress: number,
    attemp: number,
    tretPtr: number,
    errPtr: number,
  ): number;
  _swe_sol_eclipse_when_glob(
    tjdStart: number,
    ifl: number,
    ifltype: number,
    tretPtr: number,
    backward: number,
    errPtr: number,
  ): number;
  _swe_lun_eclipse_when(
    tjdStart: number,
    ifl: number,
    ifltype: number,
    tretPtr: number,
    backward: number,
    errPtr: number,
  ): number;
  _swe_solcross_ut(x2cross: number, jdUt: number, flag: number, errPtr: number): number;
  _swe_mooncross_ut(x2cross: number, jdUt: number, flag: number, errPtr: number): number;
  _swe_fixstar_ut(starPtr: number, tjdUt: number, iflag: number, xxPtr: number, errPtr: number): number;
  _swe_fixstar2_mag(starPtr: number, magPtr: number, errPtr: number): number;
  _swe_get_ayanamsa_ex_ut(tjdUt: number, iflag: number, dayaPtr: number, errPtr: number): number;
  _swe_house_name(hsys: number): number;
  UTF8ToString(ptr: number): string;
  stringToUTF8(value: string, ptr: number, maxBytesToWrite: number): void;
  lengthBytesUTF8(value: string): number;
  getValue(ptr: number, type: "double" | "i32"): number;
  setValue(ptr: number, value: number, type: "double" | "i32"): void;
};

const createTypedSwephModule = createSwephModule as unknown as (moduleArg?: Record<string, unknown>) => Promise<EmscriptenSwephModule>;
const emscriptenModule = await createTypedSwephModule();
let closed = false;

function ensureInitialized(): void {
  emscriptenModule._sweph_init();
  closed = false;
}

function makeZeroedBuffer(size: number): number {
  const ptr = emscriptenModule._malloc(size);
  emscriptenModule.setValue(ptr, 0, "i32");
  return ptr;
}

function readString(ptr: number): string {
  if (ptr === 0) {
    return "";
  }
  return emscriptenModule.UTF8ToString(ptr);
}

function readDouble(ptr: number): number {
  return emscriptenModule.getValue(ptr, "double");
}

function readDoubles(ptr: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => readDouble(ptr + index * DOUBLE_BYTES));
}

function readCalcData(ptr: number): [number, number, number, number, number, number] {
  const values = readDoubles(ptr, 6);
  return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0, values[3] ?? 0, values[4] ?? 0, values[5] ?? 0];
}

function readPointsList(ptr: number): [number, number, number, number, number, number, number, number] {
  const values = readDoubles(ptr, POINTS_LIST_LENGTH);
  return [
    values[0] ?? 0,
    values[1] ?? 0,
    values[2] ?? 0,
    values[3] ?? 0,
    values[4] ?? 0,
    values[5] ?? 0,
    values[6] ?? 0,
    values[7] ?? 0,
  ];
}

function readAzalt(ptr: number): [number, number, number] {
  const values = readDoubles(ptr, 3);
  return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0];
}

function writeDoubles(ptr: number, values: readonly number[]): void {
  for (const [index, value] of values.entries()) {
    emscriptenModule.setValue(ptr + index * DOUBLE_BYTES, value, "double");
  }
}

function withPointers<const T extends readonly number[], R>(
  byteLengths: T,
  callback: (pointers: { [K in keyof T]: number }) => R,
): R {
  const pointers = byteLengths.map(length => makeZeroedBuffer(length)) as { [K in keyof T]: number };
  try {
    return callback(pointers);
  }
  finally {
    for (const ptr of pointers) {
      emscriptenModule._free(ptr);
    }
  }
}

function withCString<T>(value: string, callback: (ptr: number) => T, minimumBytes = 0): T {
  const byteLength = Math.max(emscriptenModule.lengthBytesUTF8(value) + 1, minimumBytes);
  const ptr = makeZeroedBuffer(byteLength);
  try {
    emscriptenModule.stringToUTF8(value, ptr, byteLength);
    return callback(ptr);
  }
  finally {
    emscriptenModule._free(ptr);
  }
}

function withNullableCString<T>(value: string | null, callback: (ptr: number) => T): T {
  if (value == null) {
    return callback(0);
  }
  return withCString(value, callback);
}

function houseCountForSystem(hsys: string): number {
  return hsys === "G" ? 36 : 12;
}

function normalizeHouseSystem(hsys: string): number {
  return hsys.charCodeAt(0);
}

function createAdapter(): SwephAdapter {
  return {
    constants,

    close(): void {
      ensureInitialized();
      emscriptenModule._swe_close();
      closed = true;
    },

    set_ephe_path(): void {
      ensureInitialized();
    },

    set_topo(geolon: number, geolat: number, geoalt: number): void {
      ensureInitialized();
      emscriptenModule._swe_set_topo(geolon, geolat, geoalt);
    },

    set_sid_mode(mode: number, t0: number, ayanT0: number): void {
      ensureInitialized();
      emscriptenModule._swe_set_sid_mode(mode, t0, ayanT0);
    },

    julday(year: number, month: number, day: number, hour: number, gregflag: number): number {
      ensureInitialized();
      return emscriptenModule._swe_julday(year, month, day, hour, gregflag);
    },

    difdeg2n(p1: number, p2: number): number {
      ensureInitialized();
      return emscriptenModule._swe_difdeg2n(p1, p2);
    },

    calc_ut(tjdUt: number, ipl: number, iflag: number): CalcResult {
      ensureInitialized();
      return withPointers([DOUBLE_BYTES * 6, ERR_BUFFER_BYTES], ([xxPtr, errPtr]) => {
        const flag = emscriptenModule._swe_calc_ut(tjdUt, ipl, iflag, xxPtr, errPtr);
        return {
          flag,
          error: readString(errPtr),
          data: readCalcData(xxPtr),
        };
      });
    },

    houses_ex(tjdUt: number, iflag: number, geolat: number, geolon: number, hsys: string): HousesResult {
      ensureInitialized();
      const houseCount = houseCountForSystem(hsys);
      return withPointers([DOUBLE_BYTES * HOUSE_BUFFER_LENGTH, DOUBLE_BYTES * POINTS_BUFFER_LENGTH], ([cuspsPtr, pointsPtr]) => {
        const flag = emscriptenModule._swe_houses_ex(
          tjdUt,
          iflag,
          geolat,
          geolon,
          normalizeHouseSystem(hsys),
          cuspsPtr,
          pointsPtr,
        );
        return {
          flag,
          data: {
            houses: readDoubles(cuspsPtr + DOUBLE_BYTES, houseCount),
            points: readPointsList(pointsPtr),
          },
        };
      });
    },

    houses_ex2(tjdUt: number, iflag: number, geolat: number, geolon: number, hsys: string): HousesExResult {
      ensureInitialized();
      const houseCount = houseCountForSystem(hsys);
      return withPointers(
        [
          DOUBLE_BYTES * HOUSE_BUFFER_LENGTH,
          DOUBLE_BYTES * POINTS_BUFFER_LENGTH,
          DOUBLE_BYTES * HOUSE_BUFFER_LENGTH,
          DOUBLE_BYTES * POINTS_BUFFER_LENGTH,
          ERR_BUFFER_BYTES,
        ],
        ([cuspsPtr, pointsPtr, cuspSpeedPtr, pointsSpeedPtr, errPtr]) => {
          const flag = emscriptenModule._swe_houses_ex2(
            tjdUt,
            iflag,
            geolat,
            geolon,
            normalizeHouseSystem(hsys),
            cuspsPtr,
            pointsPtr,
            cuspSpeedPtr,
            pointsSpeedPtr,
            errPtr,
          );
          return {
            flag,
            error: readString(errPtr),
            data: {
              houses: readDoubles(cuspsPtr + DOUBLE_BYTES, houseCount),
              points: readPointsList(pointsPtr),
              housesSpeed: readDoubles(cuspSpeedPtr + DOUBLE_BYTES, houseCount),
              pointsSpeed: readPointsList(pointsSpeedPtr),
            },
          };
        },
      );
    },

    house_name(hsys: string): string {
      ensureInitialized();
      const ptr = emscriptenModule._swe_house_name(normalizeHouseSystem(hsys));
      return readString(ptr);
    },

    azalt(
      tjdUt: number,
      calcFlag: number,
      geopos: [number, number, number],
      atpress: number,
      attemp: number,
      xin: [number, number, number],
    ): [number, number, number] {
      ensureInitialized();
      return withPointers([DOUBLE_BYTES * 3, DOUBLE_BYTES * 3, DOUBLE_BYTES * 3], ([geoposPtr, xinPtr, xazPtr]) => {
        writeDoubles(geoposPtr, geopos);
        writeDoubles(xinPtr, xin);
        emscriptenModule._swe_azalt(tjdUt, calcFlag, geoposPtr, atpress, attemp, xinPtr, xazPtr);
        return readAzalt(xazPtr);
      });
    },

    rise_trans(
      tjdUt: number,
      ipl: number,
      starname: string | null,
      epheflag: number,
      rsmi: number,
      geopos: [number, number, number],
      atpress: number,
      attemp: number,
    ): RiseTransResult {
      ensureInitialized();
      return withNullableCString(starname, starnamePtr =>
        withPointers([DOUBLE_BYTES * 3, DOUBLE_BYTES, ERR_BUFFER_BYTES], ([geoposPtr, tretPtr, errPtr]) => {
          writeDoubles(geoposPtr, geopos);
          const flag = emscriptenModule._swe_rise_trans(
            tjdUt,
            ipl,
            starnamePtr,
            epheflag,
            rsmi,
            geoposPtr,
            atpress,
            attemp,
            tretPtr,
            errPtr,
          );
          return {
            flag,
            error: readString(errPtr),
            data: readDouble(tretPtr),
          };
        }));
    },

    sol_eclipse_when_glob(tjdStart: number, ifl: number, ifltype: number, backwards: boolean): EclipseWhenResult {
      ensureInitialized();
      return withPointers([DOUBLE_BYTES * 10, ERR_BUFFER_BYTES], ([tretPtr, errPtr]) => {
        const flag = emscriptenModule._swe_sol_eclipse_when_glob(tjdStart, ifl, ifltype, tretPtr, backwards ? 1 : 0, errPtr);
        return {
          flag,
          error: readString(errPtr),
          data: readDoubles(tretPtr, 10),
        };
      });
    },

    lun_eclipse_when(tjdStart: number, ifl: number, ifltype: number, backwards: boolean): EclipseWhenResult {
      ensureInitialized();
      return withPointers([DOUBLE_BYTES * 10, ERR_BUFFER_BYTES], ([tretPtr, errPtr]) => {
        const flag = emscriptenModule._swe_lun_eclipse_when(tjdStart, ifl, ifltype, tretPtr, backwards ? 1 : 0, errPtr);
        return {
          flag,
          error: readString(errPtr),
          data: readDoubles(tretPtr, 8),
        };
      });
    },

    solcross_ut(x2cross: number, jdUt: number, flag: number): CrossResult {
      ensureInitialized();
      return withPointers([ERR_BUFFER_BYTES], ([errPtr]) => ({
        date: emscriptenModule._swe_solcross_ut(x2cross, jdUt, flag, errPtr),
        error: readString(errPtr),
      }));
    },

    mooncross_ut(x2cross: number, jdUt: number, flag: number): CrossResult {
      ensureInitialized();
      return withPointers([ERR_BUFFER_BYTES], ([errPtr]) => ({
        date: emscriptenModule._swe_mooncross_ut(x2cross, jdUt, flag, errPtr),
        error: readString(errPtr),
      }));
    },

    fixstar_ut(star: string, tjdUt: number, iflag: number): FixStarResult {
      ensureInitialized();
      const minimumBytes = Number(constants.SE_MAX_STNAME ?? 256) + 1;
      return withCString(
        star,
        starPtr => withPointers([DOUBLE_BYTES * 6, ERR_BUFFER_BYTES], ([xxPtr, errPtr]) => {
          const flag = emscriptenModule._swe_fixstar_ut(starPtr, tjdUt, iflag, xxPtr, errPtr);
          return {
            flag,
            error: readString(errPtr),
            name: readString(starPtr),
            data: readCalcData(xxPtr),
          };
        }),
        minimumBytes,
      );
    },

    fixstar2_mag(star: string): FixStarMagnitudeResult {
      ensureInitialized();
      const minimumBytes = Number(constants.SE_MAX_STNAME ?? 256) + 1;
      return withCString(
        star,
        starPtr => withPointers([DOUBLE_BYTES, ERR_BUFFER_BYTES], ([magPtr, errPtr]) => {
          const flag = emscriptenModule._swe_fixstar2_mag(starPtr, magPtr, errPtr);
          return {
            flag,
            error: readString(errPtr),
            name: readString(starPtr),
            data: readDouble(magPtr),
          };
        }),
        minimumBytes,
      );
    },

    get_ayanamsa_ex_ut(tjdUt: number, iflag: number): AyanamsaResult {
      ensureInitialized();
      return withPointers([DOUBLE_BYTES, ERR_BUFFER_BYTES], ([dayaPtr, errPtr]) => {
        const flag = emscriptenModule._swe_get_ayanamsa_ex_ut(tjdUt, iflag, dayaPtr, errPtr);
        return {
          flag,
          error: readString(errPtr),
          data: readDouble(dayaPtr),
        };
      });
    },
  };
}

const sweph = createAdapter();

export function initializeSweph(): void {
  if (!closed) {
    ensureInitialized();
    return;
  }

  ensureInitialized();
}

export function getSweph(): SwephAdapter {
  initializeSweph();
  return sweph;
}

export type { SwephAdapter };
