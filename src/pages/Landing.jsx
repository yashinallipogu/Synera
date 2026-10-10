import { useMemo, useState } from "react";
import Nav from "../components/Nav";
import { SKILLS } from "../data/skills";
import users from "../data/users.json";
import { getMatches } from "../lib/match";
import "./Landing.css";

const AVAIL = ["Tue pm", "Thu pm"];
const toggle = (list, s) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);

const STEPS = [
  { n: "01", t: "Pick your skills", d: "Choose what you can teach and what you want to learn. No essays, no bios." },
  { n: "02", t: "Get matched", d: "Synera pairs you with students whose skills line up with yours, perfect swaps first." },
  { n: "03", t: "Meet and swap", d: "Pick a time and a public campus spot. Both of you leave with something new." },
];

export default function Landing({ onEnter }) {
  const [offers, setOffers] = useState(["Python"]);
  const [wants, setWants] = useState(["Figma"]);

  const matches = useMemo(
    () => getMatches({ id: "me", offers, wants, availability: AVAIL }, users),
    [offers, wants]
  );
  const perfect = matches.filter((m) => m.type === "perfect").length;

  const scrollToMatcher = () =>
    document.getElementById("matcher").scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="container">
      <Nav onEnter={onEnter} onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

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
            <button className="btn lg" onClick={scrollToMatcher}>Try the matcher</button>
            <button className="btn lg ghost" onClick={() => onEnter()}>Browse matches</button>
          </div>
          <div className="hero-stats rise" style={{ "--d": "320ms" }}>
            <div><b className="grad-text">{users.length}</b><span>students</span></div>
            <div><b className="grad-text">{SKILLS.length}</b><span>skills</span></div>
            <div><b className="grad-text">0</b><span>likes needed</span></div>
          </div>
        </div>

        {/* Live matcher */}
        <div className="matcher rise" id="matcher" style={{ "--d": "200ms" }}>
          <div className="matcher-inner">
            <div className="matcher-top">
              <span className="label">Live matcher</span>
              <span className="live"><i /> {matches.length} matches</span>
            </div>

            <div className="pick-group">
              <p className="pick-title">I can teach</p>
              <div className="chips">
                {SKILLS.map((s) => (
                  <button key={s} className={"pick offer" + (offers.includes(s) ? " on" : "")}
                    onClick={() => setOffers(toggle(offers, s))}>{s}</button>
                ))}
              </div>
            </div>

            <div className="pick-group">
              <p className="pick-title">I want to learn</p>
              <div className="chips">
                {SKILLS.map((s) => (
                  <button key={s} className={"pick want" + (wants.includes(s) ? " on" : "")}
                    onClick={() => setWants(toggle(wants, s))}>{s}</button>
                ))}
              </div>
            </div>

            <div className="results">
              {matches.length === 0 && (
                <p className="results-empty">Pick a few skills to see who you could swap with.</p>
              )}
              {matches.slice(0, 3).map((m) => (
                <div className="mini" key={m.user.id}>
                  <div className="mini-av">{m.user.name[0]}</div>
                  <div className="mini-info">
                    <b>{m.user.name}</b>
                    <span>Teaches {m.theyTeachMe.join(", ")}</span>
                  </div>
                  <span className={"badge " + (m.type === "perfect" ? "perfect" : "helps")}>
                    {m.type === "perfect" ? "Perfect swap" : "Can help"}
                  </span>
                </div>
              ))}
            </div>

            <button className="btn lg full" disabled={matches.length === 0}
              onClick={() => onEnter({ offers, wants })}>
              See all {matches.length} matches {perfect > 0 ? "(" + perfect + " perfect)" : ""} →
            </button>
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
      <section className="section">
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