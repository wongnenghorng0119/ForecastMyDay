import React from "react";
import { btn, responsivePanel } from "../../utils/styles";

const ResultsPanel = ({
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
        minWidth: 280,
        maxWidth: 420,
        // Mobile responsive
        [`@media (max-width: 768px)`]: {
          right: 8,
          bottom: 8,
          minWidth: 260,
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
        fontWeight: 600, 
        marginBottom: 6,
        fontSize: "14px",
        // Mobile responsive
        [`@media (max-width: 480px)`]: {
          fontSize: "12px"
        }
      }}>Results</div>

      {loadingStats ? (
        <div style={{
          fontSize: "12px",
          // Mobile responsive
          [`@media (max-width: 480px)`]: {
            fontSize: "11px"
          }
        }}>Calculating... (Fetching POWER data by year)</div>
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
  );
};

export default ResultsPanel;