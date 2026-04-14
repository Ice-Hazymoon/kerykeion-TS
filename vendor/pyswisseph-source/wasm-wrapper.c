#include "swephexp.h"
#include <emscripten/emscripten.h>

static int sweph_initialized = 0;

EMSCRIPTEN_KEEPALIVE
int sweph_init(void) {
  swe_set_ephe_path("/sweph");
  sweph_initialized = 1;
  return 1;
}
