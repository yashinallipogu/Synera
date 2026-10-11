import process from "node:process";
import { createAuthHandler } from "../server/auth.js";

if (process.env.VERCEL && !process.env.SYNERA_DATA_DIR) {
  process.env.SYNERA_DATA_DIR = "/tmp/synera";
}

const auth = createAuthHandler();

export default async function handler(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const routePath = request.query?.path || url.searchParams.get("path");
  if (!routePath) {
    response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "API route is required." }));
    return;
  }

  url.searchParams.delete("path");
  request.url = `/api/${routePath}${url.search ? `?${url.searchParams}` : ""}`;
  await auth.handler(request, response);
}