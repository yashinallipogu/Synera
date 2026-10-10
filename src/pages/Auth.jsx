import { useState } from "react";
import Nav from "../components/Nav";
import { readApiJson } from "../lib/api";
import "./Auth.css";

export default function Auth({ mode, onModeChange, onHome, onSuccess }) {
  const isRegister = mode === "register";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      await onSuccess(result.user);
    } catch (submitError) {
      setError(submitError.message || "The server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <Nav inApp onHome={onHome} />
      <main className="auth-layout rise">
        <section className="auth-intro">
          <span className="eyebrow">Campus skill exchange</span>
          <h1 className="display">Good skills find <span className="mark">each other.</span></h1>
          <p>Make an account to build your profile, find a skill-swap partner, and come back to your matches.</p>
        </section>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-switch" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? "active" : ""}
              onClick={() => { onModeChange("register"); setError(""); }}>
              Create account
            </button>
            <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? "active" : ""}
              onClick={() => { onModeChange("login"); setError(""); }}>
              Log in
            </button>
          </div>

          <h2 id="auth-title" className="display">{isRegister ? "Create your account" : "Welcome back"}</h2>
          <p className="auth-subtitle">{isRegister ? "Choose a username and password to get started." : "Log in to continue to your profile and matches."}</p>

          <form className="auth-form" onSubmit={submit}>
            <label className="signup-field">
              <span className="label">Username</span>
              <input
                autoComplete="username"
                autoCapitalize="none"
                maxLength={24}
                minLength={3}
                required
                value={username}
                placeholder="e.g. alex.rivera"
                onChange={(event) => setUsername(event.target.value)}
              />
              {isRegister && <small>3-24 letters, numbers, dots, dashes, or underscores.</small>}
            </label>

            <label className="signup-field">
              <span className="label">Password</span>
              <div className="password-input">
                <input
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  maxLength={128}
                  minLength={isRegister ? 10 : 1}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder={isRegister ? "At least 10 characters" : "Enter your password"}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((shown) => !shown)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {isRegister && <small>Use at least 10 characters.</small>}
            </label>

            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="btn auth-submit" disabled={busy} type="submit">
              {busy ? "Please wait..." : isRegister ? "Create account" : "Log in"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}