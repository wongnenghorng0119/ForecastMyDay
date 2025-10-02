// src/components/VoiceInputButton.js
import React, { useEffect } from "react";
import { useSpeechToText } from "../hooks/useSpeechToText";

const VoiceInputButton = ({ onTranscript, disabled }) => {
  const {
    isRecording,
    isProcessing,
    error,
    transcript,
    startRecording,
    stopRecording,
    reset,
  } = useSpeechToText();

  // 当转录完成时，调用回调
  useEffect(() => {
    if (transcript && !isProcessing) {
      onTranscript(transcript);
      // 延迟重置，让用户看到结果
      setTimeout(reset, 1000);
    }
  }, [transcript, isProcessing, onTranscript, reset]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={handleClick}
        disabled={disabled || isProcessing}
        style={{
          ...btn(isRecording ? "#ff4444" : "#1f8fff"),
          position: "relative",
          overflow: "hidden",
          minWidth: 40,
          minHeight: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
          transform: isRecording ? "scale(1.1)" : "scale(1)",
          boxShadow: isRecording
            ? "0 0 20px rgba(255, 68, 68, 0.6)"
            : "0 0 10px rgba(31, 143, 255, 0.3)",
        }}
        title={isRecording ? "Stop recording" : "Start voice input"}
      >
        {isProcessing ? (
          <Spinner />
        ) : isRecording ? (
          <StopIcon />
        ) : (
          <MicIcon />
        )}
        
        {isRecording && <PulseAnimation />}
      </button>

      {/* 状态提示 */}
      {(isRecording || isProcessing || error) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 8,
            padding: "6px 12px",
            borderRadius: 8,
            background: error
              ? "rgba(255, 68, 68, 0.9)"
              : "rgba(31, 143, 255, 0.9)",
            color: "#fff",
            fontSize: 12,
            whiteSpace: "nowrap",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            animation: "slideDown 0.3s ease",
          }}
        >
          {error
            ? `❌ ${error}`
            : isProcessing
            ? "🔄 Processing..."
            : "🎤 Recording..."}
        </div>
      )}

      {/* 转录结果预览 */}
      {transcript && !isProcessing && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 8,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(34, 197, 94, 0.9)",
            color: "#fff",
            fontSize: 12,
            maxWidth: 300,
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            animation: "slideDown 0.3s ease",
          }}
        >
          ✅ "{transcript}"
        </div>
      )}

      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
          
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};

// 麦克风图标
const MicIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

// 停止图标
const StopIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

// 加载动画
const Spinner = () => (
  <div
    style={{
      width: 18,
      height: 18,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTop: "2px solid #fff",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }}
  />
);

// 脉冲动画
const PulseAnimation = () => (
  <div
    style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "100%",
      height: "100%",
      borderRadius: 8,
      background: "rgba(255, 68, 68, 0.4)",
      animation: "pulse 1.5s ease-out infinite",
      pointerEvents: "none",
    }}
  />
);

const btn = (bg) => ({
  padding: "6px 10px",
  borderRadius: 8,
  border: 0,
  cursor: "pointer",
  background: bg,
  color: "#fff",
});

export default VoiceInputButton;