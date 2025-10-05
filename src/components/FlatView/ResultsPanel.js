// src/components/FlatView/ResultsPanel.js
import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import "../css/ResultsPanel.css";
import AnalysisLoading from "../AnalysisLoading";
import ProbabilityInsights from "../ProbabilityInsights";
import ExcelJS from "exceljs";

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
  const [animatedValues, setAnimatedValues] = useState({});
  const animationFrameRefs = useRef({});

  const cards = useMemo(() => {
    if (!stats) return [];
    const mk = (key, label, block, meta) => ({
      key,
      label,
      value: Math.round(block?.pct ?? 0),
      severity:
        (block?.pct ?? 0) >= 60
          ? "high"
          : (block?.pct ?? 0) >= 30
          ? "medium"
          : "low",
      meta,
    });
    return [
      mk("veryHot", "Very Hot", stats?.veryHot, "T ≥ 32°C"),
      mk("veryCold", "Very Cold", stats?.veryCold, "T ≤ 0°C"),
      mk("veryWindy", "Very Windy", stats?.veryWindy, "WS ≥ 10 m/s"),
      mk("veryWet", "Very Wet", stats?.veryWet, "Precip ≥ 10 mm"),
      mk(
        "veryUncomfortable",
        "Very Uncomfortable",
        stats?.veryUncomfortable,
        "T ≥ 32°C & RH ≥ 60%"
      ),
    ];
  }, [stats]);

  // Animated counter effect
  useEffect(() => {
    if (!stats || !cards.length) return;
    cards.forEach((card, index) => {
      const targetValue = card.value;
      const duration = 1500;
      const startTime = Date.now() + index * 100;
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(targetValue * easeProgress);
        setAnimatedValues((prev) => ({
          ...prev,
          [card.key]: currentValue,
        }));
        if (progress < 1) {
          animationFrameRefs.current[card.key] = requestAnimationFrame(animate);
        }
      };
      setTimeout(() => {
        animationFrameRefs.current[card.key] = requestAnimationFrame(animate);
      }, index * 100);
    });
    return () => {
      Object.values(animationFrameRefs.current).forEach((id) => {
        if (id) cancelAnimationFrame(id);
      });
    };
  }, [cards, stats]);

  const insightsData = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Very Hot", value: Number(stats?.veryHot?.pct ?? 0) },
      { label: "Very Cold", value: Number(stats?.veryCold?.pct ?? 0) },
      { label: "Very Windy", value: Number(stats?.veryWindy?.pct ?? 0) },
      { label: "Very Wet", value: Number(stats?.veryWet?.pct ?? 0) },
      {
        label: "Very Uncomfortable",
        value: Number(stats?.veryUncomfortable?.pct ?? 0),
      },
    ];
  }, [stats]);

  const dailyDetails = useMemo(() => {
    if (!stats || !selectedCondition) return [];

    const sample = stats.sample || [];
    const thresholds = {
      veryHot: (r) => r.T2M != null && r.T2M > 32,
      veryCold: (r) => r.T2M != null && r.T2M < 0,
      veryWet: (r) => r.PRECTOTCORR != null && r.PRECTOTCORR >= 10,
      veryWindy: (r) => r.WS2M != null && r.WS2M >= 10,
      veryUncomfortable: (r) =>
        r.T2M != null && r.RH2M != null && r.T2M >= 32 && r.RH2M >= 60,
    };

    const checkCondition = thresholds[selectedCondition.key];
    if (!checkCondition) return [];

    const byDate = {};
    sample.forEach((row) => {
      const dateStr = row.date;
      const m = parseInt(dateStr.slice(4, 6), 10);
      const d = parseInt(dateStr.slice(6, 8), 10);
      const key = `${m}/${d}`;

      if (!byDate[key]) {
        byDate[key] = { month: m, day: d, total: 0, count: 0 };
      }

      byDate[key].total++;
      if (checkCondition(row)) {
        byDate[key].count++;
      }
    });

    return Object.entries(byDate)
      .map(([dateKey, data]) => ({
        date: dateKey,
        month: data.month,
        day: data.day,
        count: data.count,
        total: data.total,
        percentage: Math.round((data.count / data.total) * 100),
      }))
      .sort((a, b) =>
        a.month !== b.month ? a.month - b.month : a.day - b.day
      );
  }, [stats, selectedCondition]);

  const generateAllDailyDetails = useCallback(() => {
    if (!stats) return [];

    const sample = stats.sample || [];
    const conditions = [
      {
        key: "veryHot",
        label: "Very Hot",
        meta: "T ≥ 32°C",
        check: (r) => r.T2M != null && r.T2M > 32,
      },
      {
        key: "veryCold",
        label: "Very Cold",
        meta: "T ≤ 0°C",
        check: (r) => r.T2M != null && r.T2M < 0,
      },
      {
        key: "veryWet",
        label: "Very Wet",
        meta: "Precip ≥ 10 mm",
        check: (r) => r.PRECTOTCORR != null && r.PRECTOTCORR >= 10,
      },
      {
        key: "veryWindy",
        label: "Very Windy",
        meta: "WS ≥ 10 m/s",
        check: (r) => r.WS2M != null && r.WS2M >= 10,
      },
      {
        key: "veryUncomfortable",
        label: "Very Uncomfortable",
        meta: "T ≥ 32°C & RH ≥ 60%",
        check: (r) =>
          r.T2M != null && r.RH2M != null && r.T2M >= 32 && r.RH2M >= 60,
      },
    ];

    const byDate = {};
    sample.forEach((row) => {
      const dateStr = row.date;
      const m = parseInt(dateStr.slice(4, 6), 10);
      const d = parseInt(dateStr.slice(6, 8), 10);
      const key = `${m}/${d}`;

      if (!byDate[key]) {
        byDate[key] = {
          month: m,
          day: d,
          total: 0,
          veryHot: 0,
          veryCold: 0,
          veryWet: 0,
          veryWindy: 0,
          veryUncomfortable: 0,
        };
      }

      byDate[key].total++;
      conditions.forEach((cond) => {
        if (cond.check(row)) {
          byDate[key][cond.key]++;
        }
      });
    });

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
        veryUncomfortable: Math.round(
          (data.veryUncomfortable / data.total) * 100
        ),
      }))
      .sort((a, b) =>
        a.month !== b.month ? a.month - b.month : a.day - b.day
      );
  }, [stats]);

  const downloadBasicExcel = async () => {
    const details = generateAllDailyDetails();
    if (details.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Weather Analysis");

    worksheet.mergeCells("A1:C1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `Weather Probability Analysis - ${
      selectedArea?.name || "Location"
    }`;
    titleCell.font = { size: 16, bold: true, color: { argb: "FF1F4788" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE7F3FF" },
    };
    worksheet.getRow(1).height = 30;

    worksheet.addRow([]);

    const summaryData = [
      [
        "Very Hot",
        Math.round(details.reduce((sum, d) => sum + d.veryHot, 0) / details.length),
      ],
      [
        "Very Cold",
        Math.round(details.reduce((sum, d) => sum + d.veryCold, 0) / details.length),
      ],
      [
        "Very Wet",
        Math.round(details.reduce((sum, d) => sum + d.veryWet, 0) / details.length),
      ],
      [
        "Very Windy",
        Math.round(details.reduce((sum, d) => sum + d.veryWindy, 0) / details.length),
      ],
      [
        "Very Uncomfortable",
        Math.round(
          details.reduce((sum, d) => sum + d.veryUncomfortable, 0) /
            details.length
        ),
      ],
    ];

    const chartHeaderRow = worksheet.addRow([
      "Weather Condition",
      "Probability (%)",
      "Visual Chart",
    ]);
    chartHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    chartHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    chartHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
    chartHeaderRow.height = 25;

    summaryData.forEach((data) => {
      const row = worksheet.addRow(data);
      row.alignment = { horizontal: "center", vertical: "middle" };

      const percentValue = data[1];
      let color = "FF92D050";
      if (percentValue >= 60) color = "FFFF6B6B";
      else if (percentValue >= 30) color = "FFFFD93D";

      row.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: color },
      };
      row.getCell(2).font = { bold: true, size: 14 };

      const barLength = Math.round((percentValue / 100) * 40);
      row.getCell(3).value =
        "█".repeat(Math.max(1, barLength)) + ` ${percentValue}%`;
      row.getCell(3).font = { size: 11, color: { argb: "FF4472C4" } };
      row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
      row.height = 22;
    });

    worksheet.getColumn(1).width = 25;
    worksheet.getColumn(2).width = 18;
    worksheet.getColumn(3).width = 60;

    worksheet.addRow([]);
    worksheet.addRow([]);

    const instructionRow = worksheet.addRow([
      "📊 To create a bar chart: Select cells A3:B8 → Insert Tab → Column/Bar Chart",
    ]);
    worksheet.mergeCells(`A${instructionRow.number}:C${instructionRow.number}`);
    instructionRow.getCell(1).font = {
      size: 12,
      bold: true,
      color: { argb: "FF666666" },
    };
    instructionRow.getCell(1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    instructionRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF4CC" },
    };

    worksheet.addRow([]);
    worksheet.addRow([]);

    const detailTitleRow = worksheet.addRow(["Daily Breakdown Data"]);
    worksheet.mergeCells(`A${detailTitleRow.number}:H${detailTitleRow.number}`);
    detailTitleRow.getCell(1).font = {
      size: 14,
      bold: true,
      color: { argb: "FF1F4788" },
    };
    detailTitleRow.getCell(1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    detailTitleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE7F3FF" },
    };
    detailTitleRow.height = 25;

    const headers = [
      "Date",
      "Month",
      "Day",
      "Very Hot (%)",
      "Very Cold (%)",
      "Very Wet (%)",
      "Very Windy (%)",
      "Very Uncomfortable (%)",
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 20;

    details.forEach((d) => {
      const row = worksheet.addRow([
        d.date,
        d.month,
        d.day,
        d.veryHot,
        d.veryCold,
        d.veryWet,
        d.veryWindy,
        d.veryUncomfortable,
      ]);
      row.alignment = { horizontal: "center", vertical: "middle" };
    });

    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 15;
    worksheet.getColumn(7).width = 15;
    worksheet.getColumn(8).width = 22;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `weather_analysis_${(selectedArea?.name || "location")
      .replace(/\s+/g, "_")
      .toLowerCase()}_${month}_${day}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    setShowCSVModal(false);
  };

  const downloadProCSV = () => {
    if (!csvURL) return;
    const link = document.createElement("a");
    link.href = csvURL;
    link.download = `nasa_power_prob_${(selectedArea?.name || "location")
      .replace(/\s+/g, "_")
      .toLowerCase()}_${month}_${day}_pm${windowDays}.csv`;
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
      ? `${selectedArea.name ?? "Location"} (${selectedArea.lat?.toFixed(
          3
        )}, ${selectedArea.lng?.toFixed(3)})`
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

  const formatDate = (m, d) => {
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    return `${monthNames[m - 1]} ${d}`;
  };

  return (
    <>
      <AnalysisLoading show={!!loadingStats} />

      <aside
        className={`insight-panel mini right ${open ? "" : "is-collapsed"}`}
      >
        <div className="insight-hdr">
          <button
            className="icon-btn insight-toggle"
            onClick={onToggle}
            aria-label={open ? "Collapse" : "Expand"}
            title={open ? "Collapse" : "Expand"}
          >
            {">"}
          </button>

          <button
            className="icon-btn graph-toggle"
            type="button"
            onClick={() => setShowInsights(true)}
            aria-label="Open Probability Insights"
            title="Open Probability Insights"
          >
            <span style={{ fontSize: "16px" }}>📈</span>
            <span>Analysis & Recommended Activities</span>
          </button>
        </div>

        <div className="insight-body">
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
                    title="Click to see daily details"
                  >
                    <div className="gauge tiny" style={{ "--p": c.value }}>
                      <div className="gauge-val tiny">
                        {animatedValues[c.key] ?? 0}%
                      </div>
                    </div>
                    <div className="kpi-text mini">
                      <div
                        className="lab-short"
                        title={shortName(c.key, c.label)}
                      >
                        {shortName(c.key, c.label)}
                      </div>
                      <div className="meta white" title={c.meta}>
                        {c.meta}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="insight-hint">
              Select a date in the bottom left and click "Calculate Probability"
            </div>
          )}
        </div>

        <div className="insight-footer">
          {stats && (
            <div className="footnote footnote-left mini">
              <div className="line1 justify">
                Sample: {stats.sampleCount} days ({month}/{day} ± {windowDays}{" "}
                days, 1995—present, daily values)
              </div>
              <div className="line2 justify">
                {selectedArea
                  ? `${selectedArea.name ?? "Location"} (${
                      selectedArea.lat?.toFixed(3)
                    }, ${selectedArea.lng?.toFixed(3)})`
                  : "No location selected"}
              </div>
            </div>
          )}
          {csvURL ? (
            <button
              className="csv-btn mini"
              onClick={() => setShowCSVModal(true)}
              aria-label="Download CSV"
              title="Download CSV"
            >
              Download Weather Probability Analysis
            </button>
          ) : null}
        </div>
      </aside>

      {!open && (
        <button
          className="insight-tab mini right dark"
          onClick={onToggle}
          aria-label="Expand stats"
          title="Expand stats"
        >
          {"<"}
        </button>
      )}

      {showDailyDetail &&
        selectedCondition &&
        createPortal(
          <div
            className="insight-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Daily Breakdown: ${selectedCondition.label}`}
          >
            <div
              className="insight-modal__backdrop"
              onClick={closeDailyDetail}
            />
            <div
              className="insight-modal__panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="insight-modal__hdr">
                <div className="insight-modal__title">
                  📅 Daily Breakdown: {selectedCondition.label}
                </div>
                <button
                  className="icon-btn modal-close"
                  onClick={closeDailyDetail}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="insight-modal__body">
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
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(255, 255, 255, 0.7)",
                      marginTop: 4,
                    }}
                  >
                    Overall probability:{" "}
                    <strong style={{ color: "#60a5fa" }}>
                      {selectedCondition.value}%
                    </strong>
                  </div>
                </div>

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
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#fff",
                            padding: 4,
                          }}
                        >
                          <div style={{ fontSize: 13, opacity: 0.9 }}>
                            {
                              [
                                "JAN",
                                "FEB",
                                "MAR",
                                "APR",
                                "MAY",
                                "JUN",
                                "JUL",
                                "AUG",
                                "SEP",
                                "OCT",
                                "NOV",
                                "DEC",
                              ][detail.month - 1]
                            }
                          </div>
                          <div style={{ fontSize: 16, marginTop: 2 }}>
                            {String(detail.day).padStart(2, "0")}
                          </div>
                        </div>
                        <div>
                          <div
                            style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}
                          >
                            {formatDate(detail.month, detail.day)}
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              color: "rgba(255, 255, 255, 0.6)",
                            }}
                          >
                            {detail.count} out of {detail.total} years
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          color:
                            detail.percentage >= 60
                              ? "#ff6b6b"
                              : detail.percentage >= 30
                              ? "#ffd93d"
                              : "#6bcf7f",
                        }}
                      >
                        {detail.percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showCSVModal &&
        createPortal(
          <div
            className="insight-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose CSV Format"
          >
            <div
              className="insight-modal__backdrop"
              onClick={() => setShowCSVModal(false)}
            />
            <div
              className="insight-modal__panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="insight-modal__hdr">
                <div className="insight-modal__title">📊 Choose CSV Format</div>
                <button
                  className="icon-btn modal-close"
                  onClick={() => setShowCSVModal(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="insight-modal__body">
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: 15,
                    color: "rgba(255, 255, 255, 0.8)",
                    textAlign: "center",
                  }}
                >
                  Select the type of data you want to download
                </p>

                <div style={{ display: "grid", gap: 16 }}>
                  <button
                    onClick={downloadProCSV}
                    className="icon-btn graph-toggle"
                    style={{
                      justifyContent: "flex-start",
                      padding: "16px 18px",
                      height: "auto",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>⭐</span>
                    <span style={{ fontWeight: 800 }}>Pro Format</span>
                    <span style={{ marginLeft: 8, opacity: 0.9, fontSize: 13 }}>
                      Statistical summary data
                    </span>
                  </button>

                  <button
                    onClick={downloadBasicExcel}
                    className="icon-btn graph-toggle"
                    style={{
                      justifyContent: "flex-start",
                      padding: "16px 18px",
                      height: "auto",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>📊</span>
                    <span style={{ fontWeight: 800 }}>Basic Format (Excel)</span>
                    <span style={{ marginLeft: 8, opacity: 0.9, fontSize: 13 }}>
                      Daily breakdown + Summary chart
                    </span>
                  </button>
                </div>
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
        <div
          className="insight-modal__panel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="insight-modal__hdr">
            <div className="insight-modal__title">{titleText}</div>
            <button
              className="icon-btn modal-close"
              onClick={closeInsights}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="insight-modal__body">
            <ProbabilityInsights
              data={insightsData}
              title="Probability Insights"
              visible={showInsights}
              autoAnalyze={true}
              maxBars={8}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ResultsPanel;
