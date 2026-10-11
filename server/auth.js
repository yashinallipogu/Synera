import { randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { promisify } from "node:util";
import { getMatches } from "../src/lib/match.js";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "synera_session";
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_BYTES = 64;
const PROFILE_FIELDS = ["name", "major", "offers", "wants", "phone", "textOptIn", "customSkills", "location"];

function readCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const separator = part.indexOf("=");
    return separator === -1
      ? ["", ""]
      : [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
  }));
}

function normalizeProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Object.assign(new Error("Profile details are required."), { status: 400 });
  }

  const profile = {};
  for (const field of PROFILE_FIELDS) {
    if (field === "offers" || field === "wants" || field === "customSkills") {
      const items = value[field] ?? [];
      if (!Array.isArray(items) || items.length > 40 || items.some((item) => typeof item !== "string" || item.length > 80)) {
        throw Object.assign(new Error("Profile choices are invalid."), { status: 400 });
      }
      profile[field] = [...new Set(items)];
    } else if (field === "textOptIn") {
      if (typeof value[field] !== "boolean") {
        throw Object.assign(new Error("Text reminder consent must be a yes or no choice."), { status: 400 });
      }
      profile[field] = value[field];
    } else if (field === "location") {
      const location = value[field] ?? null;
      if (location === null) {
        profile[field] = null;
      } else if (
        typeof location !== "object" || Array.isArray(location)
        || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)
        || Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180
      ) {
        throw Object.assign(new Error("Map location is invalid."), { status: 400 });
      } else {
        profile[field] = { lat: location.lat, lng: location.lng };
      }
    } else {
      const text = value[field] ?? "";
      if (typeof text !== "string" || text.length > 100) {
        throw Object.assign(new Error("Profile details are invalid."), { status: 400 });
      }
      profile[field] = text.trim();
    }
  }
  if (profile.phone && !/^\+[1-9]\d{7,14}$/.test(profile.phone)) {
    throw Object.assign(new Error("Use an international phone number, for example +14155550123."), { status: 400 });
  }
  if (profile.textOptIn && !profile.phone) {
    throw Object.assign(new Error("Add a phone number before enabling text reminders."), { status: 400 });
  }
  return profile;
}

function parseProfile(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readJson(request) {
  if (request.body !== undefined) {
    if (typeof request.body !== "string") return request.body;
    try {
      return JSON.parse(request.body);
    } catch {
      throw Object.assign(new Error("Please send valid JSON."), { status: 400 });
    }
  }

  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16384) {
      throw Object.assign(new Error("Request is too large."), { status: 413 });
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Please send valid JSON."), { status: 400 });
  }
}

