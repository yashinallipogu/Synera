import { useEffect, useState } from "react";
import Scene from "./components/Scene";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import SkillSetup from "./pages/SkillSetup";
import Feed from "./pages/Feed";
import Chat from "./pages/Chat";
import { ME } from "./data/me";

const emptyProfile = () => ({
  ...ME,
  name: "",
  major: "",
  offers: [],
  wants: [],
  phone: "",
  textOptIn: false,
  phoneVerified: false,
});

const profileFromUser = (user) => {
  const savedProfile = { ...(user.profile || {}) };
  delete savedProfile.availability;
  return {
    ...emptyProfile(),
    ...savedProfile,
    username: user.username,
    id: user.id,
    swaps: 0,
  };
};

const profileIsComplete = (profile) => Boolean(
  profile.name && profile.major && profile.offers.length && profile.wants.length
);

export default function App() {
  const [view, setView] = useState("landing");
  const [authMode, setAuthMode] = useState("register");
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState(emptyProfile);
  const [activeChatId, setActiveChatId] = useState(null);

  const navigate = (nextView) => {
    setView(nextView);
    window.scrollTo(0, 0);
  };

  const signupSteps = ["profile", "offers", "wants"];
  const stepIndex = signupSteps.indexOf(view);
  const enter = () => {
    setAuthMode("register");
    navigate("auth");
  };
  const login = () => {
    setAuthMode("login");
    navigate("auth");
  };
  const home = () => navigate(authUser ? "matches" : "landing");
  const openChat = async (userId) => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to open chat.");
    setActiveChatId(result.chat.id);
    navigate("chat");
  };
  const updateProfile = (field, value) =>
    setProfile((current) => ({ ...current, [field]: value }));
  const authenticated = (user) => {
    setAuthUser(user);
    const nextProfile = profileFromUser(user);
    setProfile(nextProfile);
    navigate(profileIsComplete(nextProfile) ? "matches" : "profile");
  };
  const saveProfileAndContinue = async () => {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to save your profile.");
    setProfile((current) => ({ ...current, ...result.user.profile }));
    navigate(signupSteps[stepIndex + 1] ?? "matches");
  };
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAuthUser(null);
      setProfile(emptyProfile());
      navigate("landing");
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        if (!active || !result.user) return;
        const nextProfile = profileFromUser(result.user);
        setAuthUser(result.user);
        setProfile(nextProfile);
        setView(profileIsComplete(nextProfile) ? "matches" : "profile");
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAuthChecked(true);
      });
    return () => { active = false; };
  }, []);

  if (!authChecked) {
    return (
      <>
        <Scene />
        <main className="container auth-loading" aria-live="polite">Loading your account...</main>
      </>
    );
  }

  return (
    <>
      <Scene />
      {view === "landing" ? (
        <Landing onEnter={enter} onLogin={login} />
      ) : view === "auth" ? (
        <Auth mode={authMode} onModeChange={setAuthMode} onHome={home} onSuccess={authenticated} />
      ) : stepIndex !== -1 ? (
        <SkillSetup
          step={view}
          profile={profile}
          onProfileChange={updateProfile}
          onBack={() => navigate(stepIndex === 0 ? "landing" : signupSteps[stepIndex - 1])}
          onHome={home}
          onLogout={logout}
          onContinue={saveProfileAndContinue}
        />
      ) : view === "chat" ? (
        <Chat
          profile={profile}
          initialChatId={activeChatId}
          onHome={() => navigate("matches")}
          onLogout={logout}
          onOpenChat={setActiveChatId}
        />
      ) : (
        <Feed
          profile={profile}
          onHome={home}
          onLogout={logout}
          onEditProfile={() => navigate("profile")}
          onEditOffers={() => navigate("offers")}
          onEditWants={() => navigate("wants")}
          onOpenChat={openChat}
          onShowChats={() => { setActiveChatId(null); navigate("chat"); }}
        />
      )}
    </>
  );
}