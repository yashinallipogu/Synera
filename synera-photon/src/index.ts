import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Spectrum } from "spectrum-ts";
import { imessage } from "@spectrum-ts/imessage";
// Spectrum bridges a single agent loop to many messaging interfaces.
// Each provider in `providers` adds an interface (terminal TUI, iMessage, …).
// Docs: https://photon.codes/docs/spectrum-ts
const app = await Spectrum({
  projectId: process.env.PROJECT_ID!,
  projectSecret: process.env.PROJECT_SECRET!,
  providers: [
    // imessage
    imessage.config(),
  ],
});

const projectSecret = process.env.PROJECT_SECRET!;
const bridgePort = Number(process.env.PHOTON_BRIDGE_PORT) || 5190;
const bridge = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/api/send") {
    response.writeHead(404).end();
    return;
  }

  const authorization = request.headers.authorization || "";
  const suppliedSecret = Buffer.from(authorization.replace(/^Bearer\s+/i, ""));
  const expectedSecret = Buffer.from(projectSecret);
  if (suppliedSecret.length !== expectedSecret.length || !timingSafeEqual(suppliedSecret, expectedSecret)) {
    response.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Unauthorized." }));
    return;
  }

  let stage = "request parsing";
  try {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 8192) {
        response.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }

    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { phone?: unknown; text?: unknown };
    if (typeof payload.phone !== "string" || !/^\+[1-9]\d{7,14}$/.test(payload.phone)) {
      response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "A valid international phone number is required." }));
      return;
    }
    if (typeof payload.text !== "string" || !payload.text.trim() || payload.text.length > 2000) {
      response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Message text is required." }));
      return;
    }

    stage = "recipient lookup";
    const provider = imessage(app);
    const recipient = await provider.user(payload.phone);
    stage = "conversation creation";
    const space = await provider.space.create(recipient);
    stage = "message delivery";
    await space.send(payload.text.trim());
    response.writeHead(202, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true }));
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    let details = error instanceof Error ? error.message : "Unknown Photon error.";
    details = details
      .replaceAll(projectSecret, "[redacted secret]")
      .replace(/\+?\d[\d\s().-]{5,}\d/g, "[redacted number]")
      .replace(/[A-Z0-9_-]{40,}/gi, "[redacted token]")
      .slice(0, 400);
    console.error(`Photon ${stage} failed (${errorName}): ${details}`);
    const targetNotAllowed = error instanceof Error && error.message.includes("Target not allowed for this project");
    response.writeHead(targetNotAllowed ? 403 : 502, { "Content-Type": "application/json" }).end(JSON.stringify({
      error: targetNotAllowed ? "Recipient is not allowed for this Photon project." : "Message could not be sent.",
    }));
  }
});

bridge.listen(bridgePort, "127.0.0.1", () => {
  console.log(`Synera notification bridge listening on 127.0.0.1:${bridgePort}`);
});

// `app.messages` is an async iterable. Each tick yields a `space` (the
// conversation) and an inbound `message`. Reply by awaiting `space.send(...)`.
for await (const [space, message] of app.messages) {
  if (message.content.type === "text") {
    await space.send(`echo: ${message.content.text}`);
  }
}
