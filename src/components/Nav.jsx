export default function Nav({ onHome, onEnter, inApp }) {
  return (
    <header className="nav">
      <button className="brand" onClick={onHome}>
        <span className="brand-mark">S</span>
        <span className="brand-name">Synera</span>
      </button>

      <nav className="tabs">
        <button className="tab active">SkillSwap</button>
        <button className="tab" disabled>StudyBuddy <span className="soon">soon</span></button>
        <button className="tab" disabled>Hobbies <span className="soon">soon</span></button>
      </nav>

      {inApp ? (
        <button className="btn ghost" onClick={onHome}>Home</button>
      ) : (
        <button className="btn" onClick={() => onEnter()}>Open app</button>
      )}
    </header>
  );
}