// src/components/AnalysisLoading.js（无需改动，贴完整方便你对齐）
import React, { useState, useEffect } from 'react';
import './css/AnalysisLoading.css';

const AnalysisLoading = ({ show = true }) => {
  const [currentIconIndex, setCurrentIconIndex] = useState(0);
  const [iconState, setIconState] = useState('active');

  const weatherIcons = [
    { icon: '☀️', name: 'sun' },
    { icon: '⛅', name: 'partly-cloudy' },
    { icon: '☁️', name: 'cloudy' },
    { icon: '🌧️', name: 'rainy' },
    { icon: '⛈️', name: 'stormy' },
    { icon: '🌨️', name: 'snowy' },
    { icon: '🌪️', name: 'tornado' },
    { icon: '🌫️', name: 'foggy' }
  ];

  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => {
      setIconState('exiting');
      setTimeout(() => {
        setCurrentIconIndex((prev) => (prev + 1) % weatherIcons.length);
        setIconState('active');
      }, 600);
    }, 2400);
    return () => clearInterval(interval);
  }, [show, weatherIcons.length]);

  if (!show) return null;

  return (
    <div className="analysis-loading-overlay">
      <div className="analysis-tablet">
        <div className="corner-decor top-left"></div>
        <div className="corner-decor top-right"></div>
        <div className="corner-decor bottom-left"></div>
        <div className="corner-decor bottom-right"></div>

        <div className="tablet-screen">
          <div className="weather-icon-container">
            <div className={`weather-icon ${iconState}`}>
              {weatherIcons[currentIconIndex].icon}
            </div>
          </div>

          <div className="analysis-text">Analyzing...</div>

          <div className="progress-container">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisLoading;
