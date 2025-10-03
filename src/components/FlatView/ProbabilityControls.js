import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Calendar from "../Calendar";
import "../css/ProbabilityControls.css";

const ProbabilityControls = ({ selectedArea, onCalculate }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const calendarRef = useRef(null);

  const handleDateRangeChange = (range) => setDateRange(range);

  const handleCalculate = () => {
    if (!selectedArea) return alert("Please click on a location on the map or search for a place first.");
    if (!dateRange) return alert("Please select a date range first.");
    onCalculate(
      selectedArea.lat,
      selectedArea.lng,
      dateRange.startMonth,
      dateRange.startDay,
      dateRange.windowDays
    );
  };

  const formatDateRangeDisplay = useCallback(() => {
    if (!dateRange) return "Select date range";
    const startStr = dateRange.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr   = dateRange.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${startStr} - ${endStr}`;
  }, [dateRange]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false);
    };
    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [showCalendar]);

  const locationText = selectedArea
    ? `${selectedArea.name ?? "—"} (${selectedArea.lat?.toFixed(3)}, ${selectedArea.lng?.toFixed(3)})`
    : "Not selected";

  return (
    <>
      {/* 主面板（更小） */}
      <aside className={`advisor-panel simple small ${collapsed ? "is-hidden" : ""}`}>
        {!collapsed && (
          <button
            className="collapse-toggle"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse"
            title="Collapse"
          >
            ☁
          </button>
        )}

        <div className="panel-body">
          <div className="panel-title-compact">Historical Probability (NASA POWER)</div>

          {/* Location：蓝色图钉 + 第一版 chip 风格（水平居中） */}
          <div className="chip-row centered tight single">
            <span className="chip chip-location">
              <svg className="pin-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#1f8fff" d="M12 2c-3.314 0-6 2.686-6 6 0 4.418 6 12 6 12s6-7.582 6-12c0-3.314-2.686-6-6-6zm0 9a3 3 0 110-6 3 3 0 010 6z"/>
              </svg>
              <span className="chip-lab">Location:</span>
              <strong className="chip-val">{locationText}</strong>
            </span>
          </div>

          {/* 日期：平行一行，可点打开日历 */}
          <div className="date-row">
            <button
              className="date-inline"
              onClick={() => setShowCalendar(true)}
              aria-label="Select date range"
              title="Select date range"
            >
              <span className="date-text">{formatDateRangeDisplay()}</span>
              <span className="date-ico" aria-hidden>📅</span>
            </button>
          </div>

          {/* 计算按钮 */}
          <button className="primary sm simple-cta" onClick={handleCalculate}>
            Calculate Probability
          </button>
        </div>
      </aside>

      {/* 收起后：只显示底部中间的一颗云朵按钮（非透明背景） */}
      {collapsed && (
        <button
          className="advisor-peek-cloud"
          onClick={() => setCollapsed(false)}
          aria-label="Expand"
          title="Expand"
        >
          ☁
        </button>
      )}

      {/* 日历 Modal */}
      {showCalendar &&
        createPortal(
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                zIndex: 9999,
                backdropFilter: "blur(2px)",
              }}
              onClick={() => setShowCalendar(false)}
            />
            <div
              ref={calendarRef}
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 10000,
                width: "90vw",
                maxWidth: "400px",
                backgroundColor: "#1a1a1a",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
                border: "1px solid #333",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #333",
                }}
              >
                <h3 style={{ margin: 0, color: "#fff", fontSize: "18px", fontWeight: 600 }}>
                  Select Date Range
                </h3>
                <button
                  onClick={() => setShowCalendar(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#999",
                    fontSize: "24px",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                    width: "32px",
                    height: "32px",
                  }}
                  title="Close calendar"
                >
                  ×
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calendar
                  onDateRangeChange={handleDateRangeChange}
                  initialStartDate={dateRange?.startDate}
                  initialEndDate={dateRange?.endDate}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "1px solid #333",
                }}
              >
                <button onClick={() => setShowCalendar(false)} className="modal-btn ghost">
                  Cancel
                </button>
                <button
                  onClick={() => dateRange && setShowCalendar(false)}
                  className="modal-btn confirm"
                  disabled={!dateRange}
                  style={{ opacity: dateRange ? 1 : 0.5, cursor: dateRange ? "pointer" : "not-allowed" }}
                >
                  Done
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
};

export default ProbabilityControls;
