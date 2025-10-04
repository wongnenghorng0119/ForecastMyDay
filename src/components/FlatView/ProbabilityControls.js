import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Calendar from "../Calendar";
import "../css/ProbabilityControls.css";

/**
 * Props:
 * - selectedArea: { lat, lng, name? }
 * - onCalculate(lat, lng, startMonth, startDay, windowDays)
 * - hideWhenResultsOpen: boolean   // 结果面板是否打开
 * - mapMoving: boolean             // 来自 MoveSensor：地图是否处于交互中
 */
const ProbabilityControls = ({ selectedArea, onCalculate, hideWhenResultsOpen, mapMoving }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState(null);

  /** 折叠状态（完全隐藏面板本体，保留底部“云朵”入口） */
  const [collapsed, setCollapsed] = useState(false);

  /** 折叠原因：'auto' | 'manual' | null —— 手动优先 */
  const [collapseBy, setCollapseBy] = useState(null);

  /** 地图移动后是否需要自动重开（仅当本次是自动折叠时置 true） */
  const [needsReopenAfterMove, setNeedsReopenAfterMove] = useState(false);

  // 警告弹窗
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // —— Refs（持久记录，避免闭包问题）——
  const calendarRef = useRef(null);
  const reopenTimerRef = useRef(null);
  const collapseByRef = useRef(collapseBy);
  const needRef = useRef(needsReopenAfterMove);

  useEffect(() => { collapseByRef.current = collapseBy; }, [collapseBy]);
  useEffect(() => { needRef.current = needsReopenAfterMove; }, [needsReopenAfterMove]);

  // 卸载清理
  useEffect(() => {
    return () => {
      if (reopenTimerRef.current) clearTimeout(reopenTimerRef.current);
    };
  }, []);

  // —— 结果面板打开时：强制折叠（标记为 auto，除非已是 manual），并取消“需要自动重开” —— //
  useEffect(() => {
    if (hideWhenResultsOpen) {
      setCollapsed(true);
      setCollapseBy(prev => (prev === "manual" ? "manual" : "auto"));
      setNeedsReopenAfterMove(false);
    }
  }, [hideWhenResultsOpen]);

  // —— 地图驱动的折叠/恢复 —— //
  const onMapInteractStart = useCallback(() => {
    if (reopenTimerRef.current) { clearTimeout(reopenTimerRef.current); reopenTimerRef.current = null; }
    setCollapsed(true);
    setCollapseBy(prev => (prev === "manual" ? "manual" : "auto"));
    // 自动折叠 → 标记可在地图停止后自动重开
    setNeedsReopenAfterMove(prev => (collapseByRef.current === "manual" ? prev : true));
  }, []);

  const onMapInteractEnd = useCallback(() => {
    if (reopenTimerRef.current) clearTimeout(reopenTimerRef.current);
    reopenTimerRef.current = setTimeout(() => {
      setCollapsed(curr => {
        if (!curr) return curr; // 已经展开
        const canOpen = collapseByRef.current === "auto" || needRef.current === true;
        if (canOpen) {
          setCollapseBy(null);
          setNeedsReopenAfterMove(false);
          return false; // 展开
        }
        return curr; // 保持折叠（手动折叠）
      });
    }, 1000);
  }, []);

  // 用 mapMoving 的变化来触发开始/结束
  useEffect(() => {
    if (mapMoving) onMapInteractStart();
    else onMapInteractEnd();
  }, [mapMoving, onMapInteractStart, onMapInteractEnd]);

  // —— 日期逻辑 —— //
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

    // 计算时立即折叠（设为 auto，是否自动重开看你的业务，这里不强制）
    setCollapsed(true);
    setCollapseBy(prev => (prev === "manual" ? "manual" : "auto"));
    setNeedsReopenAfterMove(false);

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
    const startStr = dateRange.startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const endStr = dateRange.endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  }, [dateRange]);

  // —— 日历 Modal 外点关闭 + 锁滚动 —— //
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
      {/* 主面板 */}
      <aside className={`advisor-panel simple small ${collapsed ? "is-hidden" : ""}`}>
        {/* 顶部箭头：手动折叠/展开（手动优先） */}
        <button
          className="collapse-toggle"
          onClick={() => {
            setCollapsed(prev => {
              const next = !prev;
              if (next) {
                setCollapseBy("manual");
                setNeedsReopenAfterMove(true);
              } else {
                setCollapseBy(null);
                setNeedsReopenAfterMove(false);
              }
              return next;
            });
          }}
          aria-label={collapsed ? "Expand" : "Collapse"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "^" : "v"}
        </button>

        <div className="panel-body">
          <div className="panel-title-compact">Historical Probability (NASA POWER)</div>

          {/* Location chip */}
          <div className="chip-row centered tight single">
            <span className="chip chip-location">
              <svg className="pin-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#1f8fff"
                  d="M12 2c-3.314 0-6 2.686-6 6 0 4.418 6 12 6 12s6-7.582 6-12c0-3.314-2.686-6-6-6zm0 9a3 3 0 110-6 3 3 0 010 6z"
                />
              </svg>
              <span className="chip-lab">Location:</span>
              <strong className="chip-val">{locationText}</strong>
            </span>
          </div>

          {/* 日期选择 */}
          <div className="date-row">
            <button
              className="date-inline"
              onClick={() => setShowCalendar(true)}
              aria-label="Select date range"
              title="Select date range"
            >
              <span className="date-text">{formatDateRangeDisplay()}</span>
              <span className="date-ico" aria-hidden>
                📅
              </span>
            </button>
          </div>

          {/* 计算按钮 */}
          <button className="primary sm simple-cta" onClick={handleCalculate}>
            Calculate Probability
          </button>
        </div>
      </aside>

      {/* 折叠后：底部中间云朵按钮（完全展开 + 清理自动标记） */}
      {collapsed && (
        <button
          className="advisor-peek-cloud"
          onClick={() => {
            setCollapsed(false);
            setCollapseBy(null);
            setNeedsReopenAfterMove(false);
          }}
          aria-label="Expand"
          title="Expand"
        >
          {"^"}
        </button>
      )}

      {/* Warning Modal */}
      {showWarning &&
        createPortal(
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
                from { opacity: 0; } to { opacity: 1; }
              }
              @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
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
                  {dateRange?.startDate && dateRange?.endDate
                    ? `${dateRange.startDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })} - ${dateRange.endDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : "Select Date Range"}
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
