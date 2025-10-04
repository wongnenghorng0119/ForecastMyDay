import React, { useMemo, useState, useCallback } from "react";
import "../css/ResultsPanel.css";
import AnalysisLoading from "../AnalysisLoading";
import ProbabilityInsights from "../ProbabilityInsights";

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
  const [showInsights, setShowInsights] = useState(false);

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
      mk("veryHot", "Very Hot", stats?.veryHot, "T ≥ 32°C"),
      mk("veryCold", "Very Cold", stats?.veryCold, "T ≤ 0°C"),
      mk("veryWindy", "Very Windy", stats?.veryWindy, "WS ≥ 10 m/s"),
      mk("veryWet", "Very Wet", stats?.veryWet, "Precip ≥ 10 mm"),
      mk("veryUncomfortable", "Very Uncomfortable", stats?.veryUncomfortable, "T ≥ 32°C & RH ≥ 60%"),
    ];
  }, [stats]);

  const insightsData = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Very Hot", value: Number(stats?.veryHot?.pct ?? 0) },
      { label: "Very Cold", value: Number(stats?.veryCold?.pct ?? 0) },
      { label: "Very Windy", value: Number(stats?.veryWindy?.pct ?? 0) },
      { label: "Very Wet", value: Number(stats?.veryWet?.pct ?? 0) },
      { label: "Very Uncomfortable", value: Number(stats?.veryUncomfortable?.pct ?? 0) },
    ];
  }, [stats]);

  const shortName = (key, fallback) =>
    (
      {
        veryHot: "very hot",
        veryCold: "very cold",
        veryWindy: "very windy",
        veryWet: "very wet",
        veryUncomfortable: "very uncomfortable",
      }[key] || (fallback || "").toLowerCase().replace(/\s+/g, "")
    );

  const titleText = useMemo(() => {
    const loc = selectedArea
      ? `${selectedArea.name ?? "Location"} (${selectedArea.lat?.toFixed(3)}, ${selectedArea.lng?.toFixed(3)})`
      : "No location selected";
    return `Graph & Analysis — ${loc} • ${month}/${day} ± ${windowDays}d`;
  }, [selectedArea, month, day, windowDays]);

  const closeInsights = useCallback(() => setShowInsights(false), []);

  return (
    <>
      <AnalysisLoading show={!!loadingStats} />

      <aside className={`insight-panel mini right ${open ? "" : "is-collapsed"}`}>
        <div className="insight-hdr">
          <button
            className="icon-btn insight-toggle"
            onClick={onToggle}
            aria-label={open ? "Collapse" : "Expand"}
            title={open ? "Collapse" : "Expand"}
          >
            ☁
          </button>

          {/* 唯一入口：📈 */}
          <button
            className="icon-btn graph-toggle"
            type="button"
            onClick={() => setShowInsights(true)}
            aria-label="Open Probability Insights"
            title="Open Probability Insights"
          >
            📈
          </button>
        </div>

        {statsErr ? (
          <div className="insight-error">Error: {statsErr}</div>
        ) : stats ? (
          <>
            <div className="kpi-list mini">
              {cards.map((c) => (
                <div key={c.key} className={`kpi kpi-row mini ${c.severity}`}>
                  <div className="gauge tiny" style={{ "--p": c.value }}>
                    <div className="gauge-val tiny">{c.value}%</div>
                  </div>
                  <div className="kpi-text mini">
                    <div className="lab-short">{shortName(c.key, c.label)}</div>
                    <div className="meta white">{c.meta}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="footnote footnote-left mini">
              <div className="line1 justify">
                Sample: {stats.sampleCount} days ({month}/{day} ± {windowDays} days, 1995—present, daily values)
              </div>
              <div className="line2 justify">
                {selectedArea
                  ? `${selectedArea.name ?? "Location"} (${selectedArea.lat?.toFixed(3)}, ${selectedArea.lng?.toFixed(3)})`
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

      {/* 中央弹层：始终挂载，用 display 显隐；ProbabilityInsights 用 visible 控制请求 */}
      <div
        className="insight-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Graph & Analysis"
        style={{ display: showInsights ? undefined : "none" }}
      >
        <div className="insight-modal__backdrop" onClick={closeInsights} />
        <div className="insight-modal__panel" onClick={(e) => e.stopPropagation()}>
          <div className="insight-modal__hdr">
            <div className="insight-modal__title">{titleText}</div>
            <button className="icon-btn modal-close" onClick={closeInsights} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="insight-modal__body">
            <ProbabilityInsights
              data={insightsData}
              title="Probability Insights"
              visible={showInsights}         // 控制渲染与请求
              autoAnalyze={true}             // 可一直 true；有缓存则不请求
              maxBars={8}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ResultsPanel;
