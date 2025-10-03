import React, { useState, useEffect, useRef } from "react";
import { btn, responsivePanel, responsiveFlex } from "../../utils/styles";
import Calendar from "../Calendar";

const ProbabilityControls = ({
  selectedArea,
  onCalculate,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [calendarPosition, setCalendarPosition] = useState("right");
  const calendarRef = useRef(null);
  const controlsRef = useRef(null);

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

  // Close calendar when clicking outside and determine position
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    const determineCalendarPosition = () => {
      if (controlsRef.current) {
        const rect = controlsRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const calendarWidth = 320; // Approximate calendar width
        
        // If there's not enough space on the right, show on the left
        if (rect.right + calendarWidth + 20 > viewportWidth) {
          setCalendarPosition("left");
        } else {
          setCalendarPosition("right");
        }
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      determineCalendarPosition();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
        ref={controlsRef}
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

        {/* Calendar Dropdown */}
        {showCalendar && (
          <div style={{
            position: "absolute",
            top: "0",
            [calendarPosition === "right" ? "left" : "right"]: "100%",
            zIndex: 1000,
            [calendarPosition === "right" ? "marginLeft" : "marginRight"]: "12px",
            // Ensure calendar doesn't go off-screen
            maxWidth: "320px",
            // Mobile responsive
            [`@media (max-width: 768px)`]: {
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90vw",
              maxWidth: "320px",
              marginLeft: "0",
              marginRight: "0"
            }
          }}>
            <Calendar
              onDateRangeChange={handleDateRangeChange}
              initialStartDate={dateRange?.startDate}
              initialEndDate={dateRange?.endDate}
            />
          </div>
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