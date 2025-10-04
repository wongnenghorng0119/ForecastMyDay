import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./css/MapStyles.css";
import "./css/FlatView.css";
import MapInteractions from "./FlatView/MapInteractions";
import ProbabilityControls from "./FlatView/ProbabilityControls";
import ResultsPanel from "./FlatView/ResultsPanel";
import ProbabilityInsights from "./ProbabilityInsights";
import { fetchPowerDailyRange, computeProbabilities, buildCSV } from "../utils/nasaPowerApi";
import { searchPlace } from "../utils/geocoding";

// 修正默认 Marker 图标
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// —— 小组件：用 React-Leaflet 的 useMapEvents 来侦测地图是否在移动 —— //
const MoveSensor = ({ onMovingChange, debounceMs = 250 }) => {
  const timerRef = React.useRef(null);

  useMapEvents({
    movestart() {
      if (timerRef.current) clearTimeout(timerRef.current);
      onMovingChange(true);
      // console.debug("[move] start -> true");
    },
    dragstart() {
      if (timerRef.current) clearTimeout(timerRef.current);
      onMovingChange(true);
      // console.debug("[drag] start -> true");
    },
    zoomstart() {
      if (timerRef.current) clearTimeout(timerRef.current);
      onMovingChange(true);
      // console.debug("[zoom] start -> true");
    },

    moveend() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onMovingChange(false), debounceMs);
      // console.debug("[move] end (debounced) -> false");
    },
    dragend() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onMovingChange(false), debounceMs);
      // console.debug("[drag] end (debounced) -> false");
    },
    zoomend() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onMovingChange(false), debounceMs);
      // console.debug("[zoom] end (debounced) -> false");
    },
  });

  return null;
};

