import { useMemo, useState } from "react";
import Nav from "../components/Nav";
import MatchCard from "../components/MatchCard";
import users from "../data/users.json";
import { getMatches } from "../lib/match";

const FILTERS = [
  ["all", "All"],
  ["perfect", "Perfect swaps"],
  ["helps-you", "Can help you"],
];

export default function Feed({ profile, onHome }) {
  const [filter, setFilter] = useState("all");

  const matches = useMemo(() => getMatches(profile, users), [profile]);
  const perfect = matches.filter((m) => m.type === "perfect").length;
  const shown = filter === "all" ? matches : matches.filter((m) => m.type === filter);

  const handlePropose = (m) =>
    alert("Propose a swap with " + m.user.name + " (Propose page coming soon)");

  return (
    <div className="container">
      <Nav inApp onHome={onHome} />

      <div className="feed">
        <aside className="side">
          <div className="panel">
            <div className="me-head">
              <div className="me-avatar">{profile.name[0]}</div>
              <div>
                <div className="me-name">{profile.name}</div>
                <div className="me-sub">{profile.major}</div>
              </div>
            </div>

            <div className="me-group">
              <span className="label">You offer</span>
              <div className="chips">
                {profile.offers.length === 0 && <span className="me-sub">Nothing selected</span>}
                {profile.offers.map((s) => <span key={s} className="chip selected">{s}</span>)}
              </div>
            </div>

            <div className="me-group">
              <span className="label">You want</span>
              <div className="chips">
                {profile.wants.length === 0 && <span className="me-sub">Nothing selected</span>}
                {profile.wants.map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
            </div>

            <div className="me-group">
              <span className="label">Availability</span>
              <div className="chips">
                {profile.availability.map((t) => <span key={t} className="chip">{t}</span>)}
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
            <p>Students whose skills line up with yours. Swap what you know for what you want to learn.</p>
          </div>

          <div className="seg">
            {FILTERS.map(([key, name]) => (
              <button key={key} className={filter === key ? "on" : ""} onClick={() => setFilter(key)}>
                {name}
              </button>
            ))}
          </div>

          {shown.length === 0 && <div className="panel empty">No matches here yet. Try different skills.</div>}
          {shown.map((m, i) => (
            <MatchCard key={m.user.id} match={m} index={i} onPropose={handlePropose} />
          ))}
        </section>
      </div>
    </div>
  );
}