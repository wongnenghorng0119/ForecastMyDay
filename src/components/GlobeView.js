import React, { useRef, useEffect } from "react";
import Globe from "react-globe.gl";
import { geoCentroid, geoBounds } from "d3-geo";

// Starfield Background Component
const Starfield = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Create stars
    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.5,
      twinkleSpeed: Math.random() * 0.02 + 0.01,
    }));

    // Create shooting stars
    const shootingStars = [];
    const createShootingStar = () => {
      if (Math.random() < 0.030) { // 1.5% chance per frame
        // Create 1-3 shooting stars at once
        const count = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < count; i++) {
          shootingStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.5, // Top half of screen
            length: Math.random() * 80 + 40,
            speed: Math.random() * 8 + 6,
            angle: Math.random() * Math.PI / 4 + Math.PI / 6, // 30-75 degrees
            opacity: 1,
          });
        }
      }
    };

    // Animation loop
    const animate = () => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and update stars
      stars.forEach((star) => {
        star.opacity += star.twinkleSpeed;
        if (star.opacity > 1 || star.opacity < 0.3) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });

      // Create new shooting stars
      createShootingStar();

      // Draw and update shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        
        const dx = Math.cos(star.angle) * star.speed;
        const dy = Math.sin(star.angle) * star.speed;
        
        // Draw shooting star trail
        const gradient = ctx.createLinearGradient(
          star.x,
          star.y,
          star.x - dx * star.length / star.speed,
          star.y - dy * star.length / star.speed
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
        gradient.addColorStop(0.5, `rgba(200, 220, 255, ${star.opacity * 0.6})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(
          star.x - dx * star.length / star.speed,
          star.y - dy * star.length / star.speed
        );
        ctx.stroke();

        // Update position
        star.x += dx;
        star.y += dy;
        star.opacity -= 0.01;

        // Remove if off-screen or faded
        if (
          star.x > canvas.width ||
          star.y > canvas.height ||
          star.opacity <= 0
        ) {
          shootingStars.splice(i, 1);
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
};

const GlobeView = ({ features, selectedName, onPick, focusLocation }) => {
  const globeRef = useRef();

  const flyTo = (feat) => {
    if (!globeRef.current || !feat || !feat.geometry) return;
    let [lon, lat] = geoCentroid(feat);
    if (!isFinite(lon) || !isFinite(lat)) {
      const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(feat);
      lon = (minLon + maxLon) / 2;
      lat = (minLat + maxLat) / 2;
    }
    if (!isFinite(lon) || !isFinite(lat)) return;
    try {
      globeRef.current.pointOfView({ lat, lng: lon, altitude: 1.2 }, 900);
    } catch {}
  };

  const flyToLocation = (lat, lng) => {
    if (!globeRef.current || !isFinite(lat) || !isFinite(lng)) return;
    try {
      globeRef.current.pointOfView({ lat, lng, altitude: 1.2 }, 900);
    } catch {}
  };

  // Focus on the location when focusLocation changes
  useEffect(() => {
    if (focusLocation && focusLocation.lat && focusLocation.lng) {
      flyToLocation(focusLocation.lat, focusLocation.lng);
    }
  }, [focusLocation]);

  const handleIntroduction = () => {
    // TODO: Add introduction functionality
    console.log("Introduction button clicked");
  };

  const handleHelp = () => {
    // TODO: Add help functionality
    console.log("Help button clicked");
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Starfield />
      
      {/* Introduction and Help Buttons */}
      <style>
        {`
          .globe-buttons-container {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 10;
            display: flex;
            gap: 12px;
            flex-direction: column;
          }

          .globe-btn-text {
            display: inline;
          }

          @media (max-width: 768px) {
            .globe-buttons-container {
              top: auto;
              bottom: 20px;
              right: 20px;
              left: auto;
              width: auto;
              flex-direction: column;
              padding: 0;
            }

            .globe-btn-text {
              display: none;
            }

            .globe-intro-btn {
              width: 56px !important;
              height: 56px !important;
              min-width: 56px !important;
              padding: 0 !important;
              border-radius: 50% !important;
            }

            .globe-help-btn {
              width: 56px !important;
              height: 56px !important;
              min-width: 56px !important;
              padding: 0 !important;
              border-radius: 50% !important;
            }

            .globe-btn-emoji {
              font-size: 24px !important;
            }
          }

          @media (max-width: 480px) {
            .globe-buttons-container {
              bottom: 12px;
              right: 12px;
            }
          }
        `}
      </style>
      
      <div className="globe-buttons-container">
        <button
          onClick={handleIntroduction}
          className="globe-intro-btn"
          style={{
            padding: "12px 20px",
            background: "linear-gradient(135deg, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9))",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "140px",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.3)";
          }}
        >
          <span className="globe-btn-emoji" style={{ fontSize: "18px" }}>📖</span>
          <span className="globe-btn-text">Introduction</span>
        </button>

        <button
          onClick={handleHelp}
          className="globe-help-btn"
          style={{
            padding: "12px 20px",
            background: "linear-gradient(135deg, rgba(212, 175, 55, 0.9), rgba(255, 193, 7, 0.9))",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "140px",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 20px rgba(212, 175, 55, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.3)";
          }}
        >
          <span className="globe-btn-emoji" style={{ fontSize: "18px" }}>❓</span>
          <span className="globe-btn-text">Help</span>
        </button>
      </div>

      <Globe
        ref={globeRef}
        backgroundColor="rgba(0,0,0,0)"
        waitForGlobeReady={false}
        showGlobe={false}
        polygonsData={features}
        polygonLabel={(d) => d.properties.name}
        polygonAltitude={(d) =>
          d?.properties?.name === selectedName ? 0.07 : 0.01
        }
        polygonCapColor={(d) =>
          d?.properties?.name === selectedName
            ? "rgba(255,80,120,0.9)"
            : "rgba(40,150,220,0.85)"
        }
        polygonSideColor={() => "rgba(255,255,255,0.2)"}
        polygonStrokeColor={() => "rgba(255,255,255,0.4)"}
        polygonsTransitionDuration={250}
        onPolygonClick={(d) => {
          const name = d?.properties?.name;
          if (name === "Antarctica") return;
          onPick(d);
          flyTo(d);
        }}
        style={{ 
          width: "100%", 
          height: "100%",
          position: "relative",
          zIndex: 1,
          // Mobile responsive
          [`@media (max-width: 480px)`]: {
            minHeight: "50vh"
          }
        }}
      />
    </div>
  );
};

export default GlobeView;