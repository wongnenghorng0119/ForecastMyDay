// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import OverlayBar from "./components/OverlayBar";
import GlobeView from "./components/GlobeView";
import FlatView from "./components/FlatView";
import Loading from "./components/Loading";
import { LOCAL_GEOJSON } from "./utils/constants";
import { geoCentroid, geoBounds } from "d3-geo";

export default function App() {
  const [mode, setMode] = useState("globe"); // 'globe' | 'flat' | 'loading'
  const [features, setFeatures] = useState([]);
  const [selectedName, setSelectedName] = useState(null); // 3D
  const [selectedArea, setSelectedArea] = useState(null); // 2D {name, type, lat, lng}
  const [globeFocusLocation, setGlobeFocusLocation] = useState(null); // {lat, lng} for globe focus
  const [transitionTarget, setTransitionTarget] = useState(null); // {name, lat, lng} for animation

  // 顶层受控：搜索框内容 + 等待 2D 注册完成后自动搜索
  const [query, setQuery] = useState("");
  const [pendingSearch, setPendingSearch] = useState(null);

  // FlatView 注册的搜索函数
  const searchHandlerRef = useRef(null);

  // 载入 3D 数据
  useEffect(() => {
    fetch(LOCAL_GEOJSON)
      .then((r) => r.json())
      .then((fc) => {
        fc.features.forEach((f) => {
          const p = (f.properties ||= {});
          p.name =
            p.name ||
            p.NAME ||
            p.NAME_EN ||
            p.ADMIN ||
            p.ADMIN_NAME ||
            String(p.SOVEREIGNT || p.ISO_A3 || f.id || "Unknown");
        });
        setFeatures(fc.features);
      })
      .catch((e) => console.error("load geojson failed:", e));
  }, []);

  // 等 2D 注册好搜索函数后，若有待搜索词就触发一次并清空
  useEffect(() => {
    if (mode === "flat" && searchHandlerRef.current && pendingSearch) {
      searchHandlerRef.current(pendingSearch);
      setPendingSearch(null);
    }
  }, [mode, pendingSearch]);

  // Handle transition completion
  const handleTransitionComplete = () => {
    setMode("flat");
    setTransitionTarget(null);
  };

  // Handle voice search with loading animation - 语音搜索触发过渡动画
  const handleVoiceSearch = async (locationName) => {
    if (!locationName) return;
    
    setQuery(locationName);
    setPendingSearch(locationName);
    
    // 使用 Nominatim API 获取坐标
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(locationName)}&addressdetails=1&limit=1`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });
      
      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const result = results[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          
          // 触发 Loading 动画
          setSelectedName(locationName);
          setTransitionTarget({ name: locationName, lat, lng });
          setMode("loading");
          return;
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    
    // 如果获取坐标失败，直接切换到 flat 模式并搜索
    setMode("flat");
    setTimeout(() => {
      if (searchHandlerRef.current) {
        searchHandlerRef.current(locationName);
      }
    }, 100);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#000",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <OverlayBar
        mode={mode}
        setMode={setMode}
        selectedName={selectedName}
        selectedArea={selectedArea}
        clearArea={() => setSelectedArea(null)}
        query={query}
        setQuery={setQuery}
        onSearch={(q) => searchHandlerRef.current?.(q)}
        onVoiceSearch={handleVoiceSearch}
      />

      {mode === "globe" ? (
        <GlobeView
          features={features}
          selectedName={selectedName}
          focusLocation={globeFocusLocation}
          onPick={(feat) => {
            const name = feat?.properties?.name || null;
            setSelectedName(name);
            if (name && name !== "Antarctica") {
              // Calculate centroid for transition
              let [lng, lat] = geoCentroid(feat);
              if (!isFinite(lng) || !isFinite(lat)) {
                const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(feat);
                lng = (minLon + maxLon) / 2;
                lat = (minLat + maxLat) / 2;
              }
              setTransitionTarget({ name, lat, lng });
              setMode("loading"); // Switch to loading animation
              setQuery(name);
              setPendingSearch(name);
            }
          }}
        />
      ) : mode === "loading" ? (
        <Loading
          features={features}
          selectedName={selectedName}
          transitionTarget={transitionTarget}
          onTransitionComplete={handleTransitionComplete}
        />
      ) : (
        <FlatView
          selectedArea={selectedArea}
          setSelectedArea={setSelectedArea}
          setSearchHandler={(fn) => (searchHandlerRef.current = fn)}
          onSwitchToGlobe={(lat, lng) => {
            setGlobeFocusLocation({ lat, lng });
            setMode("globe");
          }}
        />
      )}
    </div>
  );
}