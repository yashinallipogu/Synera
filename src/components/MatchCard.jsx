import "./MatchCard.css";

export default function MatchCard({ match, onMessage, onPropose, index = 0 }) {
  const { user, type, theyTeachMe, iTeachThem } = match;
  const perfect = type === "perfect";
  const hue = 170 + ((user.name.charCodeAt(0) * 7) % 50);

  return (
    <article className="glass match-card" style={{ "--i": index }}>
      <div className="match-top">
        <div className="avatar" style={{ "--hue": hue }}>{user.name[0]}</div>
        <div className="match-info">
          <h3 className="match-name">{user.name}</h3>
          <p className="match-sub">{user.major} · {user.swaps} completed swaps</p>
        </div>
        <span className={`badge ${perfect ? "perfect" : "helps"}`}>
          {perfect ? "Perfect swap" : "Can help you"}
        </span>
      </div>

      <div className="match-rows">
        <div className="match-row">
          <span className="row-label">Teaches you</span>
          <div className="row-chips">
            {theyTeachMe.map((s) => <span key={s} className="chip selected">{s}</span>)}
          </div>
        </div>
        {iTeachThem.length > 0 && (
          <div className="match-row">
            <span className="row-label">You teach</span>
            <div className="row-chips">
              {iTeachThem.map((s) => <span key={s} className="chip">{s}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="match-footer">
        <div className="match-actions">
          <button className="btn ghost" type="button" onClick={onMessage}>
            Chat with {user.name}
          </button>
          <button className="btn" type="button" onClick={() => onPropose(match)}>Find a meetup spot</button>
        </div>
      </div>
    </article>
  );
}