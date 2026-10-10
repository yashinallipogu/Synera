import Nav from "../components/Nav";
import { SKILLS } from "../data/skills";
import users from "../data/users.json";
import "./Landing.css";

const STEPS = [
  { n: "01", t: "Pick your skills", d: "Choose what you can teach and what you want to learn. No essays, no bios." },
  { n: "02", t: "Get matched", d: "Synera pairs you with students whose skills line up with yours, perfect swaps first." },
  { n: "03", t: "Meet and swap", d: "Pick a time and a public campus spot. Both of you leave with something new." },
];

export default function Landing({ onEnter, onLogin }) {
  const scrollToSteps = () =>
    document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth" });

  return (
    <div className="container">
      <Nav onEnter={onEnter} onLogin={onLogin} onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

      {/* Hero */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow rise" style={{ "--d": "0ms" }}>Campus skill exchange</span>
          <h1 className="display hero-title rise" style={{ "--d": "80ms" }}>
            Trade what you <span className="grad-text">know</span> for what you{" "}
            <span className="mark">need</span>
          </h1>
          <p className="hero-sub rise" style={{ "--d": "160ms" }}>
            Synera matches students who can teach each other. Coding for design, Spanish for
            statistics. Every swap builds a reputation that comes from real collaboration, not likes.
          </p>
          <div className="hero-cta rise" style={{ "--d": "240ms" }}>
            <button className="btn lg" onClick={onEnter}>Create an account</button>
            <button className="btn lg ghost" onClick={scrollToSteps}>How it works</button>
          </div>
          <div className="hero-stats rise" style={{ "--d": "320ms" }}>
            <div><b className="grad-text">{users.length}</b><span>students</span></div>
            <div><b className="grad-text">{SKILLS.length}</b><span>skills</span></div>
            <div><b className="grad-text">0</b><span>likes needed</span></div>
          </div>
        </div>

        <div className="matcher journey rise" style={{ "--d": "200ms" }}>
          <div className="matcher-inner">
            <div className="matcher-top">
              <span className="label">Your next steps</span>
              <span className="live"><i /> Takes less than a minute</span>
            </div>
            <ol className="journey-steps">
              <li><span>01</span><div><b>What can you teach?</b><small>Pick skills you feel confident sharing.</small></div></li>
              <li><span>02</span><div><b>What do you want to learn?</b><small>Choose what would help you grow.</small></div></li>
              <li><span>03</span><div><b>Meet your matches</b><small>Find students for a skill swap.</small></div></li>
            </ol>
            <button className="btn lg full" onClick={onEnter}>Create an account →</button>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee">
        <div className="marquee-track">
          {[...SKILLS, ...SKILLS].map((s, i) => (
            <span key={i} className="marquee-item">{s}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="section" id="how-it-works">
        <h2 className="display section-title">
          Three steps from <span className="grad-text">stranger</span> to collaborator
        </h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="panel step" key={s.n}>
              <span className="step-n grad-text display">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <h2 className="display section-title">
          One platform, <span className="mark">every</span> kind of session
        </h2>
        <div className="cats">
          <div className="panel cat live-cat">
            <span className="badge perfect">Live now</span>
            <h3>SkillSwap</h3>
            <p>Trade skills one-to-one. Perfect swaps ranked first, with reputation built from completed sessions.</p>
            <button className="btn" onClick={() => onEnter()}>Open SkillSwap →</button>
          </div>
          <div className="panel cat dim">
            <span className="badge helps">Coming soon</span>
            <h3>StudyBuddy</h3>
            <p>Find students studying the same course, at the same time, in the same place.</p>
          </div>
          <div className="panel cat dim">
            <span className="badge helps">Coming soon</span>
            <h3>Hobbies</h3>
            <p>Language practice, climbing, chess, music jams. Shared interests, recurring meetups.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta">
        <h2 className="display">Everyone is good at something.<br />Go find who needs it.</h2>
        <button className="btn lg ghost" onClick={() => onEnter()}>Open Synera →</button>
      </section>

      <footer className="foot">Synera · Built at the hackathon</footer>
    </div>
  );
}