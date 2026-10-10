import { useState } from "react";
import Scene from "./components/Scene";
import Landing from "./pages/Landing";
import Feed from "./pages/Feed";
import { ME } from "./data/me";

export default function App() {
  const [view, setView] = useState("landing");
  const [profile, setProfile] = useState(ME);

  const enter = (p) => {
    if (p) setProfile({ ...ME, ...p });
    setView("feed");
    window.scrollTo(0, 0);
  };
  const home = () => {
    setView("landing");
    window.scrollTo(0, 0);
  };

  return (
    <>
      <Scene />
      {view === "landing" ? (
        <Landing onEnter={enter} />
      ) : (
        <Feed profile={profile} onHome={home} />
      )}
    </>
  );
}