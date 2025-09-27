import React from "react";
import { createPortal } from "react-dom";

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
  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 2147483647,
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: 6,
        borderRadius: 10,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <button
        onClick={() => setMode("globe")}
        style={btn(mode === "globe" ? "#1f8fff" : "#444")}
      >
        Globe
      </button>
      <button
        onClick={() => setMode("flat")}
        style={btn(mode === "flat" ? "#1f8fff" : "#444")}
      >
        2D Map
      </button>

      {mode === "globe" ? (
        <div style={pill()}>Selected Country: {selectedName || "(None)"}</div>
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
            style={input()}
          />
          <button
            onClick={() => query.trim() && onSearch?.(query.trim())}
            style={btn("#1f8fff")}
          >
            Search
          </button>

          <div style={pill()}>
            Selected Area:{" "}
            {selectedArea
              ? `${selectedArea.name} [${selectedArea.type}]`
              : "(None)"}
          </div>
          <button onClick={clearArea} style={btn("#444")}>
            Clear
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
});

const pill = () => ({
  background: "rgba(0,0,0,0.45)",
  padding: "6px 10px",
  borderRadius: 8,
});

const input = () => ({
  width: 240,
  padding: "6px 10px",
  borderRadius: 8,
  border: 0,
  outline: "none",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
});

export default OverlayBar;