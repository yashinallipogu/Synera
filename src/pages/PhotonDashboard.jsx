import { useEffect, useState } from "react";
import "./PhotonDashboard.css";

const PROJECT_ID = "d7759192-c9ff-40a4-90a2-95009d22e4be";
const NAVIGATION = [
  { title: "BUILD", links: [["Get started", "01"], ["Users", "02"], ["Configure", "03"], ["Platforms", "04"]] },
  { title: "OBSERVE", links: [["Webhooks", "05"], ["Call Registry", "06"]] },
  { title: "MANAGE", links: [["Billing", "07"], ["Settings", "08"]] },
];
const PLATFORMS = [
  { id: "imessage", name: "iMessage", description: "Managed iMessage lines, ready to message.", glyph: "i" },
  { id: "whatsapp", name: "WhatsApp", description: "The official WhatsApp Business Cloud API.", glyph: "w" },
  { id: "telegram", name: "Telegram", description: "Telegram Bot API with inbound webhooks.", glyph: "t" },
];
const PACKAGE_MANAGERS = ["bun", "pnpm", "npm", "yarn"];
const COMMANDS = {
  bun: "bun create spectrum-project@latest synera -- --projectId " + PROJECT_ID + " --providers",
  pnpm: "pnpm create spectrum-project@latest synera -- --projectId " + PROJECT_ID + " --providers",
  npm: "npm create spectrum-project@latest synera -- --projectId " + PROJECT_ID + " --providers",
  yarn: "yarn create spectrum-project@latest synera --projectId " + PROJECT_ID + " --providers",
};
const NAV_CONTENT = {
  Users: { kicker: "ACCESS", title: "People on your project", description: "Only approved people can message your shared iMessage line.", action: "Add user" },
  Configure: { kicker: "PROJECT", title: "Project configuration", description: "Credentials and runtime settings for Synera.", action: "View setup" },
  Platforms: { kicker: "CHANNELS", title: "Connected platforms", description: "Choose where Synera can send and receive messages.", action: "Add platform" },
  Webhooks: { kicker: "EVENT DELIVERY", title: "Webhooks", description: "Deliver inbound message events to your own endpoint.", action: "Add endpoint" },
  "Call Registry": { kicker: "ACTIVITY", title: "Call registry", description: "Requests made by your Spectrum project.", action: "Refresh" },
  Billing: { kicker: "PLAN", title: "Plan and usage", description: "Your current plan and messaging capacity.", action: "Explore plans" },
  Settings: { kicker: "PROJECT", title: "Project settings", description: "Manage the identity and security of this project.", action: "Save changes" },
};

