export default function Nav({ onHome, onEnter, onLogin, onLogout, inApp }) {
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
        <div className="nav-actions">
          <button className="btn ghost" onClick={onHome}>Home</button>
          {onLogout && <button className="nav-text-action" onClick={onLogout}>Log out</button>}
        </div>
      ) : (
        <div className="nav-actions">
          <button className="nav-text-action" onClick={onLogin}>Log in</button>
          <button className="btn" onClick={onEnter}>Create account</button>
        </div>
      )}
    </header>
  );
}