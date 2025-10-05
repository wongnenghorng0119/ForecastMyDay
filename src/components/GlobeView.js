import React, { useRef, useEffect, useState } from "react";
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
      if (Math.random() < 0.030) {
        const count = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < count; i++) {
          shootingStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.5,
            length: Math.random() * 80 + 40,
            speed: Math.random() * 8 + 6,
            angle: Math.random() * Math.PI / 4 + Math.PI / 6,
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

        star.x += dx;
        star.y += dy;
        star.opacity -= 0.01;

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

// Help Carousel Component  —— 只改这个组件
const HelpCarousel = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // 尺寸计算所需的 refs + 状态
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const dotsRef = useRef(null);
  const footerRef = useRef(null);
  const [viewportH, setViewportH] = useState(400);

  // guideline 图片
  const guidelines = [
    { step: 1, image: "/assets/1.png", title: "Step 1: Select Location" },
    { step: 2, image: "/assets/2.png", title: "Step 2: Choose Dates" },
    { step: 3, image: "/assets/3.png", title: "Step 3: Result Panel"},
    { step: 4, image: "/assets/4.png", title: "Graph & Analysis"},
    { step: 5, image: "/assets/5.png", title: "Download Weather Probability Analysis"},
  ];

  const goToPrevious = () => {
    setCurrentStep((prev) => (prev === 0 ? guidelines.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentStep((prev) => (prev === guidelines.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
  };

  // 计算轮播可用高度，让图片跟随容器
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;

      const cs = window.getComputedStyle(el);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padBottom = parseFloat(cs.paddingBottom) || 0;

      const headerH = headerRef.current?.offsetHeight || 0;
      const dotsH = dotsRef.current?.offsetHeight || 0;
      const footerH = footerRef.current?.offsetHeight || 0;

      // 你的 header/dots 有 margin-bottom: 30px
      const spacing = 30 /* header mb */ + 30 /* dots mb */;

      const available =
        el.clientHeight - padTop - padBottom - headerH - dotsH - footerH - spacing;

      setViewportH(Math.max(240, available)); // 至少 240，避免窗口过小
    };

    compute();

    // 监听容器尺寸变化
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))",
        borderRadius: "24px",
        padding: "40px",
        maxWidth: "1000px",
        width: "100%",
        maxHeight: "85vh",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(212, 175, 55, 0.2)",
        position: "relative",
        animation: "slideUp 0.4s ease",

        // 关键：形成独立层，裁剪溢出，内部按列布局
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
        isolation: "isolate"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "24px",
          color: "#fff",
          transition: "all 0.3s ease",
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.2)";
          e.target.style.transform = "rotate(90deg)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.1)";
          e.target.style.transform = "rotate(0deg)";
        }}
      >
        ×
      </button>

      {/* Header */}
      <div ref={headerRef} style={{ marginBottom: "30px", textAlign: "center" }}>
        <h2 style={{
          fontSize: "32px",
          fontWeight: "800",
          background: "linear-gradient(135deg, #d4af37, #ffc107)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "12px",
          letterSpacing: "-0.5px"
        }}>
          User Guidelines
        </h2>
        <p style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "16px",
          fontWeight: "500"
        }}>
          {guidelines[currentStep].title}
        </p>
      </div>

      {/* Carousel Container —— 高度跟随容器计算结果 */}
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "30px",

        flex: "0 0 auto",
        height: viewportH,    // ★ 关键
        minHeight: 0,
        padding: "0 60px",
        overflow: "hidden"
      }}>
        {/* Previous Button */}
        <button
          onClick={goToPrevious}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "linear-gradient(135deg, #d4af37, #ffc107)",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "24px",
            color: "#fff",
            boxShadow: "0 4px 15px rgba(212, 175, 55, 0.4)",
            transition: "all 0.3s ease",
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-50%) scale(1.1)";
            e.target.style.boxShadow = "0 6px 20px rgba(212, 175, 55, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(-50%) scale(1)";
            e.target.style.boxShadow = "0 4px 15px rgba(212, 175, 55, 0.4)";
          }}
        >
          ‹
        </button>

        {/* Image Container */}
        <div style={{
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          padding: "20px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          width: "100%",
          maxWidth: "800px",
          height: "100%",
          overflow: "hidden"
        }}>
          <img
            src={guidelines[currentStep].image}
            alt={guidelines[currentStep].title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px'
          }}>
            Image not found: {guidelines[currentStep].image}
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={goToNext}
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "linear-gradient(135deg, #d4af37, #ffc107)",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "24px",
            color: "#fff",
            boxShadow: "0 4px 15px rgba(212, 175, 55, 0.4)",
            transition: "all 0.3s ease",
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-50%) scale(1.1)";
            e.target.style.boxShadow = "0 6px 20px rgba(212, 175, 55, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(-50%) scale(1)";
            e.target.style.boxShadow = "0 4px 15px rgba(212, 175, 55, 0.4)";
          }}
        >
          ›
        </button>
      </div>

      {/* Step Indicators */}
      <div
        ref={dotsRef}
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "30px"
        }}
      >
        {guidelines.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            style={{
              width: currentStep === index ? "32px" : "12px",
              height: "12px",
              borderRadius: "6px",
              border: "none",
              background: currentStep === index 
                ? "linear-gradient(135deg, #d4af37, #ffc107)"
                : "rgba(255, 255, 255, 0.3)",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        ref={footerRef}
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          paddingTop: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
      </div>
    </div>
  );
};

const GlobeView = ({ features, selectedName, onPick, focusLocation }) => {
  const globeRef = useRef();
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  useEffect(() => {
  const key = 'introShownOnce'; // 如果要跨会话用 localStorage
  const shown = sessionStorage.getItem(key);
  if (!shown) {
    setShowIntroModal(true);
    sessionStorage.setItem(key, '1');
  }
}, []);


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

  useEffect(() => {
    if (focusLocation && focusLocation.lat && focusLocation.lng) {
      flyToLocation(focusLocation.lat, focusLocation.lng);
    }
  }, [focusLocation]);

  const handleIntroduction = () => {
    setShowIntroModal(true);
  };

  const handleHelp = () => {
    setShowHelpModal(true);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Starfield />
      
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
        }}
      />

      {/* Introduction Modal */}
      {showIntroModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
            animation: "fadeIn 0.3s ease"
          }}
          onClick={() => setShowIntroModal(false)}
        >
          <div
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))",
              borderRadius: "24px",
              padding: "40px",
              maxWidth: "700px",
              width: "100%",
              maxHeight: "75vh",
              overflowY: "auto",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(102, 126, 234, 0.2)",
              position: "relative",
              animation: "slideUp 0.4s ease"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIntroModal(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "24px",
                color: "#fff",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.2)";
                e.target.style.transform = "rotate(90deg)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.1)";
                e.target.style.transform = "rotate(0deg)";
              }}
            >
              ×
            </button>

            <div style={{ marginBottom: "30px", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🌍</div>
              <h2 style={{
                fontSize: "32px",
                fontWeight: "800",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: "12px",
                letterSpacing: "-0.5px"
              }}>
                Welcome to ForecastMyDay
              </h2>
              <p style={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "16px",
                fontWeight: "500"
              }}>
                Plan Months Ahead with NASA-Powered Climate Intelligence
              </p>
            </div>

            <div style={{
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: "15px",
              lineHeight: "1.8",
              marginBottom: "30px"
            }}>
              <p style={{ marginBottom: "20px" }}>
                <strong style={{ color: "#667eea" }}>ForecastMyDay</strong> transforms a decade of <strong>NASA POWER data</strong> into simple, location-specific odds so travelers and field teams can plan months ahead 🌧.
              </p>

              <div style={{
                background: "rgba(102, 126, 234, 0.1)",
                border: "1px solid rgba(102, 126, 234, 0.3)",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "24px"
              }}>
                <h3 style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#667eea",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span>🎯</span> How It Works
                </h3>
                <ul style={{ paddingLeft: "20px", margin: 0 }}>
                  <li style={{ marginBottom: "12px" }}>
                    <strong>Pick a Location:</strong> Use our 3D globe, voice search, or text input
                  </li>
                  <li style={{ marginBottom: "12px" }}>
                    <strong>Choose Your Dates:</strong> Select the time range you care about
                  </li>
                  <li style={{ marginBottom: "12px" }}>
                    <strong>Get Climate Insights:</strong> We analyze 10 years of historical data for those exact calendar days
                  </li>
                  <li>
                    <strong>Make Informed Decisions:</strong> View clear percentages for weather conditions
                  </li>
                </ul>
              </div>

              <div style={{
                background: "rgba(212, 175, 55, 0.1)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                borderRadius: "16px)",
                padding: "24px",
                marginBottom: "24px"
              }}>
                <h3 style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#d4af37",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span>📊</span> What You Get
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🌡️</span> <span>Very Hot probability</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>❄️</span> <span>Very Cold probability</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>💨</span> <span>Very Windy probability</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🌧️</span> <span>Very Wet probability</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>😰</span> <span>Discomfort probability</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📈</span> <span>Interactive graphs</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: "rgba(118, 75, 162, 0.1)",
                border: "1px solid rgba(118, 75, 162, 0.3)",
                borderRadius: "16px",
                padding: "24px"
              }}>
                <h3 style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#764ba2",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span>🤖</span> AI-Powered Recommendations
                </h3>
                <p style={{ marginBottom: "12px" }}>
                  Our AI assistant analyzes the data and provides:
                </p>
                <ul style={{ paddingLeft: "20px", margin: 0 }}>
                  <li style={{ marginBottom: "8px" }}>Personalized activity suggestions for travelers</li>
                  <li style={{ marginBottom: "8px" }}>Gear and timing recommendations for field teams</li>
                  <li>Safety considerations based on weather patterns</li>
                </ul>
              </div>
            </div>

            <div style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingTop: "24px",
              textAlign: "center"
            }}>
              <p style={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: "14px",
                marginBottom: "20px"
              }}>
                <strong>Powered by NASA POWER</strong> • Trusted climatology for realistic planning
              </p>
              <button
                onClick={() => setShowIntroModal(false)}
                style={{
                  padding: "14px 32px",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  border: "none",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
                }}
              >
                Get Started 🚀
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}

            {/* Help Modal - Guidelines */}
            {showHelpModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
            animation: "fadeIn 0.3s ease"
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <HelpCarousel onClose={() => setShowHelpModal(false)} />
        </div>
      )}
    </div>
  );
};

export default GlobeView;
