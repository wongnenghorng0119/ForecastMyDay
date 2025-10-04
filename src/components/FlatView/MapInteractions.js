import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMapEvents } from "react-leaflet";
import * as L from "leaflet";
import { fetchAreaInfo } from "../../utils/geocoding";

const MapInteractions = ({
  markerRef,
  mapRef,
  setSelectedArea,
  setStats,
  setStatsErr,
  setCsvURL,
  csvURL,
  onSwitchToGlobe,
}) => {
  const [showZoomOutConfirm, setShowZoomOutConfirm] = useState(false);
  const [pendingGlobeSwitch, setPendingGlobeSwitch] = useState(null);

  const map = useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      const info = await fetchAreaInfo(lat, lng);

      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng])
          .bindTooltip(info ? `${info.name} [${info.type}]` : "Unknown", {
            permanent: true,
            direction: "top",
            offset: [0, -10],
            className: "label-tooltip",
          })
          .addTo(map);
      } else {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setTooltipContent(
          info ? `${info.name} [${info.type}]` : "Unknown"
        );
      }

      const picked = info
        ? { ...info, lat, lng }
        : { name: "Unknown", type: "n/a", lat, lng };
      setSelectedArea(picked);
    },
    contextmenu() {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      setSelectedArea(null);
      setStats(null);
      setStatsErr(null);
      if (csvURL) {
        URL.revokeObjectURL(csvURL);
        setCsvURL(null);
      }
    },
    zoomend() {
      // Switch back to globe view when zoomed out too much
      // Zoom level 2 or below typically shows the black area
      if (map.getZoom() <= 2) {
        const center = map.getCenter();
        setPendingGlobeSwitch({ lat: center.lat, lng: center.lng });
        setShowZoomOutConfirm(true);
      }
    },
  });

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  const handleConfirmSwitch = () => {
    if (pendingGlobeSwitch) {
      onSwitchToGlobe?.(pendingGlobeSwitch.lat, pendingGlobeSwitch.lng);
    }
    setShowZoomOutConfirm(false);
    setPendingGlobeSwitch(null);
  };

  const handleCancelSwitch = () => {
    // Zoom back in a bit to prevent immediate re-trigger
    if (map) {
      map.setZoom(3);
    }
    setShowZoomOutConfirm(false);
    setPendingGlobeSwitch(null);
  };

  return (
    <>
      {showZoomOutConfirm && createPortal(
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
            onClick={handleCancelSwitch}
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
            {/* 图标 */}
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
              Switch to 3D Globe?
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
              You've zoomed out quite far. Would you like to switch to the 3D globe view for a better experience?
            </p>

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
              You can always switch back using the toggle at the top.
            </p>

            {/* 按钮组 */}
            <div
              style={{
                display: "flex",
                gap: 16,
              }}
            >
              <button
                onClick={handleCancelSwitch}
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
                ✕ Stay in 2D
              </button>
              <button
                onClick={handleConfirmSwitch}
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
                ✓ Switch to 3D
              </button>
            </div>
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
                  transform: translate(-50%, -50%) scale(0.9);
                }
                to {
                  opacity: 1;
                  transform: translate(-50%, -50%) scale(1);
                }
              }
            `}
          </style>
        </div>,
        document.body
      )}
    </>
  );
};

export default MapInteractions;