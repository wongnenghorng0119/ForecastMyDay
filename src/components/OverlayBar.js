
import React from "react";
import { createPortal } from "react-dom";
import VoiceInputButton from "./VoiceInputButton";
import { responsiveFlex } from "../utils/styles";

const OverlayBar = ({
  mode,
  setMode,
  selectedName,
  selectedArea,
  clearArea,
  onSearch,
  query,
  setQuery,
}) => {
  const handleVoiceTranscript = (transcript) => {
    setQuery(transcript);
    if (transcript.trim()) {
      onSearch?.(transcript.trim());
    }
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 2147483647,
        ...responsiveFlex("row", 8),
        padding: 6,
        borderRadius: 10,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        color: "#fff",
        fontFamily: "system-ui",
        flexWrap: "wrap",
        // Mobile responsive
        [`@media (max-width: 768px)`]: {
          top: 8,
          left: 8,
          padding: 8,
          borderRadius: 8
        },
        [`@media (max-width: 480px)`]: {
          top: 4,
          left: 4,
          right: 4,
          padding: 6,
          borderRadius: 6,
          flexDirection: "column",
          alignItems: "stretch",
          maxWidth: "calc(100vw - 8px)",
          boxSizing: "border-box"
        }
      }}
    >
      <button
        onClick={() => setMode("globe")}
        style={btn(mode === "globe" ? "#1f8fff" : "#444")}
      >
        🌍 Globe
      </button>
      <button
        onClick={() => setMode("flat")}
        style={btn(mode === "flat" ? "#1f8fff" : "#444")}
      >
        🗺️ 2D Map
      </button>

      {mode === "globe" ? (
        <div style={{
          ...pill(),
          // Mobile responsive
          [`@media (max-width: 480px)`]: {
            textAlign: "center",
            wordBreak: "break-word"
          }
        }}>Selected Country: {selectedName || "(None)"}</div>
      ) : (
        <>
          {/* Search box (2D) */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) onSearch?.(query.trim());
            }}
            placeholder="Search location (e.g., malaysia sibu)"
            style={{
              ...input(),
              maxWidth: "100%",
              // Mobile responsive
              [`@media (max-width: 480px)`]: {
                width: "100%",
                marginBottom: "4px",
                maxWidth: "100%"
              }
            }}
          />
          
          {/* 语音输入按钮 */}
          <VoiceInputButton 
            onTranscript={handleVoiceTranscript}
            disabled={mode !== "flat"}
          />
          
          <button
            onClick={() => query.trim() && onSearch?.(query.trim())}
            style={{
              ...btn("#1f8fff"),
              // Mobile responsive
              [`@media (max-width: 480px)`]: {
                width: "100%",
                marginBottom: "4px"
              }
            }}
          >
            🔍 Search
          </button>

          <div style={{
            ...pill(),
            // Mobile responsive
            [`@media (max-width: 480px)`]: {
              textAlign: "center",
              wordBreak: "break-word",
              marginBottom: "4px"
            }
          }}>
            Selected Area:{" "}
            {selectedArea
              ? `${selectedArea.name} [${selectedArea.type}]`
              : "(None)"}
          </div>
          <button 
            onClick={clearArea} 
            style={{
              ...btn("#444"),
              // Mobile responsive
              [`@media (max-width: 480px)`]: {
                width: "100%"
              }
            }}
          >
            ✖️ Clear
          </button>
        </>
      )}
    </div>,
    document.body
  );
};

const btn = (bg) => ({
  padding: "6px 10px",
  borderRadius: 8,
  border: 0,
  cursor: "pointer",
  background: bg,
  color: "#fff",
  fontWeight: 500,
  transition: "all 0.2s ease",
});

const pill = () => ({
  background: "rgba(0,0,0,0.45)",
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: 14,
});

const input = () => ({
  width: 240,
  padding: "6px 10px",
  borderRadius: 8,
  border: 0,
  outline: "none",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  fontSize: 14,
  transition: "all 0.2s ease",
});

export default OverlayBar;