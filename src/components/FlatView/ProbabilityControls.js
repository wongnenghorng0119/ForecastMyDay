import React from "react";
import { numInput, btn } from "../../utils/styles";
import { clampInt } from "../../utils/helpers";

const ProbabilityControls = ({
  month,
  setMonth,
  day,
  setDay,
  windowDays,
  setWindowDays,
  selectedArea,
  onCalculate,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        zIndex: 2147483647,
        padding: 12,
        borderRadius: 10,
        background: "rgba(0,0,0,0.55)",
        color: "#fff",
        fontFamily: "system-ui",
        minWidth: 280,
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        Historical Probability (NASA POWER)
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label>
          Month
          <input
            type="number"
            min="1"
            max="12"
            value={month}
            onChange={(e) => setMonth(clampInt(e.target.value, 1, 12))}
            style={numInput()}
          />
        </label>
        <label>
          Day
          <input
            type="number"
            min="1"
            max="31"
            value={day}
            onChange={(e) => setDay(clampInt(e.target.value, 1, 31))}
            style={numInput()}
          />
        </label>
        <label title="Window around target date (days), e.g., 3 means ±3 days">
          ±Days
          <input
            type="number"
            min="0"
            max="15"
            value={windowDays}
            onChange={(e) => setWindowDays(clampInt(e.target.value, 0, 15))}
            style={numInput()}
          />
        </label>
        <button
          onClick={() => {
            if (!selectedArea)
              return alert("Please click on a location on the map or search for a place first.");
            onCalculate(
              selectedArea.lat,
              selectedArea.lng,
              month,
              day,
              windowDays
            );
          }}
          style={btn("#1f8fff")}
        >
          Calculate Probability
        </button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
        Location:{" "}
        {selectedArea
          ? `${selectedArea.name} (${selectedArea.lat?.toFixed(
              3
            )}, ${selectedArea.lng?.toFixed(3)})`
          : "Not selected"}
      </div>
    </div>
  );
};

export default ProbabilityControls;