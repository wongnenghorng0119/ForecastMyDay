import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Calendar from "../Calendar";
import "../css/ProbabilityControls.css";

/**
 * Props:
 * - selectedArea: { lat, lng, name? }
 * - onCalculate(lat, lng, startMonth, startDay, windowDays)
 * - hideWhenResultsOpen: boolean
 * - mapMoving: boolean
 */
const ProbabilityControls = ({ selectedArea, onCalculate, hideWhenResultsOpen, mapMoving }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [collapseBy, setCollapseBy] = useState(null);
  const [needsReopenAfterMove, setNeedsReopenAfterMove] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const calendarRef = useRef(null);
  const reopenTimerRef = useRef(null);
  const collapseByRef = useRef(collapseBy);
  const needRef = useRef(needsReopenAfterMove);

  useEffect(() => { collapseByRef.current = collapseBy; }, [collapseBy]);
  useEffect(() => { needRef.current = needsReopenAfterMove; }, [needsReopenAfterMove]);

  useEffect(() => {
    return () => {
      if (reopenTimerRef.current) clearTimeout(reopenTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (hideWhenResultsOpen) {
      setCollapsed(true);
      setCollapseBy(prev => (prev === "manual" ? "manual" : "auto"));
      setNeedsReopenAfterMove(false);
    }
  }, [hideWhenResultsOpen]);

  const onMapInteractStart = useCallback(() => {
    if (reopenTimerRef.current) { 
      clearTimeout(reopenTimerRef.current); 
      reopenTimerRef.current = null; 
    }
    setCollapsed(true);
    setCollapseBy(prev => (prev === "manual" ? "manual" : "auto"));
    setNeedsReopenAfterMove(prev => (collapseByRef.current === "manual" ? prev : true));
  }, []);

  const onMapInteractEnd = useCallback(() => {
    if (reopenTimerRef.current) clearTimeout(reopenTimerRef.current);
    reopenTimerRef.current = setTimeout(() => {
      setCollapsed(curr => {
        if (!curr) return curr;
        const canOpen = collapseByRef.current === "auto" || needRef.current === true;
        if (canOpen) {
          setCollapseBy(null);
          setNeedsReopenAfterMove(false);
          return false;
        }
        return curr;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (mapMoving) onMapInteractStart();
    else onMapInteractEnd();
  }, [mapMoving, onMapInteractStart, onMapInteractEnd]);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
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
      {/* Main Panel */}
      <div className={`quantum-panel ${collapsed ? 'collapsed' : ''}`}>
        <div className="quantum-container">
          <div className="scan-line" />
          
          {/* Corner Accents */}
          <div className="corner-accent tl" />
          <div className="corner-accent tr" />
          <div className="corner-accent bl" />
          <div className="corner-accent br" />

          {/* Collapse Button */}
          <button
            className="collapse-btn"
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
          >
            {collapsed ? "" : "v"}
          </button>

          {/* Title */}
          <div className="panel-title">
            Historical Probability
          </div>

          {/* Location Display */}
          <div className="location-display">
            <div className="location-label">
              <svg className="pin-icon" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2c-3.314 0-6 2.686-6 6 0 4.418 6 12 6 12s6-7.582 6-12c0-3.314-2.686-6-6-6zm0 9a3 3 0 110-6 3 3 0 010 6z"
                  fill="url(#pinGradient)"
                />
                <defs>
                  <linearGradient id="pinGradient" x1="6" y1="2" x2="18" y2="20">
                    <stop offset="0%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#1f8fff" />
                  </linearGradient>
                </defs>
              </svg>
              Location Coordinates
            </div>
            <div className="location-value">{locationText}</div>
          </div>

          {/* Date Selector */}
          <div className="date-selector">
            <button
              className="date-btn"
              onClick={() => setShowCalendar(true)}
              aria-label="Select date range"
            >
              <span>{formatDateRangeDisplay()}</span>
              <span className="date-icon">📅</span>
            </button>
          </div>

          {/* Calculate Button */}
          <button className="calculate-btn" onClick={handleCalculate}>
            Calculate Probability
          </button>
        </div>
      </div>

      {/* Expand Orb */}
      {collapsed && (
        <button
          className="expand-orb"
          onClick={() => {
            setCollapsed(false);
            setCollapseBy(null);
            setNeedsReopenAfterMove(false);
          }}
          aria-label="Expand"
        >
          ↑
        </button>
      )}

      {/* Warning Modal */}
      {showWarning &&
        createPortal(
          <div className="warning-overlay">
            <div className="warning-backdrop" onClick={() => setShowWarning(false)} />
            <div className="warning-card">
              <div className="warning-icon">⚠️</div>
              <h3 className="warning-title">Action Required</h3>
              <p className="warning-message">{warningMessage}</p>
              <button className="warning-btn" onClick={() => setShowWarning(false)}>
                Got it!
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Calendar Modal */}
      {showCalendar &&
        createPortal(
          <>
            <div className="calendar-backdrop" onClick={() => setShowCalendar(false)} />
            <div ref={calendarRef} className="calendar-modal">
              <div className="calendar-header">
                <h3 className="calendar-title">
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
                  className="calendar-close"
                  title="Close calendar"
                >
                  ×
                </button>
              </div>

              <div className="calendar-body">
                <Calendar
                  onDateRangeChange={handleDateRangeChange}
                  initialStartDate={dateRange?.startDate}
                  initialEndDate={dateRange?.endDate}
                />
              </div>

              <div className="calendar-footer">
                <button onClick={() => setShowCalendar(false)} className="calendar-btn cancel">
                  Cancel
                </button>
                <button
                  onClick={() => dateRange && setShowCalendar(false)}
                  className="calendar-btn confirm"
                  disabled={!dateRange}
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