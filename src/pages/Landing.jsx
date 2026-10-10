import { useMemo, useState } from "react";
import Nav from "../components/Nav";
import SkillGroup from "../components/SkillGroup";
import { SKILLS } from "../data/skills";
import users from "../data/users.json";
import { getMatches } from "../lib/match";
import "./Landing.css";

const STEPS = [
  { n: "01", t: "Pick your skills", d: "Choose what you can teach and what you want to learn. No essays, no bios." },
  { n: "02", t: "Get matched", d: "Synera pairs you with students whose skills line up with yours, perfect swaps first." },
  { n: "03", t: "Meet and swap", d: "Pick a time and a public campus spot. Both of you leave with something new." },
];

const toggle = (list, skill) => list.includes(skill) ? list.filter((item) => item !== skill) : [...list, skill];

export default function Landing({ onEnter, onLogin }) {
  const [offers, setOffers] = useState(["Python"]);
  const [wants, setWants] = useState(["Figma"]);
  const [customSkills, setCustomSkills] = useState([]);
  const skills = [...SKILLS, ...customSkills];
  const enterWithSkills = () => onEnter({ offers, wants, customSkills });
  const addSkill = (skill) => setCustomSkills((current) => [...current, skill]);

  const matches = useMemo(
    () => getMatches({ id: "preview", offers, wants }, users),
    [offers, wants]
  );
  const perfect = matches.filter((match) => match.type === "perfect").length;

  const scrollToMatcher = () =>
    document.getElementById("matcher").scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="container">
      <Nav onEnter={onEnter} onLogin={onLogin} onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

      {/* Hero */}
      <section className="hero">
        <div className="hero-copy">
          <div className="window-titlebar" aria-hidden="true">
            <span>dialog Window</span>
            <span className="window-close">×</span>
          </div>
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
            <button className="btn lg ghost" onClick={enterWithSkills}>Browse matches</button>
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
            <SkillGroup
              label="I can teach"
              skills={skills}
              selected={offers}
              tone="offer"
              onToggle={(skill) => setOffers(toggle(offers, skill))}
              onAddSkill={addSkill}
            />

            <SkillGroup
              label="I want to learn"
              skills={skills}
              selected={wants}
              tone="want"
              onToggle={(skill) => setWants(toggle(wants, skill))}
              onAddSkill={addSkill}
            />

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
              onClick={enterWithSkills}>
              See all {matches.length} matches {perfect > 0 ? "(" + perfect + " perfect)" : ""} →
            </button>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee">
        <div className="marquee-track">
          {[...skills, ...skills].map((s, i) => (
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
            <button className="btn" onClick={enterWithSkills}>Open SkillSwap →</button>
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
        <button className="btn lg ghost" onClick={enterWithSkills}>Open Synera →</button>
      </section>

      <footer className="foot">Synera · Built at the hackathon</footer>
    </div>
  );
}