const FlatView = ({ selectedArea, setSelectedArea, setSearchHandler, onSwitchToGlobe }) => {
  const markerRef = useRef(null);
  const mapRef = useRef(null);
  const radarWavesRef = useRef([]);
  const radarCenterRef = useRef(null);

  // Abort controllers
  const reverseAbortRef = useRef(null);
  const searchAbortRef = useRef(null);
  const powerAbortRef = useRef(null);

  // 概率统计 UI 状态（由日历控制）
  const [month, setMonth] = useState(6);
  const [day, setDay] = useState(15);
  const [windowDays, setWindowDays] = useState(3);

  // 结果状态
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsErr, setStatsErr] = useState(null);
  const [csvURL, setCsvURL] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // ✅ 地图移动状态：由 MoveSensor 维护
  const [mapMoving, setMapMoving] = useState(false);

  // 创建雷达波特效
  const createRadarEffect = (lat, lng) => {
    const map = mapRef.current;
    if (!map) return;

    // 清除旧的雷达波
    removeRadarEffect();

    const pane = map.getPanes().overlayPane;

    // 创建中心点脉冲
    const center = document.createElement("div");
    center.className = "radar-center";
    radarCenterRef.current = center;
    pane.appendChild(center);

    // 创建三个雷达波
    for (let i = 1; i <= 3; i++) {
      const wave = document.createElement("div");
      wave.className = `radar-wave active wave-${i}`;
      radarWavesRef.current.push(wave);
      pane.appendChild(wave);
    }

    // 更新位置
    updateRadarPosition(lat, lng);

    // 监听地图移动和缩放，更新雷达波位置
    map.on("move zoom", () => updateRadarPosition(lat, lng));
  };

  // 更新雷达波位置
  const updateRadarPosition = (lat, lng) => {
    const map = mapRef.current;
    if (!map) return;

    const point = map.latLngToLayerPoint([lat, lng]);

    // 更新中心点位置
    if (radarCenterRef.current) {
      radarCenterRef.current.style.left = `${point.x - 8}px`;
      radarCenterRef.current.style.top = `${point.y - 8}px`;
    }

    // 更新雷达波位置
    radarWavesRef.current.forEach((wave) => {
      wave.style.left = `${point.x}px`;
      wave.style.top = `${point.y}px`;
      wave.style.transform = "translate(-50%, -50%)";
    });
  };

  // 移除雷达波特效
  const removeRadarEffect = () => {
    // 移除中心点
    if (radarCenterRef.current && radarCenterRef.current.parentNode) {
      radarCenterRef.current.parentNode.removeChild(radarCenterRef.current);
      radarCenterRef.current = null;
    }

    // 移除所有雷达波
    radarWavesRef.current.forEach((wave) => {
      if (wave.parentNode) {
        wave.parentNode.removeChild(wave);
      }
    });
    radarWavesRef.current = [];

    // 移除事件监听
    const map = mapRef.current;
    if (map) {
      map.off("move zoom");
    }
  };

  async function runStats(lat, lng, m, d, w) {
    if (powerAbortRef.current) powerAbortRef.current.abort();
    const ac = new AbortController();
    powerAbortRef.current = ac;

    setLoadingStats(true);
    setShowResults(true);
    setStatsErr(null);
    setStats(null);
    if (csvURL) {
      URL.revokeObjectURL(csvURL);
      setCsvURL(null);
    }

    // 更新选择
    setMonth(m);
    setDay(d);
    setWindowDays(w);

    // 最小加载时长（避免闪烁）
    const startTime = Date.now();
    const minLoadingTime = 2000;

    try {
      const rows = await fetchPowerDailyRange(lat, lng, ac.signal);
      const s = computeProbabilities(rows, m, d, w);
      setStats(s);
      const url = buildCSV({ name: selectedArea?.name, lat, lng }, m, d, w, s);
      setCsvURL(url);

      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise((res) => setTimeout(res, minLoadingTime - elapsed));
      }
    } catch (e) {
      setStatsErr(e.message || "统计失败");
    } finally {
      setLoadingStats(false);
    }
  }

  // 搜索地点
  const handleSearchPlace = async (query) => {
    if (!query) return;
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;

    const result = await searchPlace(query, ac.signal);
    if (!result) return;

    const { lat, lng, name, type } = result;

    const map = mapRef.current;
    if (map) map.setView([lat, lng], Math.max(map.getZoom(), 8), { animate: true });

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng])
        .bindTooltip(`${name} [${type}]`, {
          permanent: true,
          direction: "top",
          offset: [0, -10],
          className: "label-tooltip",
        })
        .addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setTooltipContent(`${name} [${type}]`);
    }

    setSelectedArea({ name, type, lat, lng });

    // 创建雷达波特效
    setTimeout(() => createRadarEffect(lat, lng), 100);
  };

  // 当选中区域变化时，创建或更新雷达波
  useEffect(() => {
    if (selectedArea?.lat && selectedArea?.lng && mapRef.current) {
      setTimeout(() => createRadarEffect(selectedArea.lat, selectedArea.lng), 100);
    }
    return () => {
      removeRadarEffect();
    };
  }, [selectedArea?.lat, selectedArea?.lng]);

  // 允许父组件注入搜索处理器
  useEffect(() => {
    setSearchHandler?.(handleSearchPlace);
    return () => setSearchHandler?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 卸载清理
  useEffect(() => {
    return () => {
      removeRadarEffect();
    };
  }, []);

  return (
    <div className="flatview-root">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        className="flatview-map"
        worldCopyJump
        whenCreated={(m) => {
          mapRef.current = m;
        }}
      >
        {/* ✅ 用 MoveSensor 来更新 mapMoving，而不是手动 m.on(...) */}
        <MoveSensor onMovingChange={setMapMoving} debounceMs={250} />

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" noWrap />

        <MapInteractions
          markerRef={markerRef}
          mapRef={mapRef}
          setSelectedArea={setSelectedArea}
          setStats={setStats}
          setStatsErr={setStatsErr}
          setCsvURL={setCsvURL}
          csvURL={csvURL}
          onSwitchToGlobe={onSwitchToGlobe}
          createRadarEffect={createRadarEffect}
        />
      </MapContainer>

      <ProbabilityControls
        selectedArea={selectedArea}
        onCalculate={runStats}
        hideWhenResultsOpen={showResults}
        mapMoving={mapMoving}
      />

      <ResultsPanel
        open={showResults}
        onToggle={() => setShowResults((v) => !v)}
        loadingStats={loadingStats}
        statsErr={statsErr}
        stats={stats}
        month={month}
        day={day}
        windowDays={windowDays}
        selectedArea={selectedArea}
        csvURL={csvURL}
      />
    </div>
  );
};

export default FlatView;
