import React from "react";
import { btn } from "../../utils/styles";

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
        position: "absolute",
        right: 12,
        bottom: 12,
        zIndex: 2147483647,
        minWidth: 280,
        maxWidth: 420,
        padding: 12,
        borderRadius: 10,
        background: "rgba(0,0,0,0.55)",
        color: "#fff",
        fontFamily: "system-ui",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Results</div>

      {loadingStats ? (
        <div>Calculating... (Fetching POWER data by year)</div>
      ) : statsErr ? (
        <div>Error: {statsErr}</div>
      ) : stats ? (
        <>
          <div style={{ marginBottom: 6, opacity: 0.85, fontSize: 12 }}>
            Sample: {stats.sampleCount} days ({month}/{day} ± {stats.windowDays}{" "}
            days, 1995—present, daily values)
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
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
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              Data source: NASA POWER (temporal=daily, point)
            </span>
          </div>

        </>
      ) : (
        <div>Select a date in the bottom left and click "Calculate Probability".</div>
      )}
    </div>
  );
};

export default ResultsPanel;