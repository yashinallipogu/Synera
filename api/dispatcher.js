import process from "node:process";
import express from "express";
import { createAuthHandler } from "../server/auth.js";
import { createStudyHelperRouter } from "./study-helper-router.js";

if (process.env.VERCEL && !process.env.SYNERA_DATA_DIR) {
  process.env.SYNERA_DATA_DIR = "/tmp/synera";
}

const auth = createAuthHandler();
const studyHelper = express();
studyHelper.use("/api", createStudyHelperRouter(process.env.GEMINI_API_KEY));

export default async function handler(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const routePath = request.query?.path || url.searchParams.get("path");
  if (!routePath) {
    response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "API route is required." }));
    return;
  }

  url.searchParams.delete("path");
  if (routePath === "study-helper") {
    request.url = `/api/study-helper${url.search ? `?${url.searchParams}` : ""}`;
    studyHelper(request, response, (error) => {
      if (!error) return;
      console.error(`Study helper request failed: ${error.message}`);
      if (!response.headersSent) response.writeHead(500).end("Internal server error");
    });
    return;
  }
  request.url = `/api/${routePath}${url.search ? `?${url.searchParams}` : ""}`;
  await auth.handler(request, response);
}