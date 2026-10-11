import { useEffect, useRef, useState } from "react";
import "./StudyHelper.css";

const ACTIVITIES = [
  { id: "flashcards", label: "Flashcards", prompt: (skill) => `Make 5 quick flashcards about ${skill}. Label each question and answer so my match and I can quiz each other.` },
  { id: "icebreakers", label: "Icebreakers", prompt: (skill) => `Give us 6 friendly, low-pressure icebreakers for two students meeting to swap ${skill} skills.` },
  { id: "mini-lesson", label: "Mini lesson", prompt: (skill) => `Plan a fun 15-minute mini lesson where my match teaches me ${skill}, with one hands-on practice challenge.` },
  { id: "brainstorm", label: "Activity ideas", prompt: (skill) => `Suggest 3 creative ways for two students to practice ${skill} together.` },
];

export default function StudyHelper({ skills, partners }) {
  const [mode, setMode] = useState("flashcards");
  const [skill, setSkill] = useState(skills[0] || "");
  const [partnerId, setPartnerId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const conversationRef = useRef(null);
  const partner = partners.find((match) => match.id === partnerId);

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (prompt = draft, selectedMode = mode, startNewConversation = false) => {
    const text = prompt.trim();
    if (!text || loading || !skill) return;

    const history = startNewConversation ? [] : messages.slice(-11);
    while (history[0] && history[0].role !== "user") history.shift();
    const nextMessages = [...history, { role: "user", content: text }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/study-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          skill,
          partnerName: partner?.name || "",
          messages: nextMessages,
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("The study helper returned an unreadable response. Please try again.");
      }

      if (!response.ok) {
        throw new Error(result.error || "The study helper couldn't answer. Please try again.");
      }
      if (typeof result.reply !== "string" || !result.reply.trim()) {
        throw new Error("The study helper returned an empty answer. Please try again.");
      }

      setMessages((current) => [...current, { role: "assistant", content: result.reply }].slice(-12));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The study helper couldn't answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <section className="study-helper" aria-labelledby="study-helper-title">
      <div className="study-helper-heading">
        <div>
          <span className="label">Your AI study partner</span>
          <h2 className="display" id="study-helper-title">Make your next swap more fun</h2>
          <p>Build a quiz, break the ice, or brainstorm a mini lesson together.</p>
        </div>
        <span className="study-helper-badge">GEMINI POWERED</span>
      </div>

      <div className="study-helper-controls">
        <label>
          <span>Activity</span>
          <select
            value={mode}
            disabled={loading}
            onChange={(event) => {
              setMode(event.target.value);
              setMessages([]);
              setError("");
            }}
          >
            {ACTIVITIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            <option value="chat">Ask anything</option>
          </select>
        </label>
        <label>
          <span>Skill</span>
          <select
            value={skill}
            disabled={loading}
            onChange={(event) => {
              setSkill(event.target.value);
              setMessages([]);
              setError("");
            }}
          >
            {skills.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Practice with</span>
          <select
            value={partnerId}
            disabled={loading}
            onChange={(event) => {
              setPartnerId(event.target.value);
              setMessages([]);
              setError("");
            }}
          >
            <option value="">Any match</option>
            {partners.map((match) => <option key={match.id} value={match.id}>{match.name}</option>)}
          </select>
        </label>
      </div>

      <div className="study-helper-shortcuts" aria-label="Start an activity">
        {ACTIVITIES.slice(0, 3).map((item) => (
          <button
            className={mode === item.id ? "selected" : ""}
            key={item.id}
            type="button"
            onClick={() => {
              const startNewConversation = mode !== item.id;
              setMode(item.id);
              if (startNewConversation) {
                setMessages([]);
                setError("");
              }
              sendMessage(item.prompt(skill), item.id, startNewConversation);
            }}
            disabled={loading}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="study-helper-conversation" ref={conversationRef} aria-live="polite" aria-label="Study helper conversation">
        {messages.length === 0 && (
          <div className="study-helper-welcome">
            <span className="study-helper-sparkle" aria-hidden="true">✦</span>
            <div>
              <strong>What should we make?</strong>
              <p>Pick an activity above or ask me for something tailored to your skill swap.</p>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <article className={`study-helper-message ${message.role}`} key={`${index}-${message.role}`}>
            <span>{message.role === "user" ? "You" : "Synera AI"}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {loading && (
          <div className="study-helper-thinking" role="status">
            <span className="study-helper-spinner" aria-hidden="true" />
            Making something useful…
          </div>
        )}
      </div>

      {error && <p className="study-helper-error" role="alert">{error}</p>}

      <form className="study-helper-compose" onSubmit={submitMessage}>
        <label className="visually-hidden" htmlFor="study-helper-prompt">Ask the study helper</label>
        <input
          id="study-helper-prompt"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          placeholder={`Ask about ${skill || "your next skill swap"}…`}
          disabled={loading}
        />
        <button className="btn" type="submit" disabled={loading || !draft.trim() || !skill}>
          {loading ? "Thinking…" : "Send"}
        </button>
      </form>
      <p className="study-helper-note">AI can make mistakes—check facts before using study materials.</p>
    </section>
  );
}
