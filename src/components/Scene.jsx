import { useEffect } from "react";

export default function Scene() {
  useEffect(() => {
    const move = (e) => {
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="scene">
      <div className="blob a" />
      <div className="blob b" />
      <div className="blob c" />
      <div className="grid" />
      <div className="spotlight" />
    </div>
  );
}