import React, { useMemo } from "react";
import "../css/ResultsPanel.css";

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
  const cards = useMemo(() => {
    if (!stats) return [];
    const mk = (key, label, block, meta) => ({
      key,
      label,
      value: Math.round(block?.pct ?? 0),
      severity: (block?.pct ?? 0) >= 60 ? "high" : (block?.pct ?? 0) >= 30 ? "medium" : "low",
      meta,
    });
    return [
      mk("veryHot", "Very Hot", stats.veryHot, "T ≥ 32°C"),
      mk("veryCold", "Very Cold", stats.veryCold, "T ≤ 0°C"),
      mk("veryWindy", "Very Windy", stats.veryWindy, "WS ≥ 10 m/s"),
      mk("veryWet", "Very Wet", stats.veryWet, "Precip ≥ 10 mm"),
      mk("veryUncomfortable", "Very Uncomfortable", stats.veryUncomfortable, "T ≥ 32°C & RH ≥ 60%"),
    ];
  }, [stats]);

  // 简短标签：veryhot / verycold ...
  const shortName = (key, fallback) =>
    ({
      veryHot: "very hot",
      veryCold: "very cold",
      veryWindy: "very windy",
      veryWet: "very wet",
      veryUncomfortable: "very uncomfortable",
    }[key] || (fallback || "").toLowerCase().replace(/\s+/g, ""));

  return (
    <>
      <aside className={`insight-panel mini right ${open ? "" : "is-collapsed"}`}>
        {/* 顶部云朵（展开/收起） */}
        <div className="insight-hdr">
          <button
            className="icon-btn insight-toggle"
            onClick={onToggle}
            aria-label={open ? "Collapse" : "Expand"}
            title={open ? "Collapse" : "Expand"}
          >
            ☁
          </button>
        </div>

        {/* 内容 */}
        {loadingStats ? (
          <div className="insight-loading">
            <div className="spinner" aria-label="loading" />
            <span>Loading...</span>
          </div>
        ) : statsErr ? (
          <div className="insight-error">Error: {statsErr}</div>
        ) : stats ? (
          <>
            {/* KPI 列表 */}
            <div className="kpi-list mini">
              {cards.map((c) => (
                <div key={c.key} className={`kpi kpi-row mini ${c.severity}`}>
                  {/* 圈圈 + 中心百分比 */}
                  <div className="gauge tiny" style={{ "--p": c.value }}>
                    <div className="gauge-val tiny">{c.value}%</div>
                  </div>

                  {/* 旁边只显示 veryhot 等短标签；meta 白色 */}
                  <div className="kpi-text mini">
                    <div className="lab-short">{shortName(c.key, c.label)}</div>
                    <div className="meta white">{c.meta}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 脚注：两行做 justify */}
            <div className="footnote footnote-left mini">
              <div className="line1 justify">
                Sample: {stats.sampleCount} days ({month}/{day} ± {windowDays} days, 1995—present, daily values)
              </div>
              <div className="line2 justify">
                {selectedArea
                  ? (selectedArea.name ?? "Location") +
                    ` (${selectedArea.lat?.toFixed(3)}, ${selectedArea.lng?.toFixed(3)})`
                  : "No location selected"}
              </div>
            </div>

            {csvURL ? (
              <a
                className="csv-btn mini"
                href={csvURL}
                download={`nasa_power_prob_${(selectedArea?.name || "location")
                  .replace(/\s+/g, "_")}_${month}_${day}_pm${windowDays}.csv`}
              >
                CSV
              </a>
            ) : null}
          </>
        ) : (
          <div className="insight-hint">
            Select a date in the bottom left and click “Calculate Probability”
          </div>
        )}
      </aside>

      {/* 收起时右侧“云朵”按钮：黑色背景 */}
      {!open && (
        <button
          className="insight-tab mini right dark"
          onClick={onToggle}
          aria-label="Expand stats"
          title="Expand stats"
        >
          ☁
        </button>
      )}
    </>
  );
};

export default ResultsPanel;
