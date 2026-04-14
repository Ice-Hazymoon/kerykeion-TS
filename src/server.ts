import { createApp } from "./api/app";
import { readEnv } from "./core/runtime";

const app = createApp();

const port = Number(readEnv("PORT") ?? 3000);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Astrologer API TS listening on http://localhost:${port}`);
