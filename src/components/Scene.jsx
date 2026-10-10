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
    <div className="scene" aria-hidden="true">
      <div className="blob a" />
      <div className="blob b" />
      <div className="blob c" />
      <div className="aero-plant">
        <span />
        <span />
        <span />
      </div>
      <div className="grid" />
      <div className="spotlight" />

      <div className="bubble bubble-1" />
      <div className="bubble bubble-2" />
      <div className="bubble bubble-3" />
      <div className="bubble bubble-4" />
      <div className="bubble bubble-5" />

      <div className="fish fish-1">
        <span className="fish-eye" />
      </div>
      <div className="fish fish-2">
        <span className="fish-eye" />
      </div>
      <div className="fish fish-3">
        <span className="fish-eye" />
      </div>
      <div className="fish fish-4">
        <span className="fish-eye" />
      </div>

      <div className="wave-character">
        <div className="char-glow" />
        <div className="char-shadow" />
        <div className="char-torso" />
        <div className="char-body">
          <div className="char-face">
            <div className="char-eye left" />
            <div className="char-eye right" />
            <div className="char-mouth" />
          </div>
          <div className="char-bubbles">
            <i />
            <i />
            <i />
          </div>
          <div className="char-arm arm-left" />
          <div className="char-arm arm-right" />
          <div className="char-leg leg-left" />
          <div className="char-leg leg-right" />
        </div>
      </div>
    </div>
  );
}