export default function PhotonDashboard({ onClose }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Photon Console | Synera";
    return () => { document.title = previousTitle; };
  }, []);

  const [activeSection, setActiveSection] = useState("Get started");
  const [platform, setPlatform] = useState("imessage");
  const [packageManager, setPackageManager] = useState("npm");
  const [copied, setCopied] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [users, setUsers] = useState([{ name: "Ravi Satunuri", phone: "+1 (773) 912-3997" }]);
  const [toast, setToast] = useState("");
  const selectedPlatform = PLATFORMS.find((item) => item.id === platform);
  const command = `${COMMANDS[packageManager]} ${platform} --yes`;

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`${label} copied`);
      window.setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("Clipboard access is unavailable in this browser");
      window.setTimeout(() => setToast(""), 3000);
    }
  };

  const addUser = (event) => {
    event.preventDefault();
    if (!inviteName.trim() || !invitePhone.trim()) return;
    setUsers((current) => [...current, { name: inviteName.trim(), phone: invitePhone.trim() }]);
    setInviteName("");
    setInvitePhone("");
    setInviteOpen(false);
    setToast("User added to this dashboard session");
    window.setTimeout(() => setToast(""), 2400);
  };

  return (
    <div className="photon-shell">
      <aside className="photon-sidebar">
        <button className="photon-brand" onClick={() => setActiveSection("Get started")} aria-label="Photon dashboard home">
          <span className="photon-brand-mark">P</span><span>photon<span className="photon-brand-dot">.</span></span>
          <span className="photon-console-label">CONSOLE</span>
        </button>
        <div className="photon-project">
          <span className="photon-project-icon">S</span>
          <span className="photon-project-copy"><strong>Synera</strong><small>PRO PROJECT</small></span>
          <span className="photon-chevron">⌄</span>
        </div>
        <nav className="photon-nav" aria-label="Project navigation">
          {NAVIGATION.map((group) => (
            <div className="photon-nav-group" key={group.title}>
              <span className="photon-nav-label">{group.title}</span>
              {group.links.map(([label, index]) => (
                <button key={label} className={`photon-nav-link${activeSection === label ? " active" : ""}`} onClick={() => setActiveSection(label)}>
                  <span className="photon-nav-symbol">{index}</span><span>{label}</span>
                  {label === "Users" && <span className="photon-nav-count">{users.length}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="photon-sidebar-bottom">
          <a className="photon-docs-link" href="https://docs.photon.codes/" target="_blank" rel="noreferrer"><span>↗</span> Documentation</a>
          <button className="photon-account" onClick={() => setToast("Signed in as Ravi Satunuri")}>
            <span className="photon-avatar">RS</span><span><strong>Ravi Satunuri</strong><small>Project owner</small></span><span className="photon-more">···</span>
          </button>
        </div>
      </aside>

      <main className="photon-main">
        <header className="photon-topbar">
          <div className="photon-breadcrumb"><span>Synera</span><i>/</i><strong>{activeSection}</strong></div>
          <div className="photon-top-actions"><span className="photon-plan-badge">PRO PLAN</span><button className="photon-help" onClick={onClose} title="Back to Synera">S</button></div>
        </header>

        {activeSection === "Get started" ? (
          <div className="photon-content">
            <div className="photon-page-heading">
              <div><span className="photon-eyebrow">SPECTRUM <span>/</span> GET STARTED</span><h1>Send your first message</h1><p>Three steps from a fresh project to your first reply.</p></div>
              <span className="photon-completion"><span>01</span> / 03 steps</span>
            </div>
            <div className="photon-progress" aria-label="Step 1 of 3"><span /></div>

            <section className="photon-step" aria-labelledby="choose-platform">
              <div className="photon-step-marker"><span>01</span><i /></div>
              <div className="photon-step-body">
                <div className="photon-step-heading"><div><span className="photon-eyebrow">FIRST, PICK A CHANNEL</span><h2 id="choose-platform">Choose your first platform</h2><p>The setup command and test instructions will match your choice.</p></div><span className="photon-step-state">CURRENT STEP</span></div>
                <div className="photon-platform-grid" role="radiogroup" aria-label="Messaging platform">
                  {PLATFORMS.map((item) => (
                    <button key={item.id} role="radio" aria-checked={platform === item.id} className={`photon-platform${platform === item.id ? " selected" : ""}`} onClick={() => setPlatform(item.id)}>
                      <span className={`photon-platform-icon ${item.id}`}>{item.glyph}</span><span className="photon-platform-copy"><strong>{item.name}</strong><small>{item.description}</small></span><span className="photon-radio"><i /></span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="photon-step" aria-labelledby="scaffold-project">
              <div className="photon-step-marker"><span>02</span><i /></div>
              <div className="photon-step-body">
                <div className="photon-step-heading"><div><span className="photon-eyebrow">THEN, CREATE YOUR APP</span><h2 id="scaffold-project">Scaffold the project</h2><p>A ready-to-run Spectrum project with this project's ID.</p></div><span className="photon-step-state muted">UP NEXT</span></div>
                <div className="photon-command-box">
                  <div className="photon-command-toolbar"><div className="photon-package-tabs" role="tablist" aria-label="Package manager">{PACKAGE_MANAGERS.map((manager) => <button key={manager} role="tab" aria-selected={packageManager === manager} className={packageManager === manager ? "active" : ""} onClick={() => { setPackageManager(manager); setCopied(false); }}>{manager}</button>)}</div><button className="photon-copy-button" onClick={async () => { await copy(command, "Command"); setCopied(true); }}><span>{copied ? "✓" : "▢"}</span>{copied ? "Copied" : "Copy"}</button></div>
                  <code><span className="photon-terminal-prompt">$</span> {command}</code>
                  <div className="photon-command-foot"><span><i /> Ready to run</span><span>Creates <b>synera/</b> and installs dependencies</span></div>
                </div>
                <button className="photon-manual-toggle" aria-expanded={manualOpen} onClick={() => setManualOpen((value) => !value)}><span>{manualOpen ? "−" : "+"}</span> Set it up manually <i>{manualOpen ? "⌃" : "⌄"}</i></button>
                {manualOpen && <div className="photon-manual-panel"><p>Prefer to wire it up yourself? Install Spectrum and set the project credentials in your environment.</p><code>{packageManager === "npm" ? "npm install spectrum-ts" : `${packageManager} add spectrum-ts`}</code><div className="photon-env-row"><span>PROJECT_ID</span><code>{PROJECT_ID}</code><button onClick={() => copy(PROJECT_ID, "Project ID")}>Copy ID</button></div><div className="photon-env-row"><span>PROJECT_SECRET</span><code>Set from Project settings</code><button onClick={() => setActiveSection("Settings")}>Open settings</button></div></div>}
              </div>
            </section>

            <section className="photon-step last" aria-labelledby="send-message">
              <div className="photon-step-marker"><span>03</span></div>
              <div className="photon-step-body">
                <div className="photon-step-heading"><div><span className="photon-eyebrow">FINALLY, TRY IT OUT</span><h2 id="send-message">Run it and text your line</h2><p>Start your project locally, then send a message from your phone.</p></div><span className="photon-step-state muted">UP NEXT</span></div>
                <div className="photon-test-layout">
                  <div className="photon-line-panel">
                    <div className="photon-line-top"><span className="photon-platform-icon imessage">i</span><span><strong>{selectedPlatform.name} line</strong><small>{platform === "imessage" ? "SHARED NUMBER" : "CONNECT AFTER SETUP"}</small></span><span className="photon-line-live"><i /> {platform === "imessage" ? "Ready" : "Pending"}</span></div>
                    {platform === "imessage" ? <><div className="photon-phone-number">+1 (773) 912-3997</div><p className="photon-line-note">Shared with Synera. It replies only to people you've added to this project.</p><div className="photon-line-actions"><button onClick={() => copy("+17739123997", "Phone number")}>Copy number</button><a href="sms:+17739123997">Open messages ↗</a></div></> : <div className="photon-connect-note">Finish setup for {selectedPlatform.name} to connect your first channel. Your credentials stay in your local environment.</div>}
                  </div>
                  <div className="photon-next-panel"><span className="photon-next-icon">↗</span><span className="photon-eyebrow">YOUR NEXT MOVE</span><h3>Add your people</h3><p>Only approved users can message a shared line. Add someone before they try it.</p><button onClick={() => setActiveSection("Users")}>Manage users <span>→</span></button></div>
                </div>
                <div className="photon-next-docs"><span className="photon-docs-glyph">✳</span><div><strong>You're just getting started.</strong><p>Build multi-step conversations, connect tools, and share state across platforms.</p></div><a href="https://docs.photon.codes/" target="_blank" rel="noreferrer">Explore Spectrum docs <span>↗</span></a></div>
              </div>
            </section>
            <footer className="photon-footer"><span>Photon Spectrum</span><span>Project ID <code>{PROJECT_ID.slice(0, 8)}…</code></span><a href="https://photon.codes/docs" target="_blank" rel="noreferrer">Help center ↗</a></footer>
          </div>
        ) : (
          <section className="photon-content photon-section-page">
            <div className="photon-page-heading"><div><span className="photon-eyebrow">SPECTRUM <span>/</span> {NAV_CONTENT[activeSection]?.kicker}</span><h1>{NAV_CONTENT[activeSection]?.title}</h1><p>{NAV_CONTENT[activeSection]?.description}</p></div>{NAV_CONTENT[activeSection]?.action && <button className="photon-primary-button" onClick={() => activeSection === "Users" ? setInviteOpen(true) : activeSection === "Configure" ? setActiveSection("Get started") : setToast(`${activeSection} settings are up to date`)}>{NAV_CONTENT[activeSection].action}<span>+</span></button>}</div>
            {activeSection === "Users" ? <div className="photon-data-panel"><div className="photon-table-head"><strong>Allowed users</strong><span>{users.length} {users.length === 1 ? "person" : "people"}</span></div>{users.map((user) => <div className="photon-user-row" key={`${user.name}-${user.phone}`}><span className="photon-avatar">{user.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</span><span className="photon-user-name"><strong>{user.name}</strong><small>{user.phone}</small></span><span className="photon-access-tag">Can message</span><button className="photon-row-menu" onClick={() => setUsers((current) => current.filter((item) => item !== user))} aria-label={`Remove ${user.name}`}>×</button></div>)}<div className="photon-table-foot">Shared iMessage lines only reply to users on this list.</div></div> : <div className="photon-data-panel photon-info-panel">{activeSection === "Platforms" ? PLATFORMS.map((item) => <button key={item.id} className="photon-platform-row" onClick={() => { setPlatform(item.id); setActiveSection("Get started"); }}><span className={`photon-platform-icon ${item.id}`}>{item.glyph}</span><span><strong>{item.name}</strong><small>{item.description}</small></span><span className={item.id === "imessage" ? "photon-access-tag" : "photon-pending-tag"}>{item.id === "imessage" ? "Connected" : "Available"}</span><span>→</span></button>) : <div className="photon-info-row"><span className="photon-info-icon">{activeSection === "Billing" ? "$" : activeSection === "Webhooks" ? "↗" : activeSection === "Settings" ? "⚙" : activeSection === "Call Registry" ? "≋" : "⌘"}</span><div><strong>{activeSection === "Configure" ? "Environment variables" : activeSection === "Webhooks" ? "No webhook endpoints yet" : activeSection === "Call Registry" ? "No calls recorded" : activeSection === "Billing" ? "Pro plan" : "Synera"}</strong><p>{activeSection === "Configure" ? "PROJECT_ID is set. Your project secret stays private in .env." : activeSection === "Webhooks" ? "Add an endpoint to receive real-time Spectrum events." : activeSection === "Call Registry" ? "API activity will appear here as your project runs." : activeSection === "Billing" ? "Your project is on the Pro plan." : "Spectrum project settings and credentials."}</p>{activeSection === "Configure" && <button className="photon-inline-link" onClick={() => setActiveSection("Get started")}>View setup instructions →</button>}</div></div>}</div>}
          </section>
        )}
      </main>

      {inviteOpen && <div className="photon-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}><form className="photon-invite-modal" onSubmit={addUser}><button className="photon-modal-close" type="button" onClick={() => setInviteOpen(false)} aria-label="Close">×</button><span className="photon-eyebrow">PROJECT ACCESS</span><h2>Add a user</h2><p>Allow someone to message the shared iMessage line.</p><label>Name<input autoFocus value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Alex Morgan" required /></label><label>Phone number<input type="tel" value={invitePhone} onChange={(event) => setInvitePhone(event.target.value)} placeholder="+1 555 000 0000" required /></label><div className="photon-modal-actions"><button type="button" onClick={() => setInviteOpen(false)}>Cancel</button><button className="photon-primary-button" type="submit">Add user <span>+</span></button></div></form></div>}
      {toast && <div className="photon-toast" role="status">✓ {toast}</div>}
    </div>
  );
}