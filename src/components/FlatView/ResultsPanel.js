import React, { useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [showDailyDetail, setShowDailyDetail] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [showCSVModal, setShowCSVModal] = useState(false);

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

  // 计算每一天的详细情况
  const dailyDetails = useMemo(() => {
    if (!stats || !selectedCondition) return [];
    
    const sample = stats.sample || [];
    const thresholds = {
      veryHot: (r) => r.T2M != null && r.T2M > 32,
      veryCold: (r) => r.T2M != null && r.T2M < 0,
      veryWet: (r) => r.PRECTOTCORR != null && r.PRECTOTCORR >= 10,
      veryWindy: (r) => r.WS2M != null && r.WS2M >= 10,
      veryUncomfortable: (r) => r.T2M != null && r.RH2M != null && r.T2M >= 32 && r.RH2M >= 60,
    };

    const checkCondition = thresholds[selectedCondition.key];
    if (!checkCondition) return [];

    // 按日期分组
    const byDate = {};
    sample.forEach(row => {
      const dateStr = row.date; // YYYYMMDD
      const month = parseInt(dateStr.slice(4, 6), 10);
      const day = parseInt(dateStr.slice(6, 8), 10);
      const key = `${month}/${day}`;
      
      if (!byDate[key]) {
        byDate[key] = { month, day, total: 0, count: 0 };
      }
      
      byDate[key].total++;
      if (checkCondition(row)) {
        byDate[key].count++;
      }
    });

    // 转换为数组并计算百分比
    return Object.entries(byDate)
      .map(([dateKey, data]) => ({
        date: dateKey,
        month: data.month,
        day: data.day,
        count: data.count,
        total: data.total,
        percentage: Math.round((data.count / data.total) * 100),
      }))
      .sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });
  }, [stats, selectedCondition]);

    // 生成所有条件的每日详情数据
  const generateAllDailyDetails = useCallback(() => {
    if (!stats) return [];
    
    const sample = stats.sample || [];
    const conditions = [
      { key: 'veryHot', label: 'Very Hot', meta: 'T ≥ 32°C', check: (r) => r.T2M != null && r.T2M > 32 },
      { key: 'veryCold', label: 'Very Cold', meta: 'T ≤ 0°C', check: (r) => r.T2M != null && r.T2M < 0 },
      { key: 'veryWet', label: 'Very Wet', meta: 'Precip ≥ 10 mm', check: (r) => r.PRECTOTCORR != null && r.PRECTOTCORR >= 10 },
      { key: 'veryWindy', label: 'Very Windy', meta: 'WS ≥ 10 m/s', check: (r) => r.WS2M != null && r.WS2M >= 10 },
      { key: 'veryUncomfortable', label: 'Very Uncomfortable', meta: 'T ≥ 32°C & RH ≥ 60%', check: (r) => r.T2M != null && r.RH2M != null && r.T2M >= 32 && r.RH2M >= 60 },
    ];

    // 按日期分组，计算每个条件
    const byDate = {};
    sample.forEach(row => {
      const dateStr = row.date; // YYYYMMDD
      const month = parseInt(dateStr.slice(4, 6), 10);
      const day = parseInt(dateStr.slice(6, 8), 10);
      const key = `${month}/${day}`;
      
      if (!byDate[key]) {
        byDate[key] = { 
          month, 
          day, 
          total: 0,
          veryHot: 0,
          veryCold: 0,
          veryWet: 0,
          veryWindy: 0,
          veryUncomfortable: 0
        };
      }
      
      byDate[key].total++;
      conditions.forEach(cond => {
        if (cond.check(row)) {
          byDate[key][cond.key]++;
        }
      });
    });

    // 转换为数组
    return Object.entries(byDate)
      .map(([dateKey, data]) => ({
        date: dateKey,
        month: data.month,
        day: data.day,
        total: data.total,
        veryHot: Math.round((data.veryHot / data.total) * 100),
        veryCold: Math.round((data.veryCold / data.total) * 100),
        veryWet: Math.round((data.veryWet / data.total) * 100),
        veryWindy: Math.round((data.veryWindy / data.total) * 100),
        veryUncomfortable: Math.round((data.veryUncomfortable / data.total) * 100),
      }))
      .sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });
  }, [stats]);

  // 下载 Basic CSV
  const downloadBasicCSV = () => {
    const details = generateAllDailyDetails();
    if (details.length === 0) return;

    const headers = ['Date', 'Month', 'Day', 'Very Hot (%)', 'Very Cold (%)', 'Very Wet (%)', 'Very Windy (%)', 'Very Uncomfortable (%)'];
    const rows = details.map(d => [
      d.date,
      d.month,
      d.day,
      d.veryHot,
      d.veryCold,
      d.veryWet,
      d.veryWindy,
      d.veryUncomfortable
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nasa_power_basic_${(selectedArea?.name || "location").replace(/\s+/g, "_")}_${month}_${day}_pm${windowDays}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowCSVModal(false);
  };

  // 下载 Pro CSV
  const downloadProCSV = () => {
    if (!csvURL) return;
    const link = document.createElement('a');
    link.href = csvURL;
    link.download = `nasa_power_prob_${(selectedArea?.name || "location").replace(/\s+/g, "_")}_${month}_${day}_pm${windowDays}.csv`;
    link.click();
    setShowCSVModal(false);
  };

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

  const handleCardClick = (card) => {
    setSelectedCondition(card);
    setShowDailyDetail(true);
  };

  const closeDailyDetail = () => {
    setShowDailyDetail(false);
    setSelectedCondition(null);
  };

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
                <div 
                  key={c.key} 
                  className={`kpi kpi-row mini ${c.severity}`}
                  onClick={() => handleCardClick(c)}
                  style={{ cursor: 'pointer' }}
                  title="Click to see daily details"
                >
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
              <button
                className="csv-btn mini"
                onClick={() => setShowCSVModal(true)}
                style={{ cursor: 'pointer' }}
              >
                CSV
              </button>
            ) : null}
          </>
        ) : (
          <div className="insight-hint">
            Select a date in the bottom left and click "Calculate Probability"
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


{/* Probability Insights Modal */}
{showInsights && createPortal(
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 2147483646,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeIn 0.2s ease",
    }}
  >
    {/* 背景遮罩 */}
    <div
      onClick={closeInsights}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
      }}
    />

    {/* 内容卡片 */}
    <div
      style={{
        position: "relative",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderRadius: 20,
        padding: 32,
        maxWidth: 800,
        width: "90%",
        maxHeight: "85vh",
        overflow: "auto",
        boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6)",
        border: "2px solid rgba(102, 126, 234, 0.3)",
        animation: "scaleIn 0.3s ease",
      }}
    >
      {/* 关闭按钮 */}
      <button
        onClick={closeInsights}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "none",
          border: "none",
          color: "#999",
          fontSize: 32,
          cursor: "pointer",
          padding: 4,
          borderRadius: 8,
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          zIndex: 1,
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.1)";
          e.target.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "none";
          e.target.style.color = "#999";
        }}
      >
        ×
      </button>

      {/* 标题 */}
      <h2
        style={{
          margin: "0 0 24px",
          fontSize: 24,
          fontWeight: 700,
          color: "#fff",
          textAlign: "center",
        }}
      >
        {titleText}
      </h2>

      {/* ProbabilityInsights 组件 */}
      <ProbabilityInsights
        data={insightsData}
        visible={true}
        autoAnalyze={true}
        maxBars={6}
      />
    </div>
  </div>,
  document.body
)}

      {/* Daily Detail Modal */}
      {showDailyDetail && selectedCondition && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {/* 背景遮罩 */}
          <div
            onClick={closeDailyDetail}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(8px)",
            }}
          />

          {/* 详细卡片 */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderRadius: 20,
              padding: 32,
              maxWidth: 700,
              width: "90%",
              maxHeight: "80vh",
              overflow: "hidden",
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6)",
              border: "2px solid rgba(102, 126, 234, 0.3)",
              animation: "scaleIn 0.3s ease",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* 标题栏 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 32 }}>📅</span>
                Daily Breakdown: {selectedCondition.label}
              </h3>
              <button
                onClick={closeDailyDetail}
                style={{
                  background: "none",
                  border: "none",
                  color: "#999",
                  fontSize: 32,
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 8,
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.1)";
                  e.target.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "none";
                  e.target.style.color = "#999";
                }}
              >
                ×
              </button>
            </div>

            {/* 条件说明 */}
            <div
              style={{
                background: "rgba(102, 126, 234, 0.15)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
                border: "1px solid rgba(102, 126, 234, 0.3)",
              }}
            >
              <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)" }}>
                <strong>Condition:</strong> {selectedCondition.meta}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.7)", marginTop: 4 }}>
                Overall probability: <strong style={{ color: "#60a5fa" }}>{selectedCondition.value}%</strong>
              </div>
            </div>

            {/* 每日详情列表 */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                paddingRight: 8,
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                {dailyDetails.map((detail, index) => (
                  <div
                    key={index}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: 12,
                      padding: "16px 20px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        <div>{detail.month}</div>
                        <div style={{ fontSize: 14 }}>{detail.day}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
                          {detail.date}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)" }}>
                          {detail.count} out of {detail.total} years
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: detail.percentage >= 60 ? "#ff6b6b" : detail.percentage >= 30 ? "#ffd93d" : "#6bcf7f",
                      }}
                    >
                      {detail.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <style>
            {`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }

              @keyframes scaleIn {
                from {
                  opacity: 0;
                  transform: scale(0.9);
                }
                to {
                  opacity: 1;
                  transform: scale(1);
                }
              }
            `}
          </style>
        </div>,
        document.body
      )}
            {/* CSV Download Modal */}
            {showCSVModal && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483648,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {/* 背景遮罩 */}
          <div
            onClick={() => setShowCSVModal(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(8px)",
            }}
          />

          {/* Modal 卡片 */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderRadius: 20,
              padding: 40,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6)",
              border: "2px solid rgba(102, 126, 234, 0.3)",
              animation: "scaleIn 0.3s ease",
            }}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowCSVModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                color: "#999",
                fontSize: 32,
                cursor: "pointer",
                padding: 4,
                borderRadius: 8,
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.1)";
                e.target.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "none";
                e.target.style.color = "#999";
              }}
            >
              ×
            </button>

            {/* 标题 */}
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: 28,
                fontWeight: 700,
                color: "#fff",
                textAlign: "center",
              }}
            >
              📊 Choose CSV Format
            </h3>

            <p
              style={{
                margin: "0 0 32px",
                fontSize: 15,
                color: "rgba(255, 255, 255, 0.7)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Select the type of data you want to download
            </p>

            {/* 选项按钮 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Pro 选项 */}
              <button
                onClick={downloadProCSV}
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  border: "none",
                  borderRadius: 12,
                  padding: "20px 24px",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 8px 28px rgba(102, 126, 234, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    ⭐
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                      Pro Format
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      Statistical summary data
                    </div>
                  </div>
                </div>
              </button>

              {/* Basic 选项 */}
              <button
                onClick={downloadBasicCSV}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: 12,
                  padding: "20px 24px",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.15)";
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.3)";
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.1)";
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    📋
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                      Basic Format
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      Daily breakdown for all conditions
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


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