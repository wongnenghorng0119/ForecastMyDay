// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Globe from "react-globe.gl";
import { geoCentroid, geoBounds } from "d3-geo";

// 2D（Leaflet）
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";

// 修复默认 Marker 图标
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

const LOCAL_GEOJSON = "/custom.geo.json"; // 3D 用

export default function Data() {
  const [mode, setMode] = useState("globe"); // 'globe' | 'flat'
  const [features, setFeatures] = useState([]);
  const [selectedName, setSelectedName] = useState(null); // 3D
  const [selectedArea, setSelectedArea] = useState(null); // 2D {name, type, lat, lng}

  // —— 新增：保存 FlatView 注册的搜索函数
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
        // —— 新增：把搜索动作传给工具条（仅 2D 用）
        onSearch={(q) =>
          searchHandlerRef.current && searchHandlerRef.current(q)
        }
      />

      {mode === "globe" ? (
        <GlobeView
          features={features}
          selectedName={selectedName}
          onPick={(feat) => setSelectedName(feat?.properties?.name || null)}
        />
      ) : (
        <FlatView
          selectedArea={selectedArea}
          setSelectedArea={setSelectedArea}
          // —— 新增：FlatView 注册它的搜索方法
          setSearchHandler={(fn) => (searchHandlerRef.current = fn)}
        />
      )}
    </div>
  );
}

/* ---------- 顶部工具条 ---------- */
function OverlayBar({
  mode,
  setMode,
  selectedName,
  selectedArea,
  clearArea,
  onSearch, // 新增
}) {
  // —— 新增：简单的受控输入
  const [query, setQuery] = useState("");

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 2147483647,
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: 4,
        borderRadius: 8,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <button
        onClick={() => setMode("globe")}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: 0,
          cursor: "pointer",
          background: mode === "globe" ? "#1f8fff" : "#444",
          color: "#fff",
        }}
      >
        地球
      </button>
      <button
        onClick={() => setMode("flat")}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: 0,
          cursor: "pointer",
          background: mode === "flat" ? "#1f8fff" : "#444",
          color: "#fff",
        }}
      >
        2D 平面
      </button>

      {mode === "globe" ? (
        <div
          style={{
            background: "rgba(0,0,0,0.45)",
            padding: "6px 10px",
            borderRadius: 6,
          }}
        >
          选中国家：{selectedName || "（无）"}
        </div>
      ) : (
        <>
          {/* —— 新增：搜索框（仅 2D） */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) onSearch?.(query.trim());
            }}
            placeholder="搜索地点（例：malaysia sibu）"
            style={{
              width: 240,
              padding: "6px 10px",
              borderRadius: 6,
              border: 0,
              outline: "none",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
            }}
          />
          <button
            onClick={() => query.trim() && onSearch?.(query.trim())}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: 0,
              cursor: "pointer",
              background: "#1f8fff",
              color: "#fff",
            }}
          >
            搜索
          </button>

          <div
            style={{
              background: "rgba(0,0,0,0.45)",
              padding: "6px 10px",
              borderRadius: 6,
            }}
          >
            选中区域：
            {selectedArea
              ? `${selectedArea.name} [${selectedArea.type}]`
              : "（无）"}
          </div>
          <button
            onClick={clearArea}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: 0,
              cursor: "pointer",
              background: "#444",
              color: "#fff",
            }}
          >
            清除
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

/* ---------- 3D 地球视图 ---------- */
function GlobeView({ features, selectedName, onPick }) {
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

  return (
    <Globe
      ref={globeRef}
      backgroundColor="#000"
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
      style={{ width: "100%", height: "100%" }}
    />
  );
}

/* ---------- 2D 平面视图：点击/搜索 显示区域 Label ---------- */
function FlatView({ selectedArea, setSelectedArea, setSearchHandler }) {
  const markerRef = useRef(null);
  const abortRef = useRef(null);
  const searchAbortRef = useRef(null);
  const mapRef = useRef(null);

  // 请求行政区名字（反向地理编码：点击用）
  const fetchAreaInfo = async (lat, lng) => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=8&addressdetails=1`;
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ac.signal,
    }).catch(() => null);
    if (!r || !r.ok) return null;
    const data = await r.json().catch(() => null);
    if (!data) return null;
    const name =
      data.name ||
      data.display_name ||
      data.address?.city ||
      data.address?.state ||
      data.address?.country ||
      "Unknown";
    const type = data.addresstype || data.type || "admin";
    return { name, type };
  };

  // —— 新增：正向地理编码（搜索用）
  const searchPlace = async (query) => {
    if (!query) return;
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      query
    )}&addressdetails=1&limit=1`;
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ac.signal,
    }).catch(() => null);
    if (!r || !r.ok) return;

    const list = (await r.json().catch(() => [])) || [];
    if (!list.length) return;

    const hit = list[0];
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    const name =
      hit.name ||
      hit.display_name ||
      hit.address?.city ||
      hit.address?.state ||
      hit.address?.country ||
      "Unknown";
    const type = hit.addresstype || hit.type || "place";

    // 打标 & 移图
    const map = mapRef.current;
    if (map) {
      map.setView([lat, lng], Math.max(map.getZoom(), 8), { animate: true });
    }

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
  };

  // 让父组件可调用 searchPlace
  useEffect(() => {
    setSearchHandler?.(searchPlace);
    return () => setSearchHandler?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function Interactions() {
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

        setSelectedArea(
          info
            ? { ...info, lat, lng }
            : { name: "Unknown", type: "n/a", lat, lng }
        );
      },
      contextmenu() {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        setSelectedArea(null);
      },
    });

    // 把 map 存起来供搜索时 setView
    useEffect(() => {
      mapRef.current = map;
    }, [map]);

    return null;
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={3}
      style={{ width: "100%", height: "100%" }}
      worldCopyJump
      preferCanvas
      whenCreated={(m) => (mapRef.current = m)} // 保底
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        noWrap
      />
      <Interactions />
    </MapContainer>
  );
}
