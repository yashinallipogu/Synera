import express from "express";
import { generateStudyHelperReply } from "./gemini.js";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

export function createStudyHelperRouter(apiKey) {
  const router = express.Router();
  const requestsByAddress = new Map();

  router.use(express.json({ limit: "32kb" }));
  router.use((request, response, next) => {
    if (request.method !== "POST" || request.path !== "/study-helper") {
      next();
      return;
    }

    const now = Date.now();
    const address = request.ip || request.socket.remoteAddress || "unknown";
    const timestamps = (requestsByAddress.get(address) || [])
      .filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
      sendJson(response, 429, { error: "Too many requests. Please wait a minute and try again." });
      return;
    }

    timestamps.push(now);
    requestsByAddress.set(address, timestamps);
    next();
  });

  router.post("/study-helper", async (request, response) => {
    const result = await generateStudyHelperReply(request.body, apiKey);
    sendJson(response, result.status, result.body);
  });

  router.use((error, request, response, next) => {
    if (request.method === "POST" && error.type === "entity.too.large") {
      sendJson(response, 413, { error: "That conversation is too large. Start a new chat and try again." });
      return;
    }
    if (request.method === "POST" && error instanceof SyntaxError && "body" in error) {
      sendJson(response, 400, { error: "The chat request was not valid JSON." });
      return;
    }
    next(error);
  });

  return router;
}
