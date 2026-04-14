import path from "node:path";

import { readEnv } from "../src/core/runtime";

const rootDir = process.cwd();
const demoDir = path.join(rootDir, "demo", "browser");
const outDir = path.join(rootDir, ".tmp", "browser-demo");

async function buildBrowserLibrary(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [path.join(rootDir, "src", "index.ts")],
    outdir: outDir,
    target: "browser",
    format: "esm",
    sourcemap: "none",
    naming: "library.js",
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error("Browser demo bundle build failed.");
  }
}

function contentTypeFor(pathname: string): string {
  if (pathname.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (pathname.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  return "text/plain; charset=utf-8";
}

async function start(): Promise<void> {
  await buildBrowserLibrary();

  const port = Number(readEnv("PORT") ?? 3010);

  Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(Bun.file(path.join(demoDir, "index.html")), {
          headers: {
            "content-type": contentTypeFor("index.html"),
          },
        });
      }

      if (url.pathname === "/client.js") {
        return new Response(Bun.file(path.join(demoDir, "client.js")), {
          headers: {
            "content-type": contentTypeFor("client.js"),
          },
        });
      }

      if (url.pathname === "/library.js") {
        return new Response(Bun.file(path.join(outDir, "library.js")), {
          headers: {
            "content-type": contentTypeFor("library.js"),
          },
        });
      }

      if (url.pathname === "/health") {
        return Response.json({ status: "OK" });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`Browser demo available at http://localhost:${port}`);
}

void start();
