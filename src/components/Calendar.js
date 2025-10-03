import React, { useState, useEffect } from "react";

const Calendar = ({ 
  onDateRangeChange, 
  initialStartDate, 
  initialEndDate, 
  minDate, 
  maxDate 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState(initialStartDate);
  const [selectedEndDate, setSelectedEndDate] = useState(initialEndDate);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null);

  // Set default dates if not provided
  useEffect(() => {
    if (!initialStartDate) {
      const today = new Date();
      // Set to a date in the past (e.g., 30 days ago)
      const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setSelectedStartDate(startDate);
    }
    if (!initialEndDate) {
      const today = new Date();
      // Set to a date in the past (e.g., 27 days ago, 3 days before start)
      const endDate = new Date(today.getTime() - 27 * 24 * 60 * 60 * 1000);
      setSelectedEndDate(endDate);
    }
  }, [initialStartDate, initialEndDate]);

  // Notify parent component when date range changes
  useEffect(() => {
    if (selectedStartDate && selectedEndDate) {
      // Calculate the middle date of the range
      const timeDiff = selectedEndDate.getTime() - selectedStartDate.getTime();
      const middleTime = selectedStartDate.getTime() + (timeDiff / 2);
      const middleDate = new Date(middleTime);
      
      const targetMonth = middleDate.getMonth() + 1;
      const targetDay = middleDate.getDate();
      
      // Calculate window days as half the total range (for ±windowDays)
      const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      const windowDays = Math.floor(totalDays / 2);
      
      onDateRangeChange({
        startMonth: targetMonth,
        startDay: targetDay,
        endMonth: targetMonth, // Same month as target
        endDay: targetDay,     // Same day as target
        windowDays,
        startDate: selectedStartDate,
        endDate: selectedEndDate
      });
    }
  }, [selectedStartDate, selectedEndDate, onDateRangeChange]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateInRange = (date) => {
    if (!selectedStartDate || !selectedEndDate) return false;
    return date >= selectedStartDate && date <= selectedEndDate;
  };

  const isDateSelected = (date) => {
    if (!selectedStartDate || !selectedEndDate) return false;
    return date.getTime() === selectedStartDate.getTime() || 
           date.getTime() === selectedEndDate.getTime();
  };

  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || (minDate && date < minDate) || (maxDate && date > maxDate);
  };

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // Start new selection
      setSelectedStartDate(date);
      setSelectedEndDate(null);
      setIsSelecting(true);
    } else if (selectedStartDate && !selectedEndDate) {
      // Complete selection
      if (date >= selectedStartDate) {
        setSelectedEndDate(date);
        setIsSelecting(false);
      } else {
        setSelectedStartDate(date);
        setSelectedEndDate(null);
      }
    }
  };

  const handleDateHover = (date) => {
    if (isSelecting && selectedStartDate && !selectedEndDate) {
      setHoveredDate(date);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isDisabled = isDateDisabled(date);
      const isInRange = isDateInRange(date);
      const isSelected = isDateSelected(date);
      const isHovered = hoveredDate && hoveredDate.getTime() === date.getTime();
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isDisabled ? 'disabled' : ''} ${isInRange ? 'in-range' : ''} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDateClick(date)}
          onMouseEnter={() => handleDateHover(date)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  const formatDateRange = () => {
    if (!selectedStartDate) return "Select start date";
    if (!selectedEndDate) return "Select end date";
    
    const startStr = selectedStartDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const endStr = selectedEndDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return `${startStr} - ${endStr}`;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={calendarContainerStyle}>
      {/* Calendar Header */}
      <div style={calendarHeaderStyle}>
        <button 
          onClick={() => navigateMonth(-1)}
          style={navButtonStyle}
          disabled={isDateDisabled(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <div style={monthYearStyle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button 
          onClick={() => navigateMonth(1)}
          style={navButtonStyle}
          disabled={isDateDisabled(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>

      {/* Day Names Header */}
      <div style={dayNamesStyle}>
        {dayNames.map(day => (
          <div key={day} style={dayNameStyle}>{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={calendarGridStyle}>
        {renderCalendar()}
      </div>

      {/* Selected Date Range Display */}
      <div style={dateRangeDisplayStyle}>
        <div style={dateRangeLabelStyle}>Selected Range:</div>
        <div style={dateRangeValueStyle}>{formatDateRange()}</div>
      </div>

      {/* Quick Actions */}
      <div style={quickActionsStyle}>
        <button onClick={goToToday} style={quickActionButtonStyle}>
          Today
        </button>
        <button 
          onClick={() => {
            const today = new Date();
            setSelectedStartDate(today);
            setSelectedEndDate(today);
          }} 
          style={quickActionButtonStyle}
        >
          Select Today
        </button>
      </div>

      {/* Calendar Styles */}
      <style jsx>{`
        .calendar-day {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          position: relative;
        }

        .calendar-day:hover:not(.disabled) {
          background: rgba(31, 143, 255, 0.2);
          color: #1f8fff;
        }

        .calendar-day.today {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-weight: 700;
        }

        .calendar-day.selected {
          background: #1f8fff;
          color: #fff;
          font-weight: 700;
        }

        .calendar-day.in-range {
          background: rgba(31, 143, 255, 0.3);
          color: #fff;
        }

        .calendar-day.hovered {
          background: rgba(31, 143, 255, 0.4);
          color: #fff;
        }

        .calendar-day.disabled {
          color: #666;
          cursor: not-allowed;
          opacity: 0.5;
        }

        .calendar-day.empty {
          cursor: default;
        }

        .calendar-day.empty:hover {
          background: transparent;
        }
      `}</style>
    </div>
  );
};

// Styles
const calendarContainerStyle = {
  background: "rgba(0,0,0,0.8)",
  borderRadius: "12px",
  padding: "16px",
  color: "#fff",
  fontFamily: "system-ui",
  minWidth: "280px",
  maxWidth: "320px",
  // Mobile responsive
  [`@media (max-width: 480px)`]: {
    minWidth: "260px",
    maxWidth: "280px",
    padding: "12px"
  }
};

const calendarHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "16px"
};

const navButtonStyle = {
  background: "rgba(255,255,255,0.1)",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  cursor: "pointer",
  padding: "8px 12px",
  fontSize: "16px",
  fontWeight: "bold",
  transition: "all 0.2s ease"
};

const monthYearStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#fff"
};

const dayNamesStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "4px",
  marginBottom: "8px"
};

const dayNameStyle = {
  textAlign: "center",
  fontSize: "12px",
  fontWeight: "600",
  color: "#9ca3af",
  padding: "4px 0"
};

const calendarGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "4px",
  marginBottom: "16px"
};

const dateRangeDisplayStyle = {
  background: "rgba(255,255,255,0.05)",
  borderRadius: "8px",
  padding: "12px",
  marginBottom: "12px",
  border: "1px solid rgba(255,255,255,0.1)"
};

const dateRangeLabelStyle = {
  fontSize: "12px",
  color: "#9ca3af",
  marginBottom: "4px"
};

const dateRangeValueStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#fff"
};

const quickActionsStyle = {
  display: "flex",
  gap: "8px",
  justifyContent: "center"
};

const quickActionButtonStyle = {
  background: "rgba(31, 143, 255, 0.2)",
  border: "1px solid rgba(31, 143, 255, 0.3)",
  borderRadius: "6px",
  color: "#1f8fff",
  cursor: "pointer",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: "500",
  transition: "all 0.2s ease"
};

export default Calendar;
