import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateStudyHelperReply } from "./gemini.js";

describe("generateStudyHelperReply", () => {
  it("returns a setup error when the server has no API key", async () => {
    const result = await generateStudyHelperReply({}, "");

    assert.equal(result.status, 503);
    assert.match(result.body.error, /GEMINI_API_KEY/);
  });

  it("validates conversation messages before calling Gemini", async () => {
    const result = await generateStudyHelperReply({
      mode: "chat",
      skill: "Python",
      partnerName: "",
      messages: [{ role: "system", content: "invalid role" }],
    }, "test-key", async () => {
      throw new Error("The API should not be called for invalid messages.");
    });

    assert.equal(result.status, 400);
  });

  it("sends contextual conversation to Gemini and returns its text", async () => {
    let requestUrl;
    let requestBody;
    const result = await generateStudyHelperReply({
      mode: "chat",
      skill: "Python",
      partnerName: "Maya",
      messages: [
        { role: "user", content: "Make a flashcard." },
        { role: "assistant", content: "What does len() return?" },
        { role: "user", content: "Give me another one." },
      ],
    }, "test-key", async (url, options) => {
      requestUrl = url;
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "A list stores an ordered collection." }] } }],
        }),
      };
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.reply, "A list stores an ordered collection.");
    assert.equal(new URL(requestUrl).searchParams.get("key"), "test-key");
    assert.deepEqual(requestBody.contents.map((message) => message.role), ["user", "model", "user"]);
    assert.match(requestBody.systemInstruction.parts[0].text, /Python/);
    assert.match(requestBody.systemInstruction.parts[0].text, /Maya/);
  });

  it("requests and returns exactly five structured flashcards", async () => {
    let requestBody;
    const cards = Array.from({ length: 5 }, (_, index) => ({
      question: `Question ${index + 1}?`,
      answer: `Answer ${index + 1}.`,
    }));
    const result = await generateStudyHelperReply({
      mode: "flashcards",
      skill: "Python",
      partnerName: "",
      messages: [{ role: "user", content: "Make five flashcards." }],
    }, "test-key", async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ cards }) }] } }],
        }),
      };
    });

    assert.equal(requestBody.generationConfig.responseMimeType, "application/json");
    assert.equal(requestBody.generationConfig.responseSchema.properties.cards.type, "ARRAY");
    assert.equal(result.status, 200);
    assert.equal(result.body.cards.length, 5);
    assert.match(result.body.reply, /Card 5\nQuestion: Question 5\?\nAnswer: Answer 5\./);
  });

  it("rejects flashcard replies that do not contain exactly five valid cards", async () => {
    const result = await generateStudyHelperReply({
      mode: "flashcards",
      skill: "Python",
      partnerName: "",
      messages: [{ role: "user", content: "Make five flashcards." }],
    }, "test-key", async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({ cards: [{ question: "One?", answer: "One." }] }) }],
          },
        }],
      }),
    }));

    assert.equal(result.status, 502);
    assert.match(result.body.error, /five valid flashcards/);
  });

  it("reports Gemini rate limits without pretending the request succeeded", async () => {
    const result = await generateStudyHelperReply({
      mode: "chat",
      skill: "Python",
      partnerName: "",
      messages: [{ role: "user", content: "Help us practice." }],
    }, "test-key", async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "Quota exceeded." } }),
    }));

    assert.equal(result.status, 429);
    assert.equal(result.body.error, "Quota exceeded.");
  });
});
