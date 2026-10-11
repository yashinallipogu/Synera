import { useState } from "react";
import Nav from "../components/Nav";
import { SKILLS } from "../data/skills";
import "./SkillSetup.css";

const STEPS = [
  ["profile", "Profile"],
  ["offers", "Teach"],
  ["wants", "Learn"],
  ["matches", "Matches"],
];

const toggleSkill = (selected, skill) =>
  selected.includes(skill)
    ? selected.filter((item) => item !== skill)
    : [...selected, skill];

export default function SkillSetup({
  step,
  profile,
  onProfileChange,
  onBack,
  onHome,
  onLogout,
  onContinue,
}) {
  const [saveError, setSaveError] = useState("");
  const stepIndex = STEPS.findIndex(([id]) => id === step);
  const selected = step === "offers" ? profile.offers
    : profile.wants;
  const selectedField = step === "offers" ? "offers"
    : "wants";
  const isProfileStep = step === "profile";
  const isOfferStep = step === "offers";
  const isWantStep = step === "wants";
  const canContinue = isProfileStep
    ? profile.name.trim() && profile.major.trim()
    : selected.length > 0;

  const updateSelection = (value) => onProfileChange(selectedField, value);
  const toggleSelection = (item) => updateSelection(toggleSkill(selected, item));
  const continueStep = async () => {
    setSaveError("");
    try {
      await onContinue();
    } catch (error) {
      setSaveError(error.message || "Unable to save your details.");
    }
  };
  return (
    <div className="container">
      <Nav inApp onHome={onHome} onLogout={onLogout} />

      <main className="skill-page rise">
        <ol className="skill-progress" aria-label="Skill matching progress">
          {STEPS.map(([id, label], index) => (
            <li key={id} className={index === stepIndex ? "current" : index < stepIndex ? "complete" : ""}>
              <span>0{index + 1}</span><b>{label}</b>
            </li>
          ))}
        </ol>

        <div className="skill-heading">
          <span className="eyebrow">Step 0{stepIndex + 1} of 04</span>
          <h1 className="display">
            {isProfileStep ? "Tell us about "
              : isOfferStep ? "What can you "
              : isWantStep ? "What do you want to "
              : "What do you want to "}
            <span className={isOfferStep ? "grad-text" : "mark"}>
              {isProfileStep ? "yourself"
                : isOfferStep ? "teach?"
                : isWantStep ? "learn?"
                : "learn?"}
            </span>
          </h1>
          <p>
            {isProfileStep ? "First, tell other students what to call you and what you study."
              : isOfferStep ? "Choose the skills you would feel comfortable sharing with another student."
              : isWantStep ? "Pick the skills you would be excited to learn from someone on campus."
                : "Pick the skills you would be excited to learn from someone on campus."}
          </p>
        </div>

              <section className="skill-picker" aria-label={isProfileStep ? "Profile details" : "Available skills"}>
          {isProfileStep ? (
            <div className="signup-fields">
              <label className="signup-field">
                <span className="label">Your name</span>
                <input
                  autoComplete="given-name"
                  value={profile.name}
                  placeholder="What should we call you?"
                  onChange={(event) => onProfileChange("name", event.target.value)}
                />
              </label>
              <label className="signup-field">
                <span className="label">Major or area of study</span>
                <input
                  autoComplete="organization-title"
                  value={profile.major}
                  placeholder="What are you studying?"
                  onChange={(event) => onProfileChange("major", event.target.value)}
                />
              </label>
            </div>
          ) : (
            <>
              <div className="skill-picker-head">
                <span className="label">Available skills</span>
                <span className="skill-count">{selected.length} selected</span>
              </div>
              <div className="skill-options">
                {SKILLS.map((item) => {
                  const active = selected.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`skill-option${active ? " selected" : ""}${isOfferStep ? " teach" : " learn"}`}
                      aria-pressed={active}
                      onClick={() => toggleSelection(item)}
                    >
                      <span className="skill-option-mark" aria-hidden="true">{active ? "✓" : "+"}</span>
                      {item}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="skill-footer">
            {saveError && <p className="auth-error" role="alert">{saveError}</p>}
            <button className="btn ghost" onClick={onBack}>
              ← {stepIndex === 0 ? "Back home" : "Back"}
            </button>
            <button className="btn" onClick={continueStep} disabled={!canContinue}>
              {isProfileStep ? "Continue to skills" : isOfferStep ? "Choose what I want to learn" : "Show my matches"} →
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}