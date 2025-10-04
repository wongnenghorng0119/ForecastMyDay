import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Calendar from "../Calendar";
import "../css/ProbabilityControls.css";

const ProbabilityControls = ({ selectedArea, onCalculate }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const calendarRef = useRef(null);

  const handleDateRangeChange = (range) => setDateRange(range);

  const handleCalculate = () => {
    if (!selectedArea) {
      setWarningMessage("Please click on a location on the map or search for a place first.");
      setShowWarning(true);
      return;
    }
    if (!dateRange) {
      setWarningMessage("Please select a date range first.");
      setShowWarning(true);
      return;
    }
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
    const startStr = dateRange.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const endStr   = dateRange.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

      {/* Warning Modal */}
      {showWarning && createPortal(
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
            onClick={() => setShowWarning(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(6px)",
            }}
          />

          {/* 警告卡片 */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderRadius: 20,
              padding: 32,
              maxWidth: 450,
              width: "90%",
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6)",
              border: "2px solid rgba(255, 193, 7, 0.3)",
              animation: "scaleIn 0.3s ease",
            }}
          >
            {/* 警告图标 */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ffd93d 0%, #ff6b35 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 36,
                boxShadow: "0 8px 24px rgba(255, 193, 7, 0.4)",
              }}
            >
              ⚠️
            </div>

            {/* 标题 */}
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: 24,
                fontWeight: 700,
                color: "#fff",
                textAlign: "center",
                letterSpacing: "0.5px",
              }}
            >
              Action Required
            </h3>

            {/* 警告消息 */}
            <p
              style={{
                margin: "0 0 28px",
                fontSize: 16,
                color: "rgba(255, 255, 255, 0.9)",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              {warningMessage}
            </p>

            {/* 确认按钮 */}
            <button
              onClick={() => setShowWarning(false)}
              style={{
                width: "100%",
                padding: "14px 24px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.5)",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 28px rgba(102, 126, 234, 0.7)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
              }}
            >
              Got it!
            </button>
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
                {dateRange?.startDate && dateRange?.endDate ? (
                  `${dateRange.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${dateRange.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                ) : (
                  "Select Date Range"
                )}
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