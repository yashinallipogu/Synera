const MODES = new Set(["flashcards", "icebreakers", "mini-lesson", "brainstorm", "chat"]);
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;

const MODE_INSTRUCTIONS = {
  flashcards: "Create a small set of accurate, concise question-and-answer flashcards that two students can quiz each other with. Number the cards and clearly label each question and answer.",
  icebreakers: "Suggest friendly, low-pressure icebreakers for two students meeting to learn together. Avoid intrusive or overly personal questions.",
  "mini-lesson": "Create a practical, engaging mini-lesson the students can teach each other. Include a short activity and a clear time estimate.",
  brainstorm: "Suggest several creative, practical ways two students can practice and teach this skill together.",
  chat: "Help the students learn, plan a skill swap, or come up with a useful activity. Keep answers clear and collaborative.",
};

function invalidRequest(message) {
  return { status: 400, body: { error: message } };
}

export async function generateStudyHelperReply(body, apiKey, fetchImpl = fetch) {
  if (!apiKey) {
    return {
      status: 503,
      body: { error: "The study helper is not configured yet. Add GEMINI_API_KEY to the project-root .env file and restart the server." },
    };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalidRequest("Send a valid chat request.");
  }

  const { mode, skill, partnerName, messages } = body;
  if (!MODES.has(mode)) return invalidRequest("Choose a supported activity.");
  if (typeof skill !== "string" || !skill.trim() || skill.length > 80) {
    return invalidRequest("Choose a skill up to 80 characters long.");
  }
  if (typeof partnerName !== "string" || partnerName.length > 80) {
    return invalidRequest("Choose a match with a valid name.");
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return invalidRequest(`Include between 1 and ${MAX_MESSAGES} recent messages.`);
  }

  const contents = [];
  for (const message of messages) {
    if (
      !message
      || !["user", "assistant"].includes(message.role)
      || typeof message.content !== "string"
      || !message.content.trim()
      || message.content.length > MAX_MESSAGE_LENGTH
    ) {
      return invalidRequest(`Each message must have a role and be no longer than ${MAX_MESSAGE_LENGTH} characters.`);
    }
    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content.trim() }],
    });
  }

  if (messages[messages.length - 1].role !== "user") {
    return invalidRequest("The latest message must be from you.");
  }

  const partnerContext = partnerName ? ` The selected match is ${partnerName}.` : "";
  const requestBody = {
    systemInstruction: {
      parts: [{
        text: `You are Synera's friendly study-swap assistant. Help college students learn from each other. The selected skill is ${skill.trim()}.${partnerContext} ${MODE_INSTRUCTIONS[mode]} Keep suggestions inclusive, practical, and concise. Do not request private or sensitive personal information.`,
      }],
    },
    contents,
    generationConfig: {
      maxOutputTokens: 900,
      temperature: 0.7,
    },
  };

  let response;
  try {
    response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch {
    return {
      status: 502,
      body: { error: "Could not reach Gemini. Check your internet connection and try again." },
    };
  }

  let result;
  try {
    result = await response.json();
  } catch {
    return { status: 502, body: { error: "Gemini returned an unreadable response. Please try again." } };
  }

  if (!response.ok) {
    return {
      status: response.status === 429 ? 429 : 502,
      body: { error: result?.error?.message || "Gemini could not complete that request. Please try again." },
    };
  }

  const reply = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text) => typeof text === "string")
    .join("\n")
    .trim();

  if (!reply) {
    return {
      status: 502,
      body: { error: "Gemini did not return a study suggestion. Try rephrasing your request." },
    };
  }

  return { status: 200, body: { reply } };
}
