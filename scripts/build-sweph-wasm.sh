#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/vendor/pyswisseph-source"
OUT_DIR="$ROOT_DIR/src/generated/sweph/emscripten"

mkdir -p "$OUT_DIR"

emcc \
  "$SOURCE_DIR/wasm-wrapper.c" \
  "$SOURCE_DIR/libswe/swecl.c" \
  "$SOURCE_DIR/libswe/swedate.c" \
  "$SOURCE_DIR/libswe/swehel.c" \
  "$SOURCE_DIR/libswe/swehouse.c" \
  "$SOURCE_DIR/libswe/swejpl.c" \
  "$SOURCE_DIR/libswe/swemmoon.c" \
  "$SOURCE_DIR/libswe/swemplan.c" \
  "$SOURCE_DIR/libswe/sweph.c" \
  "$SOURCE_DIR/libswe/swephlib.c" \
  -I"$SOURCE_DIR/libswe" \
  --embed-file "$ROOT_DIR/assets/sweph@/sweph" \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=web,worker,node \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s FILESYSTEM=1 \
  -s NO_EXIT_RUNTIME=1 \
  -s SINGLE_FILE=1 \
  -s EXPORTED_FUNCTIONS='["_malloc","_free","_sweph_init","_swe_calc_ut","_swe_set_topo","_swe_set_sid_mode","_swe_close","_swe_julday","_swe_difdeg2n","_swe_houses_ex2","_swe_houses_ex","_swe_azalt","_swe_rise_trans","_swe_sol_eclipse_when_glob","_swe_lun_eclipse_when","_swe_solcross_ut","_swe_mooncross_ut","_swe_fixstar_ut","_swe_fixstar2_mag","_swe_get_ayanamsa_ex_ut","_swe_house_name"]' \
  -s EXPORTED_RUNTIME_METHODS='["UTF8ToString","stringToUTF8","lengthBytesUTF8","getValue","setValue"]' \
  -O2 \
  -o "$OUT_DIR/sweph.mjs"
