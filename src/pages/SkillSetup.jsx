import { useState } from "react";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import Nav from "../components/Nav";
import { SKILLS } from "../data/skills";
import "./SkillSetup.css";

const STEPS = [
  ["profile", "Profile"],
  ["offers", "Teach"],
  ["wants", "Learn"],
  ["matches", "Matches"],
];
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const PHONE_COUNTRIES = getCountries()
  .map((code) => ({ code, name: regionNames.of(code), callingCode: getCountryCallingCode(code) }))
  .sort((left, right) => left.name.localeCompare(right.name));

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
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState(() =>
    parsePhoneNumberFromString(profile.phone || "")?.country || "US"
  );
  const [phoneDisplay, setPhoneDisplay] = useState(() => {
    const parsed = parsePhoneNumberFromString(profile.phone || "");
    return parsed ? parsed.formatNational() : profile.phone || "";
  });
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
  const updatePhone = (value, country = phoneCountry) => {
    const formatter = new AsYouType(country);
    const formatted = formatter.input(value);
    const parsed = formatter.getNumber();
    const normalized = parsed?.isValid() ? parsed.number : "";
    setPhoneDisplay(formatted);
    if (normalized !== profile.phone) {
      onProfileChange("phone", normalized);
      onProfileChange("phoneVerified", false);
      onProfileChange("textOptIn", false);
      setPhoneCodeSent(false);
      setPhoneStatus("");
      setPhoneError("");
    }
  };
  const changePhoneCountry = (country) => {
    setPhoneCountry(country);
    updatePhone(phoneDisplay.replace(/[^\d+]/g, ""), country);
  };
  const continueStep = async () => {
    setSaveError("");
    try {
      await onContinue();
    } catch (error) {
      setSaveError(error.message || "Unable to save your details.");
    }
  };
  const sendPhoneCode = async () => {
    setPhoneBusy(true);
    setPhoneStatus("");
    setPhoneError("");
    try {
      const response = await fetch("/api/phone-verification/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: profile.phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send a code.");
      setPhoneCodeSent(true);
      setPhoneStatus("Code sent. Check your iMessages.");
    } catch (error) {
      setPhoneError(error.message);
    } finally {
      setPhoneBusy(false);
    }
  };
  const verifyPhoneCode = async () => {
    setPhoneBusy(true);
    setPhoneError("");
    try {
      const response = await fetch("/api/phone-verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: phoneCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not verify this number.");
      onProfileChange("phoneVerified", true);
      setPhoneStatus("Phone number verified.");
      setPhoneCodeSent(false);
      setPhoneCode("");
    } catch (error) {
      setPhoneError(error.message);
    } finally {
      setPhoneBusy(false);
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
              <label className="signup-field">
                <span className="label">Phone number for text alerts (optional)</span>
                <div className="phone-number-control">
                  <select aria-label="Phone country" value={phoneCountry} onChange={(event) => changePhoneCountry(event.target.value)}>
                    {PHONE_COUNTRIES.map(({ code, name, callingCode }) => (
                      <option key={code} value={code}>{name} (+{callingCode})</option>
                    ))}
                  </select>
                  <input
                    aria-label="Phone number"
                    autoComplete="tel-national"
                    inputMode="tel"
                    type="tel"
                    maxLength={25}
                    value={phoneDisplay}
                    placeholder={phoneCountry === "US" ? "(415) 555-0123" : "Enter phone number"}
                    onChange={(event) => updatePhone(event.target.value)}
                  />
                </div>
                <small>Choose your country; your number is formatted as you type and kept private.</small>
                {phoneDisplay && !profile.phone && <small className="phone-invalid">Enter a complete valid phone number for this country.</small>}
              </label>
              {profile.phone && !profile.phoneVerified && (
                <div className="phone-verify-row">
                  <button className="btn ghost" type="button" disabled={phoneBusy || !/^\+[1-9]\d{7,14}$/.test(profile.phone)} onClick={sendPhoneCode}>
                    {phoneBusy ? "Please wait..." : phoneCodeSent ? "Resend code" : "Send verification code"}
                  </button>
                  {phoneCodeSent && (
                    <div className="phone-code-input">
                      <label className="label" htmlFor="phone-code">Six-digit code</label>
                      <div>
                        <input id="phone-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                          value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ""))} />
                        <button className="btn" type="button" disabled={phoneBusy || phoneCode.length !== 6} onClick={verifyPhoneCode}>Verify</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {profile.phone && profile.phoneVerified && <p className="phone-status" role="status">Phone number verified.</p>}
              {phoneStatus && <p className="phone-status" role="status">{phoneStatus}</p>}
              {phoneError && <p className="auth-error" role="alert">{phoneError}</p>}
              <label className="text-consent">
                <input
                  type="checkbox"
                  checked={Boolean(profile.textOptIn)}
                  disabled={!profile.phone || !profile.phoneVerified}
                  onChange={(event) => onProfileChange("textOptIn", event.target.checked)}
                />
                <span>Send me iMessage alerts for matches, chat messages, and accepted meetup reminders.</span>
              </label>
              {profile.textOptIn && <p className="text-consent-note">Only opted-in users receive alerts. Your number must also be added to Synera's Photon Users list.</p>}
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