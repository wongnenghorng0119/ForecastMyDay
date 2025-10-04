import React, { useState, useEffect } from "react";
import "./css/Calender.css";

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
      const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setSelectedStartDate(startDate);
    }
    if (!initialEndDate) {
      const today = new Date();
      const endDate = new Date(today.getTime() - 27 * 24 * 60 * 60 * 1000);
      setSelectedEndDate(endDate);
    }
  }, [initialStartDate, initialEndDate]);

  // Notify parent component when date range changes
  useEffect(() => {
    if (selectedStartDate && selectedEndDate) {
      const timeDiff = selectedEndDate.getTime() - selectedStartDate.getTime();
      const middleTime = selectedStartDate.getTime() + (timeDiff / 2);
      const middleDate = new Date(middleTime);
      
      const targetMonth = middleDate.getMonth() + 1;
      const targetDay = middleDate.getDate();
      
      const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      const windowDays = Math.floor(totalDays / 2);
      
      onDateRangeChange({
        startMonth: targetMonth,
        startDay: targetDay,
        endMonth: targetMonth,
        endDay: targetDay,
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
      setSelectedStartDate(date);
      setSelectedEndDate(null);
      setIsSelecting(true);
    } else if (selectedStartDate && !selectedEndDate) {
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

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    setCurrentMonth(prev => new Date(prev.getFullYear(), newMonth, 1));
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    setCurrentMonth(prev => new Date(newYear, prev.getMonth(), 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

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
      day: 'numeric',
      year: 'numeric'
    });
    const endStr = selectedEndDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${startStr} - ${endStr}`;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate year options (current year + 10 years into the future)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);

  return (
    <div className="calendar-container">
      {/* Calendar Header with Dropdowns */}
      <div className="calendar-header">
        <button 
          onClick={() => navigateMonth(-1)}
          className="nav-button"
          aria-label="Previous month"
        >
          ‹
        </button>
        
        <div className="month-year-selectors">
          <select 
            value={currentMonth.getMonth()} 
            onChange={handleMonthChange}
            className="month-selector"
            aria-label="Select month"
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          
          <select 
            value={currentMonth.getFullYear()} 
            onChange={handleYearChange}
            className="year-selector"
            aria-label="Select year"
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={() => navigateMonth(1)}
          className="nav-button"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day Names Header */}
      <div className="day-names">
        {dayNames.map(day => (
          <div key={day} className="day-name">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {renderCalendar()}
      </div>

      {/* Selected Date Range Display */}
      <div className="date-range-display">
        <div className="date-range-label">Selected Range:</div>
        <div className="date-range-value">{formatDateRange()}</div>
      </div>
    </div>
  );
};

export default Calendar;