export function createAuthHandler() {
  const dataDirectory = process.env.SYNERA_DATA_DIR || path.resolve(".synera");
  mkdirSync(dataDirectory, { recursive: true });
  const databasePath = process.env.SYNERA_DB_PATH || path.join(dataDirectory, "accounts.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      profile_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY,
      first_account_id INTEGER NOT NULL REFERENCES accounts(id),
      second_account_id INTEGER NOT NULL REFERENCES accounts(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(first_account_id, second_account_id)
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      sender_account_id INTEGER NOT NULL REFERENCES accounts(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS meetups (
      id INTEGER PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      proposed_by INTEGER NOT NULL REFERENCES accounts(id),
      starts_at TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS meetup_reminders (
      meetup_id INTEGER NOT NULL REFERENCES meetups(id),
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(meetup_id, account_id)
    );
    CREATE TABLE IF NOT EXISTS match_notifications (
      recipient_account_id INTEGER NOT NULL REFERENCES accounts(id),
      matched_account_id INTEGER NOT NULL REFERENCES accounts(id),
      sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(recipient_account_id, matched_account_id)
    );
    CREATE TABLE IF NOT EXISTS phone_verifications (
      account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
      phone TEXT NOT NULL,
      salt TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_sent_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verified_phones (
      account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
      phone TEXT NOT NULL UNIQUE,
      verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx
      ON chat_messages(conversation_id, id);
    CREATE INDEX IF NOT EXISTS meetups_reminder_idx
      ON meetups(status, starts_at);
  `);

  const sessions = new Map();
  const findAccount = database.prepare("SELECT id, username, profile_json FROM accounts WHERE id = ?");
  const findByUsername = database.prepare("SELECT * FROM accounts WHERE username = ? COLLATE NOCASE");
  const findProfiles = database.prepare("SELECT id, username, profile_json FROM accounts WHERE profile_json IS NOT NULL AND id != ?");
  const findVerifiedPhone = database.prepare("SELECT phone FROM verified_phones WHERE account_id = ?");
  const findConversation = database.prepare("SELECT * FROM conversations WHERE id = ?");
  const findConversationMessages = database.prepare("SELECT id, sender_account_id, body, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY id");
  const findConversationMeetups = database.prepare("SELECT id, proposed_by, starts_at, location, status, created_at FROM meetups WHERE conversation_id = ? ORDER BY id DESC");

  const send = (response, status, value, headers = {}) => {
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    });
    response.end(JSON.stringify(value));
  };

  const sessionCookie = (token, maxAge) => {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
  };

  const accountFor = (id) => {
    const account = findAccount.get(id);
    if (!account) return null;
    const profile = parseProfile(account.profile_json);
    if (profile) profile.phoneVerified = findVerifiedPhone.get(id)?.phone === profile.phone;
    return { id: Number(account.id), username: account.username, profile };
  };

  const matchingProfiles = (accountId) => findProfiles.all(accountId)
    .map((account) => {
      const profile = parseProfile(account.profile_json);
      if (!profile?.name || !profile?.major || !profile?.offers?.length || !profile?.wants?.length) return null;
      return {
        id: Number(account.id),
        username: account.username,
        name: profile.name,
        major: profile.major,
        offers: profile.offers,
        wants: profile.wants,
        location: profile.location || null,
        swaps: 0,
      };
    })
    .filter(Boolean);

  const matchesFor = (accountId) => {
    const account = findAccount.get(accountId);
    const profile = parseProfile(account?.profile_json);
    if (!profile) return [];
    return getMatches({ ...profile, id: Number(accountId) }, matchingProfiles(Number(accountId)));
  };

  const conversationContains = (conversation, accountId) =>
    conversation && (conversation.first_account_id === accountId || conversation.second_account_id === accountId);

  const photonSend = async (phone, text) => {
    const projectId = process.env.PROJECT_ID || process.env.SPECTRUM_PROJECT_ID;
    const projectSecret = process.env.PROJECT_SECRET || process.env.SPECTRUM_PROJECT_SECRET;
    if (!projectId || !projectSecret || !phone) return { ok: false, status: 503, reason: "not_configured" };
    try {
      const response = await fetch(process.env.SYNERA_PHOTON_BRIDGE_URL || "http://127.0.0.1:5190/api/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${projectSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, text }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) console.warn(`Photon bridge returned HTTP ${response.status}`);
      return { ok: response.ok, status: response.status };
    } catch (error) {
      console.warn(`Photon bridge unavailable: ${error.message}`);
      return { ok: false, status: 0 };
    }
  };

  const notifyAccount = async (accountId, text) => {
    const account = findAccount.get(accountId);
    const profile = parseProfile(account?.profile_json);
    if (!profile?.textOptIn || !profile.phone) return false;
    return photonSend(profile.phone, text);
  };

  const chatParticipants = (conversation) => [
    Number(conversation.first_account_id),
    Number(conversation.second_account_id),
  ];

  const chatSummary = (conversation, accountId) => {
    const otherId = chatParticipants(conversation).find((id) => id !== accountId);
    const other = accountFor(otherId);
    const profile = other?.profile;
    const lastMessage = database.prepare(
      "SELECT body, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1"
    ).get(conversation.id);
    return {
      id: Number(conversation.id),
      user: { id: otherId, username: other.username, name: profile?.name || other.username, major: profile?.major || "" },
      lastMessage: lastMessage?.body || "No messages yet",
      updatedAt: lastMessage?.created_at || conversation.created_at,
    };
  };

  const canStartChat = (accountId, otherId) =>
    matchesFor(accountId).some((match) => Number(match.user.id) === otherId);

  const pendingReminderRows = database.prepare(`
    SELECT m.id, m.starts_at, m.location, c.first_account_id, c.second_account_id
    FROM meetups m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.status = 'accepted'
      AND julianday(m.starts_at) > julianday('now')
      AND julianday(m.starts_at) <= julianday('now', '+1 hour')
  `);
  const hasReminder = database.prepare("SELECT 1 FROM meetup_reminders WHERE meetup_id = ? AND account_id = ?");
  const recordReminder = database.prepare("INSERT OR IGNORE INTO meetup_reminders (meetup_id, account_id) VALUES (?, ?)");

  const sendDueReminders = async () => {
    for (const meetup of pendingReminderRows.all()) {
      for (const accountId of [meetup.first_account_id, meetup.second_account_id]) {
        if (hasReminder.get(meetup.id, accountId)) continue;
        const account = findAccount.get(accountId);
        const profile = parseProfile(account?.profile_json);
        if (!profile?.textOptIn || !profile.phone) continue;
        const delivery = await photonSend(
          profile.phone,
          `Synera reminder: your meetup is coming up at ${meetup.location}. Open Synera for chat details.`
        );
        if (delivery.ok) recordReminder.run(meetup.id, accountId);
      }
    }
  };

  const createSession = (response, accountId) => {
    const token = randomBytes(32).toString("hex");
    sessions.set(token, { accountId, expiresAt: Date.now() + SESSION_TTL });
    response.setHeader("Set-Cookie", sessionCookie(token, SESSION_TTL / 1000));
  };

  const currentAccount = (request) => {
    const token = readCookies(request.headers.cookie)[SESSION_COOKIE];
    const session = sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      sessions.delete(token);
      return null;
    }
    return accountFor(session.accountId);
  };

  const handler = async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    try {
      if (url.pathname === "/api/study-spots") {
        if (request.method !== "GET") {
          return send(response, 405, { error: "Use GET to find nearby study spots." }, { Allow: "GET" });
        }
        if (!url.searchParams.has("lat") || !url.searchParams.has("lng")) {
          return send(response, 400, { error: "Latitude and longitude are required." });
        }

        const lat = Number(url.searchParams.get("lat"));
        const lng = Number(url.searchParams.get("lng"));
        if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
          return send(response, 400, { error: "A valid latitude and longitude are required." });
        }

        const query = `[out:json][timeout:20];(nwr(around:2500,${lat},${lng})["amenity"~"^(library|cafe|coworking_space|community_centre|university)$"]["name"];);out center tags;`;
        let placesResponse;
        try {
          placesResponse = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
              "User-Agent": "Synera study spot finder",
            },
            body: new URLSearchParams({ data: query }),
            signal: AbortSignal.timeout(25_000),
          });
        } catch (error) {
          console.error("OpenStreetMap study spot lookup failed:", error);
          return send(response, 502, { error: "OpenStreetMap could not be reached. Please try again shortly." });
        }
        if (!placesResponse.ok) {
          console.error(`OpenStreetMap study spot lookup returned HTTP ${placesResponse.status}.`);
          return send(response, 502, { error: "OpenStreetMap is temporarily unavailable. Please try again shortly." });
        }

        let places;
        try {
          places = await placesResponse.json();
        } catch (error) {
          console.error("OpenStreetMap returned invalid study spot data:", error);
          return send(response, 502, { error: "OpenStreetMap returned invalid data. Please try again shortly." });
        }
        if (!Array.isArray(places.elements)) {
          console.error("OpenStreetMap study spot lookup response is missing its elements.");
          return send(response, 502, { error: "OpenStreetMap returned invalid data. Please try again shortly." });
        }

        return send(response, 200, { elements: places.elements });
      }

      if (request.method === "GET" && url.pathname === "/api/auth/me") {
        const user = currentAccount(request);
        return send(response, 200, { user });
      }

      if (request.method === "POST" && url.pathname === "/api/auth/register") {
        const body = await readJson(request);
        const username = typeof body.username === "string" ? body.username.trim() : "";
        const password = typeof body.password === "string" ? body.password : "";
        if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
          return send(response, 400, { error: "Username must be 3-24 characters: letters, numbers, dot, dash, or underscore." });
        }
        if (password.length < 10 || password.length > 128) {
          return send(response, 400, { error: "Password must be between 10 and 128 characters." });
        }

        const salt = randomBytes(16).toString("hex");
        const passwordHash = await scrypt(password, salt, PASSWORD_BYTES);
        let result;
        try {
          result = database.prepare("INSERT INTO accounts (username, salt, password_hash) VALUES (?, ?, ?)")
            .run(username, salt, passwordHash.toString("hex"));
        } catch (error) {
          if (error.code === "ERR_SQLITE_CONSTRAINT_UNIQUE" || error.message.includes("UNIQUE constraint failed")) {
            return send(response, 409, { error: "That username is already taken." });
          }
          throw error;
        }

        createSession(response, Number(result.lastInsertRowid));
        return send(response, 201, { user: accountFor(Number(result.lastInsertRowid)) });
      }

      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        const body = await readJson(request);
        const username = typeof body.username === "string" ? body.username.trim() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const account = findByUsername.get(username);
        if (!account) {
          await scrypt(password, "synera-login-probe", PASSWORD_BYTES);
          return send(response, 401, { error: "Username or password is incorrect." });
        }
        const suppliedHash = await scrypt(password, account.salt, PASSWORD_BYTES);
        const storedHash = Buffer.from(account.password_hash, "hex");
        if (storedHash.length !== suppliedHash.length || !timingSafeEqual(storedHash, suppliedHash)) {
          return send(response, 401, { error: "Username or password is incorrect." });
        }

        createSession(response, account.id);
        return send(response, 200, { user: accountFor(account.id) });
      }

      if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        const token = readCookies(request.headers.cookie)[SESSION_COOKIE];
        if (token) sessions.delete(token);
        return send(response, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
      }

      if (request.method === "GET" && url.pathname === "/api/matches") {
        const account = currentAccount(request);
        if (!account) return send(response, 401, { error: "Please log in." });
        const session = sessions.get(readCookies(request.headers.cookie)[SESSION_COOKIE]);
        return send(response, 200, { matches: matchesFor(session.accountId) });
      }

      if (request.method === "GET" && url.pathname === "/api/chats") {
        const account = currentAccount(request);
        if (!account) return send(response, 401, { error: "Please log in." });
        const session = sessions.get(readCookies(request.headers.cookie)[SESSION_COOKIE]);
        const conversations = database.prepare(
          "SELECT * FROM conversations WHERE first_account_id = ? OR second_account_id = ? ORDER BY created_at DESC"
        ).all(session.accountId, session.accountId);
        return send(response, 200, { chats: conversations.map((chat) => chatSummary(chat, session.accountId)) });
      }

      if (request.method === "POST" && url.pathname === "/api/chats") {
        const account = currentAccount(request);
        if (!account) return send(response, 401, { error: "Please log in." });
        const session = sessions.get(readCookies(request.headers.cookie)[SESSION_COOKIE]);
        const body = await readJson(request);
        const otherId = Number(body.userId);
        if (!Number.isSafeInteger(otherId) || otherId === session.accountId || !canStartChat(session.accountId, otherId)) {
          return send(response, 403, { error: "You can only message a current skill match." });
        }
        const firstId = Math.min(session.accountId, otherId);
        const secondId = Math.max(session.accountId, otherId);
        database.prepare("INSERT OR IGNORE INTO conversations (first_account_id, second_account_id) VALUES (?, ?)")
          .run(firstId, secondId);
        const conversation = database.prepare(
          "SELECT * FROM conversations WHERE first_account_id = ? AND second_account_id = ?"
        ).get(firstId, secondId);
        return send(response, 200, { chat: chatSummary(conversation, session.accountId) });
      }

      const chatMatch = url.pathname.match(/^\/api\/chats\/(\d+)(?:\/(messages|meetups))?$/);
      if (chatMatch) {
        const account = currentAccount(request);
        if (!account) return send(response, 401, { error: "Please log in." });
        const session = sessions.get(readCookies(request.headers.cookie)[SESSION_COOKIE]);
        const conversation = findConversation.get(Number(chatMatch[1]));
        if (!conversationContains(conversation, session.accountId)) {
          return send(response, 404, { error: "Conversation not found." });
        }
        const subresource = chatMatch[2];

        if (request.method === "GET" && !subresource) {
          return send(response, 200, {
            chat: chatSummary(conversation, session.accountId),
            messages: findConversationMessages.all(conversation.id).map((message) => ({
              id: Number(message.id),
              senderId: Number(message.sender_account_id),
              body: message.body,
              createdAt: message.created_at,
            })),
            meetups: findConversationMeetups.all(conversation.id).map((meetup) => ({
              id: Number(meetup.id),
              proposedBy: Number(meetup.proposed_by),
              startsAt: meetup.starts_at,
              location: meetup.location,
              status: meetup.status,
              createdAt: meetup.created_at,
            })),
          });
        }

        if (request.method === "POST" && subresource === "messages") {
          const body = await readJson(request);
          const text = typeof body.text === "string" ? body.text.trim() : "";
          if (!text || text.length > 2000) {
            return send(response, 400, { error: "Messages must be between 1 and 2,000 characters." });
          }
          const result = database.prepare(
            "INSERT INTO chat_messages (conversation_id, sender_account_id, body) VALUES (?, ?, ?)"
          ).run(conversation.id, session.accountId, text);
          const message = {
            id: Number(result.lastInsertRowid),
            senderId: session.accountId,
            body: text,
            createdAt: new Date().toISOString(),
          };
          const recipientId = chatParticipants(conversation).find((id) => id !== session.accountId);
          await notifyAccount(recipientId, "You have a new Synera chat message. Open Synera to reply.");
          return send(response, 201, { message });
        }

        if (request.method === "POST" && subresource === "meetups") {
          const body = await readJson(request);
          const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : new Date(NaN);
          const location = typeof body.location === "string" ? body.location.trim() : "";
          if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() < Date.now() + 15 * 60 * 1000 || startsAt.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) {
            return send(response, 400, { error: "Choose a meetup time at least 15 minutes from now and within the next 90 days." });
          }
          if (!location || location.length > 200) {
            return send(response, 400, { error: "Add a meetup place (up to 200 characters)." });
          }
          const result = database.prepare(
            "INSERT INTO meetups (conversation_id, proposed_by, starts_at, location) VALUES (?, ?, ?, ?)"
          ).run(conversation.id, session.accountId, startsAt.toISOString(), location);
          const recipientId = chatParticipants(conversation).find((id) => id !== session.accountId);
          await notifyAccount(recipientId, "You have a Synera meetup proposal. Open Synera chat to review it.");
          return send(response, 201, { meetup: {
            id: Number(result.lastInsertRowid),
            proposedBy: session.accountId,
            startsAt: startsAt.toISOString(),
            location,
            status: "pending",
          } });
        }
      }

      const meetupMatch = url.pathname.match(/^\/api\/meetups\/(\d+)$/);
      if (request.method === "PATCH" && meetupMatch) {
        const account = currentAccount(request);
        if (!account) return send(response, 401, { error: "Please log in." });
        const session = sessions.get(readCookies(request.headers.cookie)[SESSION_COOKIE]);
        const meetup = database.prepare("SELECT * FROM meetups WHERE id = ?").get(Number(meetupMatch[1]));
        const conversation = meetup && findConversation.get(meetup.conversation_id);
        if (!conversationContains(conversation, session.accountId)) {
          return send(response, 404, { error: "Meetup not found." });
        }
        if (meetup.proposed_by === session.accountId || meetup.status !== "pending") {
          return send(response, 409, { error: "Only the other participant can respond to a pending meetup." });
        }
        const body = await readJson(request);
        if (!["accepted", "declined"].includes(body.action)) {
          return send(response, 400, { error: "Choose accepted or declined." });
        }
        database.prepare("UPDATE meetups SET status = ? WHERE id = ?").run(body.action, meetup.id);
        if (body.action === "accepted") {
          await notifyAccount(meetup.proposed_by, "Your Synera meetup was accepted. Open Synera chat for the details.");
        }
        return send(response, 200, { ok: true, status: body.action });
      }

      if (request.method === "POST" && url.pathname === "/api/phone-verification/send") {
        const account = currentAccount(request);
        if (!account) return send(response, 401, { error: "Please log in." });
        const session = sessions.get(readCookies(request.headers.cookie)[SESSION_COOKIE]);
        const body = await readJson(request);
        const phone = typeof body.phone === "string" ? body.phone.trim() : "";
        if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
          return send(response, 400, { error: "Enter a valid international phone number, such as +14155550123." });
        }
        const existingOwner = database.prepare("SELECT account_id FROM verified_phones WHERE phone = ?").get(phone);
        if (existingOwner && existingOwner.account_id !== session.accountId) {
          return send(response, 409, { error: "That phone number is already linked to another account." });
        }
        const previous = database.prepare("SELECT last_sent_at FROM phone_verifications WHERE account_id = ?")
          .get(session.accountId);
        if (previous && Date.now() - new Date(previous.last_sent_at).getTime() < 60_000) {
          return send(response, 429, { error: "Wait a minute before requesting another code." });
        }

        const code = String(randomInt(100_000, 1_000_000));
        const salt = randomBytes(16).toString("hex");
        const codeHash = (await scrypt(code, salt, PASSWORD_BYTES)).toString("hex");
        const now = new Date();
        database.prepare(`
          INSERT INTO phone_verifications (account_id, phone, salt, code_hash, expires_at, attempts, last_sent_at)
          VALUES (?, ?, ?, ?, ?, 0, ?)
          ON CONFLICT(account_id) DO UPDATE SET
            phone = excluded.phone,
            salt = excluded.salt,
            code_hash = excluded.code_hash,
            expires_at = excluded.expires_at,
            attempts = 0,
            last_sent_at = excluded.last_sent_at
        `).run(session.accountId, phone, salt, codeHash, new Date(now.getTime() + 10 * 60_000).toISOString(), now.toISOString());

        const delivery = await photonSend(phone, `Your Synera verification code is ${code}. It expires in 10 minutes.`);
        if (!delivery.ok && delivery.status === 403) {
          return send(response, 403, { error: "Photon does not allow this number for the active project. Check that the exact international number is saved in this project's Users list." });
        }
        if (!delivery.ok && delivery.status === 401) {
          return send(response, 502, { error: "Photon rejected the bridge credentials. Confirm Synera and Photon use the same project secret, then restart both services." });
        }
        if (!delivery.ok && delivery.reason === "not_configured") {
          return send(response, 503, { error: "Photon is not configured on this server. Add PROJECT_ID and PROJECT_SECRET to synera-photon/.env, install its dependencies, and start the Photon service." });
        }
        if (!delivery.ok && delivery.status === 0) {
          return send(response, 503, { error: "The Photon bridge is not running. Start the service in synera-photon, then try again." });
        }
        if (!delivery.ok) return send(response, 502, { error: "Photon could not deliver the code. Check that the Photon service is running, then try again." });
        return send(response, 200, { ok: true });
      }

      if (request.method === "POST" && url.pathname === "/api/phone-verification/verify") {
        const account = currentAccount(request);
        if (!account) return send(response, 401, { error: "Please log in." });
        const session = sessions.get(readCookies(request.headers.cookie)[SESSION_COOKIE]);
        const body = await readJson(request);
        const code = typeof body.code === "string" ? body.code.trim() : "";
        const challenge = database.prepare("SELECT * FROM phone_verifications WHERE account_id = ?")
          .get(session.accountId);
        if (!challenge || challenge.attempts >= 5 || new Date(challenge.expires_at).getTime() <= Date.now()) {
          return send(response, 400, { error: "That code expired. Request a new one." });
        }
        if (!/^\d{6}$/.test(code)) {
          return send(response, 400, { error: "Enter the six-digit code." });
        }
        const suppliedHash = await scrypt(code, challenge.salt, PASSWORD_BYTES);
        const storedHash = Buffer.from(challenge.code_hash, "hex");
        if (storedHash.length !== suppliedHash.length || !timingSafeEqual(storedHash, suppliedHash)) {
          database.prepare("UPDATE phone_verifications SET attempts = attempts + 1 WHERE account_id = ?")
            .run(session.accountId);
          return send(response, 400, { error: "That code is incorrect." });
        }
        try {
          database.prepare(`
            INSERT INTO verified_phones (account_id, phone) VALUES (?, ?)
            ON CONFLICT(account_id) DO UPDATE SET phone = excluded.phone, verified_at = CURRENT_TIMESTAMP
          `).run(session.accountId, challenge.phone);
        } catch (error) {
          if (error.message.includes("UNIQUE constraint failed")) {
            return send(response, 409, { error: "That phone number is already linked to another account." });
          }
          throw error;
        }
        database.prepare("DELETE FROM phone_verifications WHERE account_id = ?").run(session.accountId);
        return send(response, 200, { ok: true, phone: challenge.phone });
      }

      if (request.method === "PUT" && url.pathname === "/api/profile") {
        const account = currentAccount(request);
        if (!account) return send(response, 401, { error: "Please log in." });
        const token = readCookies(request.headers.cookie)[SESSION_COOKIE];
        const session = sessions.get(token);
        const profile = normalizeProfile(await readJson(request));
        const verifiedPhone = findVerifiedPhone.get(session.accountId)?.phone;
        if (profile.textOptIn && verifiedPhone !== profile.phone) {
          return send(response, 400, { error: "Verify this phone number before enabling text alerts." });
        }
        if (verifiedPhone && verifiedPhone !== profile.phone) {
          database.prepare("DELETE FROM verified_phones WHERE account_id = ?").run(session.accountId);
          profile.textOptIn = false;
        }
        database.prepare("UPDATE accounts SET profile_json = ? WHERE id = ?")
          .run(JSON.stringify(profile), session.accountId);
        if (profile.name && profile.major && profile.offers.length && profile.wants.length) {
          for (const match of matchesFor(session.accountId)) {
            const reciprocalMatch = matchesFor(match.user.id)
              .some((candidate) => candidate.user.id === session.accountId);
            if (!reciprocalMatch) continue;
            const notification = database.prepare(
              "INSERT OR IGNORE INTO match_notifications (recipient_account_id, matched_account_id) VALUES (?, ?)"
            ).run(match.user.id, session.accountId);
            if (notification.changes) {
              await notifyAccount(match.user.id, "You have a new Synera skill match. Open Synera to see who you can connect with.");
            }
          }
        }
        return send(response, 200, { user: accountFor(session.accountId) });
      }

      return send(response, 404, { error: "Not found." });
    } catch (error) {
      console.error("Auth request failed:", error);
      return send(response, error.status || 500, {
        error: error.status ? error.message : "The request could not be completed.",
      });
    }
  };

  return { handler, sendDueReminders, close: () => database.close() };
}