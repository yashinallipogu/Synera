import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { readApiJson } from "../lib/api";
import "./Chat.css";

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const result = await readApiJson(response);
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}

function localDateTime(value) {
  const date = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

export default function Chat({ profile, initialChatId, onHome, onLogout, onOpenChat }) {
  const [chats, setChats] = useState([]);
  const [selectedId, setSelectedId] = useState(initialChatId);
  const [conversationData, setConversationData] = useState(null);
  const conversation = conversationData?.chat.id === selectedId ? conversationData : null;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showMeetupForm, setShowMeetupForm] = useState(false);
  const [meetupStartsAt, setMeetupStartsAt] = useState(() => localDateTime(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [minimumMeetupAt] = useState(() => localDateTime(new Date(Date.now() + 15 * 60 * 1000)));
  const [meetupLocation, setMeetupLocation] = useState("");

  useEffect(() => {
    let active = true;
    const loadChats = async () => {
      try {
        const result = await requestJson("/api/chats");
        if (active) setChats(result.chats);
      } catch (loadError) {
        if (active) setError(loadError.message);
      }
    };
    loadChats();
    const timer = setInterval(loadChats, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return undefined;
    }
    let active = true;
    const loadConversation = async () => {
      try {
        const result = await requestJson(`/api/chats/${selectedId}`);
        if (active) {
          setConversationData(result);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      }
    };
    loadConversation();
    const timer = setInterval(loadConversation, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedId]);

  const selectChat = (chatId) => {
    setSelectedId(chatId);
    onOpenChat(chatId);
    setError("");
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || busy) return;
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/chats/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setDraft("");
      const result = await requestJson(`/api/chats/${selectedId}`);
      setConversationData(result);
      const list = await requestJson("/api/chats");
      setChats(list.chats);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setBusy(false);
    }
  };

  const createMeetup = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/chats/${selectedId}/meetups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: new Date(meetupStartsAt).toISOString(), location: meetupLocation }),
      });
      setShowMeetupForm(false);
      setMeetupLocation("");
      const result = await requestJson(`/api/chats/${selectedId}`);
      setConversationData(result);
    } catch (meetupError) {
      setError(meetupError.message);
    } finally {
      setBusy(false);
    }
  };

  const respondToMeetup = async (meetupId, action) => {
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/meetups/${meetupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await requestJson(`/api/chats/${selectedId}`);
      setConversationData(result);
    } catch (responseError) {
      setError(responseError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <Nav inApp onHome={onHome} onLogout={onLogout} />
      <main className="chat-page rise">
        <header className="chat-page-head">
          <div>
            <span className="eyebrow">SkillSwap</span>
            <h1 className="display">Your <span className="grad-text">chats</span></h1>
          </div>
          <span className="chat-account">Signed in as @{profile.username}</span>
        </header>

        <div className="chat-layout">
          <aside className="chat-list" aria-label="Conversations">
            <div className="chat-list-head"><span className="label">Conversations</span><span>{chats.length}</span></div>
            {chats.length === 0 && <p className="chat-empty-list">Start a conversation from one of your matches.</p>}
            {chats.map((chat) => (
              <button key={chat.id} className={`chat-list-item${selectedId === chat.id ? " active" : ""}`} onClick={() => selectChat(chat.id)}>
                <span className="chat-avatar">{chat.user.name[0]}</span>
                <span className="chat-list-copy">
                  <b>{chat.user.name}</b>
                  <small>{chat.lastMessage}</small>
                </span>
              </button>
            ))}
          </aside>

          <section className="chat-thread" aria-label="Chat thread">
            {conversation ? (
              <>
                <header className="thread-head">
                  <div className="chat-avatar">{conversation.chat.user.name[0]}</div>
                  <div><h2>{conversation.chat.user.name}</h2><p>{conversation.chat.user.major}</p></div>
                  <button className="btn ghost" onClick={() => setShowMeetupForm((visible) => !visible)}>
                    {showMeetupForm ? "Close plan" : "Plan meetup"}
                  </button>
                </header>

                {showMeetupForm && (
                  <form className="meetup-form" onSubmit={createMeetup}>
                    <label className="signup-field">
                      <span className="label">Date and time</span>
                      <input type="datetime-local" required min={minimumMeetupAt}
                        value={meetupStartsAt} onChange={(event) => setMeetupStartsAt(event.target.value)} />
                    </label>
                    <label className="signup-field">
                      <span className="label">Meetup place</span>
                      <input required maxLength={200} value={meetupLocation} placeholder="Library, student union..."
                        onChange={(event) => setMeetupLocation(event.target.value)} />
                    </label>
                    <button className="btn" disabled={busy}>Send meetup proposal</button>
                  </form>
                )}

                <div className="thread-content" aria-live="polite">
                  {conversation.meetups.slice().reverse().map((meetup) => (
                    <article className={`meetup-message ${meetup.status}`} key={`meetup-${meetup.id}`}>
                      <div className="meetup-title">Meetup proposal · {meetup.status}</div>
                      <time>{new Date(meetup.startsAt).toLocaleString()}</time>
                      <p>{meetup.location}</p>
                      {meetup.status === "pending" && meetup.proposedBy !== profile.id && (
                        <div className="meetup-actions">
                          <button className="btn" disabled={busy} onClick={() => respondToMeetup(meetup.id, "accepted")}>Accept</button>
                          <button className="btn ghost" disabled={busy} onClick={() => respondToMeetup(meetup.id, "declined")}>Decline</button>
                        </div>
                      )}
                      {meetup.status === "pending" && meetup.proposedBy === profile.id && <small>Waiting for their response</small>}
                    </article>
                  ))}
                  {conversation.messages.map((message) => (
                    <article className={`chat-bubble${message.senderId === profile.id ? " own" : ""}`} key={message.id}>
                      <p>{message.body}</p>
                      <time>{new Date(message.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</time>
                    </article>
                  ))}
                  {!conversation.messages.length && !conversation.meetups.length && <p className="thread-empty">Say hello and start planning your skill swap.</p>}
                </div>

                <form className="message-form" onSubmit={sendMessage}>
                  <textarea aria-label="Message" maxLength={2000} rows={2} value={draft}
                    placeholder={`Message ${conversation.chat.user.name}...`} onChange={(event) => setDraft(event.target.value)} />
                  <button className="btn" disabled={busy || !draft.trim()}>Send</button>
                </form>
              </>
            ) : (
              <div className="thread-placeholder">
                <span className="chat-placeholder-mark">S</span>
                <h2 className="display">Meet in the conversation.</h2>
                <p>Choose a chat or open a match to message them and arrange a meetup.</p>
              </div>
            )}
            {error && <p className="chat-error" role="alert">{error}</p>}
          </section>
        </div>
      </main>
    </div>
  );
}