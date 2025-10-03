import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { btn, responsivePanel, responsiveFlex } from "../../utils/styles";
import Calendar from "../Calendar";

const ProbabilityControls = ({
  selectedArea,
  onCalculate,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const calendarRef = useRef(null);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const handleCalculate = () => {
    if (!selectedArea) {
      return alert("Please click on a location on the map or search for a place first.");
    }
    if (!dateRange) {
      return alert("Please select a date range first.");
    }
    
    // Convert calendar dates to the format the original function expects
    const month = dateRange.startMonth;
    const day = dateRange.startDay;
    const windowDays = dateRange.windowDays;
    
    onCalculate(
      selectedArea.lat,
      selectedArea.lng,
      month,
      day,
      windowDays
    );
  };

  const formatDateRangeDisplay = () => {
    if (!dateRange) return "Select date range";
    const startStr = dateRange.startDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const endStr = dateRange.endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const targetStr = `${dateRange.startMonth}/${dateRange.startDay}`;
    return `${startStr} - ${endStr}`;
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [showCalendar]);

  return (
    <div
      ref={calendarRef}
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        // Mobile responsive
        [`@media (max-width: 768px)`]: {
          left: 8,
          bottom: 8
        },
        [`@media (max-width: 480px)`]: {
          left: 4,
          bottom: 4
        }
      }}
    >
      <div
        style={{
          ...responsivePanel("relative"),
          minWidth: 280,
          // Mobile responsive
          [`@media (max-width: 768px)`]: {
            minWidth: 260,
            maxWidth: "calc(100vw - 16px)"
          },
          [`@media (max-width: 480px)`]: {
            minWidth: "calc(100vw - 8px)",
            maxWidth: "calc(100vw - 8px)",
            boxSizing: "border-box"
          }
        }}
      >
      <div style={{ 
        fontWeight: 600, 
        marginBottom: 12,
        fontSize: "14px",
        // Mobile responsive
        [`@media (max-width: 480px)`]: {
          fontSize: "12px",
          marginBottom: 10
        }
      }}>
        Historical Probability (NASA POWER)
      </div>

      {/* Date Range Selection */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ 
          fontSize: "12px", 
          color: "#9ca3af", 
          marginBottom: "6px",
          fontWeight: "500"
        }}>
          Select Date Range:
        </div>
        
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          style={{
            ...btn("#1f8fff"),
            width: "100%",
            justifyContent: "center",
            padding: "10px 12px",
            fontSize: "13px",
            background: showCalendar ? "#1f8fff" : "rgba(31, 143, 255, 0.2)",
            border: "1px solid rgba(31, 143, 255, 0.3)",
            color: showCalendar ? "#fff" : "#1f8fff"
          }}
        >
          <span>{formatDateRangeDisplay()}</span>
          <span style={{ fontSize: "16px" }}>
            {showCalendar ? "▼" : "📅"}
          </span>
        </button>

        {/* Calendar Modal */}
        {showCalendar && createPortal(
          <>
            {/* Backdrop */}
            <div 
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                zIndex: 9999,
                backdropFilter: "blur(2px)"
              }}
              onClick={() => setShowCalendar(false)}
            />
            {/* Calendar Modal */}
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
                [`@media (max-width: 768px)`]: {
                  width: "95vw",
                  maxWidth: "350px",
                  padding: "16px"
                }
              }}
            >
              {/* Modal Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                paddingBottom: "12px",
                borderBottom: "1px solid #333"
              }}>
                <h3 style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: "600"
                }}>
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#333";
                    e.target.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#999";
                  }}
                  title="Close calendar"
                >
                  ×
                </button>
              </div>
              
              {/* Calendar Component */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Calendar
                  onDateRangeChange={handleDateRangeChange}
                  initialStartDate={dateRange?.startDate}
                  initialEndDate={dateRange?.endDate}
                />
              </div>
              
              {/* Modal Footer */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "1px solid #333"
              }}>
                <button
                  onClick={() => setShowCalendar(false)}
                  style={{
                    ...btn("#666"),
                    padding: "8px 16px",
                    fontSize: "14px"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (dateRange) {
                      setShowCalendar(false);
                    }
                  }}
                  style={{
                    ...btn("#1f8fff"),
                    padding: "8px 16px",
                    fontSize: "14px",
                    opacity: dateRange ? 1 : 0.5,
                    cursor: dateRange ? "pointer" : "not-allowed"
                  }}
                  disabled={!dateRange}
                >
                  Done
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        style={{
          ...btn("#1f8fff"),
          width: "100%",
          marginBottom: "12px",
          padding: "10px 12px",
          fontSize: "13px",
          fontWeight: "600"
        }}
      >
        Calculate Probability
      </button>

      {/* Location Display */}
      <div style={{ 
        marginTop: 10, 
        opacity: 0.85, 
        fontSize: 12,
        wordBreak: "break-word",
        padding: "8px 12px",
        background: "rgba(255,255,255,0.05)",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.1)",
        // Mobile responsive
        [`@media (max-width: 480px)`]: {
          fontSize: "10px",
          marginTop: 8,
          padding: "6px 8px"
        }
      }}>
        <div style={{ fontWeight: "600", marginBottom: "4px" }}>Location:</div>
        {selectedArea
          ? `${selectedArea.name} (${selectedArea.lat?.toFixed(3)}, ${selectedArea.lng?.toFixed(3)})`
          : "Not selected"}
      </div>
      </div>
    </div>
  );
};

export default ProbabilityControls;