// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import OverlayBar from "./components/OverlayBar";
import GlobeView from "./components/GlobeView";
import FlatView from "./components/FlatView";
import { LOCAL_GEOJSON } from "./utils/constants";

export default function App() {
  const [mode, setMode] = useState("globe"); // 'globe' | 'flat'
  const [features, setFeatures] = useState([]);
  const [selectedName, setSelectedName] = useState(null); // 3D
  const [selectedArea, setSelectedArea] = useState(null); // 2D {name, type, lat, lng}
  const [globeFocusLocation, setGlobeFocusLocation] = useState(null); // {lat, lng} for globe focus

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

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
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
              setMode("flat"); // 切到 2D
              setQuery(name); // 写进搜索框
              setPendingSearch(name); // 等 2D handler 装载后自动触发
            }
          }}
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
