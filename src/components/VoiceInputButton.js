// src/components/VoiceInputButton.js
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingLocation, setPendingLocation] = useState("");

  // 当转录完成时，显示确认对话框
  useEffect(() => {
    if (transcript && !isProcessing) {
      setPendingLocation(transcript);
      setShowConfirmation(true);
    }
  }, [transcript, isProcessing]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleConfirm = () => {
    onTranscript(pendingLocation);
    setShowConfirmation(false);
    setPendingLocation("");
    reset();
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPendingLocation("");
    reset();
  };

  return (
    <>
      <div style={{ 
        position: "relative", 
        display: "flex", 
        alignItems: "center", 
        gap: 8,
      }}>
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
        {(isRecording || isProcessing || error) && !showConfirmation && (
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
              zIndex: 1000,
            }}
          >
            {error
              ? `❌ ${error}`
              : isProcessing
              ? "🔄 Processing..."
              : "🎤 Recording..."}
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
                transform: translate(-50%, -50%) scale(0.9);
              }
              to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
              }
            }
          `}
        </style>
      </div>

      {/* 确认对话框 - 使用 createPortal */}
      {showConfirmation && createPortal(
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
            onClick={handleCancel}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(6px)",
            }}
          />

          {/* 确认卡片 */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderRadius: 20,
              padding: 32,
              maxWidth: 450,
              width: "90%",
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6)",
              border: "2px solid rgba(102, 126, 234, 0.3)",
              animation: "scaleIn 0.3s ease",
            }}
          >
            {/* 探索图标 */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 36,
                boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)",
              }}
            >
              🌍
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
              Ready to Explore?
            </h3>

            {/* 描述 */}
            <p
              style={{
                margin: "0 0 24px",
                fontSize: 15,
                color: "rgba(255, 255, 255, 0.8)",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              You're about to discover the weather patterns for:
            </p>

            {/* 地点名称卡片 */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 28,
                border: "2px solid rgba(102, 126, 234, 0.3)",
                boxShadow: "0 4px 16px rgba(102, 126, 234, 0.2)",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#60a5fa",
                  textAlign: "center",
                  wordBreak: "break-word",
                  textShadow: "0 2px 8px rgba(96, 165, 250, 0.3)",
                }}
              >
                📍 {pendingLocation}
              </div>
            </div>

            {/* 提示文字 */}
            <p
              style={{
                margin: "0 0 24px",
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.6)",
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              Are you ready to investigate this location?
            </p>

            {/* 按钮组 */}
            <div
              style={{
                display: "flex",
                gap: 16,
              }}
            >
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.1)";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.05)";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                }}
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  fontSize: 15,
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
                ✓ Let's Explore!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
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