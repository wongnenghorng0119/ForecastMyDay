import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import VoiceInputButton from "./VoiceInputButton";
import "./css/OverlayBar.css";

/** —— 黑洞动画（无音效、无地球） —— */
const BH_SPIN_MS = 3000;

function BlackHoleAnimation({ absorbing }) {
  return (
    <div className={`blackhole-container ${absorbing ? "absorbing" : ""}`}>
      <div className="blackhole-ring-outer"><div className="blackhole-ring-outer-inner" /></div>
      <div className="blackhole-ring-inner"><div className="blackhole-ring-inner-inner" /></div>
      <div className="blackhole-core"><div className="blackhole-center" /></div>
      {[...Array(8)].map((_, i) => (<div key={i} className="blackhole-particle" />))}
    </div>
  );
}

/** —— 2D / 3D 模式开关 —— */
function ModeSwitch({ mode, setMode }) {
  const is3D = mode === "globe";
  const toggle = () => setMode(is3D ? "flat" : "globe");
  const to2D = () => setMode("flat");
  const to3D = () => setMode("globe");

  return (
    <div
      className="mode-switch"
      role="switch"
      aria-checked={is3D}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          toggle();
        }
      }}
      title="Toggle 2D / 3D"
    >
      <div className={`ms-knob ${is3D ? "right" : "left"}`} aria-hidden />
      <div className={`ms-label ${!is3D ? "active" : ""}`} onClick={to2D}>2D</div>
      <div className={`ms-label ${is3D ? "active" : ""}`} onClick={to3D}>3D</div>
    </div>
  );
}

/** —— OverlayBar —— */
const OverlayBar = ({ mode, onSearch, query, setQuery, setMode }) => {
  const [absorbing, setAbsorbing] = useState(false);
  const spinTimerRef = useRef(0);

  const triggerBHSpin = () => {
    clearTimeout(spinTimerRef.current);
    setAbsorbing(true);
    spinTimerRef.current = setTimeout(() => setAbsorbing(false), BH_SPIN_MS);
  };

  const doSearch = (value) => {
    const v = (value ?? query ?? "").trim();
    if (!v) return;
    triggerBHSpin();
    onSearch?.(v);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  };

  const handleVoiceTranscript = (transcript) => {
    const t = (transcript || "").trim();
    setQuery(t);
    if (t) doSearch(t);
  };

  useEffect(() => () => clearTimeout(spinTimerRef.current), []);

  return createPortal(
    <header className="hdr">
      {/* 胶囊底 SVG */}
      <svg className="hdr-shape" width="900" height="100" viewBox="0 0 900 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%">
            <stop offset="0%" style={{ stopColor: "rgba(10,15,25,0.92)", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "rgba(15,20,30,0.95)", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "rgba(10,15,25,0.92)", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path d="M 80 50 Q 80 30, 100 30 L 380 30 Q 390 30, 395 35 Q 400 40, 405 40 L 440 40 Q 445 40, 450 50 Q 445 60, 440 60 L 405 60 Q 400 60, 395 65 Q 390 70, 380 70 L 100 70 Q 80 70, 80 50" fill="url(#headerGradient)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <path d="M 820 50 Q 820 30, 800 30 L 520 30 Q 510 30, 505 35 Q 500 40, 495 40 L 460 40 Q 455 40, 450 50 Q 455 60, 460 60 L 495 60 Q 500 60, 505 65 Q 510 70, 520 70 L 800 70 Q 820 70, 820 50" fill="url(#headerGradient)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <circle cx="450" cy="50" r="38" fill="rgba(10,15,25,0.92)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      </svg>

      {/* 左（品牌+开关） | 中（黑洞） | 右（搜索+麦克风） */}
      <div className="hdr-inner">
        <div className="hdr-left">
          <div className="hdr-left-row">
            <span className="brand">ForecastMyDay</span>
            <ModeSwitch mode={mode} setMode={setMode} />
          </div>
        </div>

        <div className="hdr-center">
          <BlackHoleAnimation absorbing={absorbing} />
        </div>

        <div className="hdr-right">
          <div className="sbox">
            <div className="search">
              <svg
                className="icon clickable"
                viewBox="0 0 24 24"
                aria-hidden="true"
                onClick={() => doSearch()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && doSearch()}
              >
                <path d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm8.32 12.9 3.39 3.39-1.41 1.41-3.39-3.39A8.96 8.96 0 0 1 10 20a9 9 0 1 1 0-18 9 9 0 0 1 8.32 14.9z"></path>
              </svg>

              <input
                type="search"
                placeholder="Search location (e.g., malaysia sibu)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
              />

              <div className="mic-slot" title="Voice search">
                <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>,
    document.body
  );
};

export default OverlayBar;
