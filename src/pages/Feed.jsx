import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import MatchCard from "../components/MatchCard";

const FILTERS = [
  ["all", "All"],
  ["perfect", "Perfect swaps"],
  ["helps-you", "Can help you"],
];

export default function Feed({ profile, onHome, onLogout, onEditProfile, onEditOffers, onEditWants, onOpenChat, onShowChats }) {
  const [filter, setFilter] = useState("all");
  const [matches, setMatches] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [chatError, setChatError] = useState("");
  const perfect = matches.filter((m) => m.type === "perfect").length;
  const shown = filter === "all" ? matches : matches.filter((m) => m.type === filter);

  useEffect(() => {
    let active = true;
    fetch("/api/matches")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load matches.");
        if (active) setMatches(result.matches);
      })
      .catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [profile]);

  const openChat = async (userId) => {
    setChatError("");
    try {
      await onOpenChat(userId);
    } catch (error) {
      setChatError(error.message || "Unable to open chat.");
    }
  };

  return (
    <div className="container">
      <Nav inApp onHome={onHome} onLogout={onLogout} />

      <ol className="skill-progress match-progress" aria-label="Skill matching progress">
        <li className="complete"><span>01</span><b>Profile</b></li>
        <li className="complete"><span>02</span><b>Teach</b></li>
        <li className="complete"><span>03</span><b>Learn</b></li>
        <li className="current"><span>04</span><b>Matches</b></li>
      </ol>

      <div className="feed">
        <aside className="side">
          <div className="panel">
            <div className="me-head">
              <div className="me-avatar">{profile.name[0]}</div>
              <div className="me-details">
                <div className="me-name-row">
                  <div className="me-name">{profile.name}</div>
                  <button className="edit-skill" onClick={onEditProfile}>Edit</button>
                </div>
                <div className="me-sub">@{profile.username}</div>
                <div className="me-sub">{profile.major}</div>
              </div>
            </div>

            <div className="me-group">
              <div className="me-group-head">
                <span className="label">You offer</span>
                <button className="edit-skill" onClick={onEditOffers}>Edit</button>
              </div>
              <div className="chips">
                {profile.offers.length === 0 && <span className="me-sub">Nothing selected</span>}
                {profile.offers.map((s) => <span key={s} className="chip selected">{s}</span>)}
              </div>
            </div>

            <div className="me-group">
              <div className="me-group-head">
                <span className="label">You want</span>
                <button className="edit-skill" onClick={onEditWants}>Edit</button>
              </div>
              <div className="chips">
                {profile.wants.length === 0 && <span className="me-sub">Nothing selected</span>}
                {profile.wants.map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
            </div>

          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-num grad-text">{perfect}</div>
              <div className="stat-label">Perfect swaps</div>
            </div>
            <div className="stat">
              <div className="stat-num grad-text">{matches.length - perfect}</div>
              <div className="stat-label">Can help you</div>
            </div>
          </div>
        </aside>

        <section>
          <div className="feed-head">
            <h1 className="display">
              Your <span className="mark">matches</span>
            </h1>
            <p>Students whose skills line up with yours. Edit either skill list to refresh your matches.</p>
          </div>

          <div className="feed-actions">
            <span className="label">{matches.length} registered matches</span>
            <button className="btn ghost" onClick={onShowChats}>Open chats</button>
          </div>
          {chatError && <div className="panel empty" role="alert">{chatError}</div>}

          <div className="seg">
            {FILTERS.map(([key, name]) => (
              <button key={key} className={filter === key ? "on" : ""} onClick={() => setFilter(key)}>
                {name}
              </button>
            ))}
          </div>

          {loadError && <div className="panel empty" role="alert">{loadError}</div>}
          {!loadError && shown.length === 0 && <div className="panel empty">No registered students match these skills yet.</div>}
          {shown.map((match, index) => (
            <MatchCard key={match.user.id} match={match} index={index} onMessage={() => openChat(match.user.id)} />
          ))}
        </section>
      </div>
    </div>
  );
}