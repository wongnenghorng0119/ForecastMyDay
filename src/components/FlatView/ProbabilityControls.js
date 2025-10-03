import React from "react";
import { numInput, btn, responsivePanel, responsiveFlex } from "../../utils/styles";
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
        ...responsivePanel("absolute"),
        left: 12,
        bottom: 12,
        minWidth: 280,
        // Mobile responsive
        [`@media (max-width: 768px)`]: {
          left: 8,
          bottom: 8,
          minWidth: 260,
          maxWidth: "calc(100vw - 16px)"
        },
        [`@media (max-width: 480px)`]: {
          left: 4,
          bottom: 4,
          minWidth: "calc(100vw - 8px)",
          maxWidth: "calc(100vw - 8px)",
          boxSizing: "border-box"
        }
      }}
    >
      <div style={{ 
        fontWeight: 600, 
        marginBottom: 8,
        fontSize: "14px",
        // Mobile responsive
        [`@media (max-width: 480px)`]: {
          fontSize: "12px",
          marginBottom: 6
        }
      }}>
        Historical Probability (NASA POWER)
      </div>

      <div
        style={{
          ...responsiveFlex("row", 8),
          flexWrap: "wrap",
          // Mobile responsive
          [`@media (max-width: 480px)`]: {
            flexDirection: "column",
            gap: "6px"
          }
        }}
      >
        <label style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "4px",
          fontSize: "12px",
          // Mobile responsive
          [`@media (max-width: 480px)`]: {
            fontSize: "11px"
          }
        }}>
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
        <label style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "4px",
          fontSize: "12px",
          // Mobile responsive
          [`@media (max-width: 480px)`]: {
            fontSize: "11px"
          }
        }}>
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
        <label 
          title="Window around target date (days), e.g., 3 means ±3 days"
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "4px",
            fontSize: "12px",
            // Mobile responsive
            [`@media (max-width: 480px)`]: {
              fontSize: "11px"
            }
          }}
        >
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

      <div style={{ 
        marginTop: 10, 
        opacity: 0.85, 
        fontSize: 12,
        wordBreak: "break-word",
        // Mobile responsive
        [`@media (max-width: 480px)`]: {
          fontSize: "10px",
          marginTop: 8
        }
      }}>
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