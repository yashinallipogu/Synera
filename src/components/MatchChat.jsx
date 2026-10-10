import { useState } from "react";

const storageKey = (userId) => `synera-chat-${userId}`;

function readMessages(userId) {
  try {
    const messages = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

export default function MatchChat({ user }) {
  const [messages, setMessages] = useState(() => readMessages(user.id));
  const [draft, setDraft] = useState("");

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const next = [...messages, { id: `${Date.now()}-${Math.random()}`, text, sentAt: new Date().toISOString() }];
    setMessages(next);
    localStorage.setItem(storageKey(user.id), JSON.stringify(next));
    setDraft("");
  };

  return (
    <section className="match-chat" aria-label={`Chat with ${user.name}`}>
      <div className="chat-head">
        <div>
          <h4>Chat with {user.name}</h4>
          <p>Messages are saved in this browser for the prototype.</p>
        </div>
        <span className="chat-demo-tag">LOCAL DEMO</span>
      </div>
      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">Start with a hello or suggest a study spot.</p>
        ) : messages.map((message) => (
          <div className="chat-message" key={message.id}>
            <span>{message.text}</span>
            <time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
          </div>
        ))}
      </div>
      <form className="chat-compose" onSubmit={sendMessage}>
        <label className="visually-hidden" htmlFor={`chat-${user.id}`}>Message {user.name}</label>
        <input id={`chat-${user.id}`} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" maxLength={500} />
        <button className="btn" type="submit" disabled={!draft.trim()}>Send</button>
      </form>
      <p className="chat-notice">Messages are not delivered to another person until the app has a connected messaging service.</p>
    </section>
  );
}
