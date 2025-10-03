import React from "react";
import { btn, responsivePanel } from "../../utils/styles";

const ResultsPanel = ({
  open,
  onToggle,
  loadingStats,
  statsErr,
  stats,
  month,
  day,
  windowDays,
  selectedArea,
  csvURL,
}) => {
  return (
    <div
      style={{
        ...responsivePanel("absolute"),
        right: 12,
        bottom: 12,
        minWidth: open ? 280 : 140,
        maxWidth: 420,
        overflow: "hidden",
        transition: "max-height 0.25s ease, opacity 0.25s ease",
        maxHeight: open ? 640 : 640,
        opacity: open ? 1 : 0.95,
        // Mobile responsive
        [`@media (max-width: 768px)`]: {
          right: 8,
          bottom: 8,
          minWidth: open ? 260 : 140,
          maxWidth: "calc(100vw - 16px)"
        },
        [`@media (max-width: 480px)`]: {
          right: 4,
          bottom: 4,
          minWidth: "calc(100vw - 8px)",
          maxWidth: "calc(100vw - 8px)",
          boxSizing: "border-box"
        }
      }}
    >
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: open ? "space-between" : "center", 
        gap: 8,
        marginBottom: open ? 6 : 0 
      }}>
        <div style={{ 
          fontWeight: 600, 
          fontSize: "14px",
          // Mobile responsive
          [`@media (max-width: 480px)`]: { fontSize: "12px" }
        }}>Results</div>
        <button 
          onClick={onToggle} 
          style={{ 
            ...btn("#2b2f36"), 
            padding: open ? "4px 8px" : "4px 10px", 
            fontSize: 12 
          }}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {/* Collapsible content */}
      <div style={{ display: open ? "block" : "none" }}>
      {loadingStats ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 16, height: 16, border: "2px solid #66aaff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: "12px" }}>
            Loading...
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : statsErr ? (
        <div style={{
          fontSize: "12px",
          color: "#ff6b6b",
          // Mobile responsive
          [`@media (max-width: 480px)`]: {
            fontSize: "11px"
          }
        }}>Error: {statsErr}</div>
      ) : stats ? (
        <>
          <div style={{ 
            marginBottom: 6, 
            opacity: 0.85, 
            fontSize: 12,
            wordBreak: "break-word",
            // Mobile responsive
            [`@media (max-width: 480px)`]: {
              fontSize: "10px"
            }
          }}>
            Sample: {stats.sampleCount} days ({month}/{day} ± {stats.windowDays}{" "}
            days, 1995—present, daily values)
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: 18, 
            lineHeight: 1.6,
            fontSize: "12px",
            // Mobile responsive
            [`@media (max-width: 480px)`]: {
              fontSize: "11px",
              paddingLeft: 14,
              lineHeight: 1.4
            }
          }}>
            <li>
              Very hot (T2M &gt; 32°C): <b>{stats.veryHot.pct}%</b> (
              {stats.veryHot.hits}/{stats.veryHot.n})
            </li>
            <li>
              Very cold (T2M &lt; 0°C): <b>{stats.veryCold.pct}%</b> (
              {stats.veryCold.hits}/{stats.veryCold.n})
            </li>
            <li>
              Very wet (PRECTOT ≥ 10 mm): <b>{stats.veryWet.pct}%</b> (
              {stats.veryWet.hits}/{stats.veryWet.n})
            </li>
            <li>
              Very windy (WS2M ≥ 10 m/s): <b>{stats.veryWindy.pct}%</b> (
              {stats.veryWindy.hits}/{stats.veryWindy.n})
            </li>
            <li>
              Very uncomfortable (T2M ≥ 32°C and RH2M ≥ 60%):{" "}
              <b>{stats.veryUncomfortable.pct}%</b> (
              {stats.veryUncomfortable.hits}/{stats.veryUncomfortable.n})
            </li>
          </ul>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              // Mobile responsive
              [`@media (max-width: 480px)`]: {
                flexDirection: "column",
                alignItems: "stretch",
                gap: "6px"
              }
            }}
          >
            {csvURL ? (
              <a
                href={csvURL}
                download={`nasa_power_prob_${(
                  selectedArea?.name || "location"
                ).replace(/\s+/g, "_")}_${month}_${day}_pm${windowDays}.csv`}
                style={{
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "#1f8fff",
                  color: "#fff",
                }}
              >
                Download CSV
              </a>
            ) : null}
            <span style={{ 
              fontSize: 12, 
              opacity: 0.8,
              wordBreak: "break-word",
              // Mobile responsive
              [`@media (max-width: 480px)`]: {
                fontSize: "10px"
              }
            }}>
              Data source: NASA POWER (temporal=daily, point)
            </span>
          </div>

        </>
      ) : (
        <div style={{
          fontSize: "12px",
          // Mobile responsive
          [`@media (max-width: 480px)`]: {
            fontSize: "11px"
          }
        }}>Select a date in the bottom left and click "Calculate Probability".</div>
      )}
      </div>
    </div>
  );
};

export default ResultsPanel;