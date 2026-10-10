import { useState } from "react";

export default function SkillGroup({ label, skills, selected, tone, onToggle, onAddSkill }) {
  const [draft, setDraft] = useState("");
  const inputId = `skill-${label.toLowerCase().replace(/\s+/g, "-")}`;

  const addSkill = (event) => {
    event.preventDefault();
    const value = draft.trim().replace(/\s+/g, " ");
    if (!value) return;

    const existing = skills.find((skill) => skill.toLowerCase() === value.toLowerCase());
    const skill = existing || value;
    if (!existing) onAddSkill(skill);
    if (!selected.includes(skill)) onToggle(skill);
    setDraft("");
  };

  return (
    <div className="skill-editor">
      <span className="pick-title">{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {skills.map((skill) => (
          <button
            key={skill}
            type="button"
            className={`pick ${tone}${selected.includes(skill) ? " on" : ""}`}
            aria-pressed={selected.includes(skill)}
            onClick={() => onToggle(skill)}
          >
            {skill}
          </button>
        ))}
      </div>
      <form className="skill-add" onSubmit={addSkill}>
        <label className="visually-hidden" htmlFor={inputId}>{`Add ${label.toLowerCase()}`}</label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a skill"
          maxLength={40}
        />
        <button className="btn" type="submit" disabled={!draft.trim()}>Add</button>
      </form>
    </div>
  );
}