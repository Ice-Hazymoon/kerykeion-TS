import { createApp } from "../../src/api/app";

export async function postJson(path: string, payload: unknown): Promise<Response> {
  const app = createApp();
  return app.request(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
