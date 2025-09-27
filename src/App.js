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

export default function App() {
  const [mode, setMode] = useState("globe"); // 'globe' | 'flat'
  const [features, setFeatures] = useState([]);
  const [selectedName, setSelectedName] = useState(null); // 3D
  const [selectedArea, setSelectedArea] = useState(null); // 2D {name, type, lat, lng}

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
  onSearch,
  query,
  setQuery,
}) {
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
        padding: 6,
        borderRadius: 10,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <button
        onClick={() => setMode("globe")}
        style={btn(mode === "globe" ? "#1f8fff" : "#444")}
      >
        地球
      </button>
      <button
        onClick={() => setMode("flat")}
        style={btn(mode === "flat" ? "#1f8fff" : "#444")}
      >
        2D 平面
      </button>

      {mode === "globe" ? (
        <div style={pill()}>选中国家：{selectedName || "（无）"}</div>
      ) : (
        <>
          {/* 搜索框（2D） */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) onSearch?.(query.trim());
            }}
            placeholder="搜索地点（例：malaysia sibu）"
            style={input()}
          />
          <button
            onClick={() => query.trim() && onSearch?.(query.trim())}
            style={btn("#1f8fff")}
          >
            搜索
          </button>

          <div style={pill()}>
            选中区域：
            {selectedArea
              ? `${selectedArea.name} [${selectedArea.type}]`
              : "（无）"}
          </div>
          <button onClick={clearArea} style={btn("#444")}>
            清除
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

const btn = (bg) => ({
  padding: "6px 10px",
  borderRadius: 8,
  border: 0,
  cursor: "pointer",
  background: bg,
  color: "#fff",
});
const pill = () => ({
  background: "rgba(0,0,0,0.45)",
  padding: "6px 10px",
  borderRadius: 8,
});
const input = () => ({
  width: 240,
  padding: "6px 10px",
  borderRadius: 8,
  border: 0,
  outline: "none",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
});

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

/* ---------- 2D 平面视图：搜索/点选 + 历史概率（NASA POWER） ---------- */
function FlatView({ selectedArea, setSelectedArea, setSearchHandler }) {
  const markerRef = useRef(null);
  const mapRef = useRef(null);

  // Abort 控制
  const reverseAbortRef = useRef(null);
  const searchAbortRef = useRef(null);
  const powerAbortRef = useRef(null);

  // 概率统计 UI 状态
  const [month, setMonth] = useState(6);
  const [day, setDay] = useState(15);
  const [windowDays, setWindowDays] = useState(3);

  // 结果状态
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsErr, setStatsErr] = useState(null);
  const [csvURL, setCsvURL] = useState(null);

  // ====== NASA POWER：抓数据 & 统计 ======

  // 小工具：格式化 YYYYMMDD
  const yyyymmdd = (d) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate()
    ).padStart(2, "0")}`;

  // 抓单段
  async function fetchPowerDaily(lat, lon, startYYYYMMDD, endYYYYMMDD, signal) {
    const params = [
      "T2M", // 气温 °C
      "RH2M", // 相对湿度 %
      "WS2M", // 风速 m/s
      "PRECTOTCORR", // 降水 mm/day
    ].join(",");
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${params}&community=RE&latitude=${lat}&longitude=${lon}&start=${startYYYYMMDD}&end=${endYYYYMMDD}&format=JSON`;
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!r.ok) throw new Error(`POWER HTTP ${r.status}`);
    const data = await r.json();
    const p = data?.properties?.parameter || {};
    const dates = Object.keys(p.T2M || {});
    // 小工具：清理缺测值
    const clean = (v) => (v === -999 || v === -99 ? null : v);

    return dates.map((d) => ({
      date: d,
      T2M: clean(p.T2M?.[d]),
      RH2M: clean(p.RH2M?.[d]),
      WS2M: clean(p.WS2M?.[d]),
      PRECTOTCORR: clean(p.PRECTOTCORR?.[d]),
    }));
  }

  // 大范围（1995-01-01 至 昨天），分块抓，避免过长区间
  async function fetchPowerDailyRange(lat, lon, signal) {
    const startYear = 1995;
    const today = new Date();
    const endDate = new Date(today.getTime() - 24 * 3600 * 1000); // 昨天
    const endYear = endDate.getFullYear();

    const results = [];
    for (let y = startYear; y <= endYear; y++) {
      const start = new Date(y, 0, 1);
      const end = y === endYear ? endDate : new Date(y, 11, 31);
      const rows = await fetchPowerDaily(
        lat,
        lon,
        yyyymmdd(start),
        yyyymmdd(end),
        signal
      );
      results.push(...rows);
    }
    return results;
  }

  function computeProbabilities(
    rows,
    targetMonth,
    targetDay,
    wDays = 3,
    thresholds = {}
  ) {
    const th = {
      veryHot: (r) => r.T2M != null && r.T2M > 32,
      veryCold: (r) => r.T2M != null && r.T2M < 0,
      veryWet: (r) => r.PRECTOTCORR != null && r.PRECTOTCORR >= 10,
      veryWindy: (r) => r.WS2M != null && r.WS2M >= 10,
      veryUncomfortable: (r) =>
        r.T2M != null && r.RH2M != null && r.T2M >= 32 && r.RH2M >= 60,
      ...thresholds,
    };

    const toMD = (yyyymmddStr) => ({
      m: parseInt(yyyymmddStr.slice(4, 6), 10),
      d: parseInt(yyyymmddStr.slice(6, 8), 10),
    });

    // 将“目标月日”映射到同一年（2001）以便计算日差
    const target = new Date(2001, targetMonth - 1, targetDay);
    const inWindow = (md) => {
      const x = new Date(2001, md.m - 1, md.d);
      const diff = Math.abs((x - target) / 86400000);
      return diff <= wDays;
    };

    const sample = rows.filter((r) => inWindow(toMD(r.date)));
    const n = sample.length || 1;
    const prob = (fn) => {
      const hits = sample.filter(fn).length;
      return { hits, n: sample.length, pct: Math.round((hits / n) * 100) };
    };

    return {
      windowDays: wDays,
      sampleCount: sample.length,
      veryHot: prob(th.veryHot),
      veryCold: prob(th.veryCold),
      veryWet: prob(th.veryWet),
      veryWindy: prob(th.veryWindy),
      veryUncomfortable: prob(th.veryUncomfortable),
      sample,
    };
  }

  function buildCSV(area, month, day, windowDays, stats) {
    const header = [
      "name",
      "lat",
      "lng",
      "month",
      "day",
      "windowDays",
      "veryHot_pct",
      "veryCold_pct",
      "veryWet_pct",
      "veryWindy_pct",
      "veryUncomfortable_pct",
      "sampleCount",
    ].join(",");

    const meta = [
      csvSafe(area?.name || ""),
      area?.lat ?? "",
      area?.lng ?? "",
      month,
      day,
      windowDays,
      stats?.veryHot?.pct ?? "",
      stats?.veryCold?.pct ?? "",
      stats?.veryWet?.pct ?? "",
      stats?.veryWindy?.pct ?? "",
      stats?.veryUncomfortable?.pct ?? "",
      stats?.sampleCount ?? "",
    ].join(",");

    const rowsHeader = "date,T2M,RH2M,WS2M,PRECTOTCORR";
    const rows = (stats?.sample || [])
      .map(
        (r) =>
          `${r.date},${val(r.T2M)},${val(r.RH2M)},${val(r.WS2M)},${val(
            r.PRECTOTCORR
          )}`
      )
      .join("\n");

    const info =
      "# source: NASA POWER (temporal=daily, point); units: T2M=°C, RH2M=%, WS2M=m/s, PRECTOTCORR=mm/day\n";
    const csv = `${info}${header}\n${meta}\n\n${rowsHeader}\n${rows}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    return URL.createObjectURL(blob);
  }
  const csvSafe = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const val = (x) => (x == null ? "" : x);

  async function runStats(lat, lng, m, d, w) {
    if (powerAbortRef.current) powerAbortRef.current.abort();
    const ac = new AbortController();
    powerAbortRef.current = ac;

    setLoadingStats(true);
    setStatsErr(null);
    setStats(null);
    if (csvURL) {
      URL.revokeObjectURL(csvURL);
      setCsvURL(null);
    }

    try {
      const rows = await fetchPowerDailyRange(lat, lng, ac.signal);
      const s = computeProbabilities(rows, m, d, w);
      setStats(s);
      const url = buildCSV({ name: selectedArea?.name, lat, lng }, m, d, w, s);
      setCsvURL(url);
    } catch (e) {
      setStatsErr(e.message || "统计失败");
    } finally {
      setLoadingStats(false);
    }
  }

  // ====== 反/正向地理编码 & 地图交互 ======

  // 反向：点击获取行政区名
  const fetchAreaInfo = async (lat, lng) => {
    if (reverseAbortRef.current) reverseAbortRef.current.abort();
    const ac = new AbortController();
    reverseAbortRef.current = ac;

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

  // 正向：搜索地点
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

    const map = mapRef.current;
    if (map)
      map.setView([lat, lng], Math.max(map.getZoom(), 8), { animate: true });

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

  // 让父组件可触发搜索
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
    });

    useEffect(() => {
      mapRef.current = map;
    }, [map]);

    return null;
  }

  // ====== UI 渲染 ======
  return (
    <>
      <MapContainer
        center={[20, 0]}
        zoom={3}
        style={{ width: "100%", height: "100%" }}
        worldCopyJump
        preferCanvas
        whenCreated={(m) => (mapRef.current = m)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap
        />
        <Interactions />
      </MapContainer>

      {/* 左下角：概率计算控件 */}
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          zIndex: 2147483647,
          padding: 12,
          borderRadius: 10,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontFamily: "system-ui",
          minWidth: 280,
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          历史概率（NASA POWER）
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label>
            月
            <input
              type="number"
              min="1"
              max="12"
              value={month}
              onChange={(e) => setMonth(clampInt(e.target.value, 1, 12))}
              style={numInput()}
            />
          </label>
          <label>
            日
            <input
              type="number"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(clampInt(e.target.value, 1, 31))}
              style={numInput()}
            />
          </label>
          <label title="以目标日期为中心的窗口（天），例如 3 表示 ±3 天">
            ±天
            <input
              type="number"
              min="0"
              max="15"
              value={windowDays}
              onChange={(e) => setWindowDays(clampInt(e.target.value, 0, 15))}
              style={numInput()}
            />
          </label>
          <button
            onClick={() => {
              if (!selectedArea)
                return alert("先在地图上点一个位置或搜索地点。");
              runStats(
                selectedArea.lat,
                selectedArea.lng,
                month,
                day,
                windowDays
              );
            }}
            style={btn("#1f8fff")}
          >
            计算概率
          </button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
          位置：
          {selectedArea
            ? `${selectedArea.name} (${selectedArea.lat?.toFixed(
                3
              )}, ${selectedArea.lng?.toFixed(3)})`
            : "未选择"}
        </div>
      </div>

      {/* 右下角：结果面板 */}
      <div
        style={{
          position: "absolute",
          right: 12,
          bottom: 12,
          zIndex: 2147483647,
          minWidth: 280,
          maxWidth: 420,
          padding: 12,
          borderRadius: 10,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontFamily: "system-ui",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>结果</div>

        {loadingStats ? (
          <div>统计中…（按年抓取 POWER 数据）</div>
        ) : statsErr ? (
          <div>出错：{statsErr}</div>
        ) : stats ? (
          <>
            <div style={{ marginBottom: 6, opacity: 0.85, fontSize: 12 }}>
              样本：{stats.sampleCount} 天（{month}/{day} ± {stats.windowDays}{" "}
              天，1995—至今，日值）
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>
                Very hot（T2M &gt; 32°C）：<b>{stats.veryHot.pct}%</b>（
                {stats.veryHot.hits}/{stats.veryHot.n}）
              </li>
              <li>
                Very cold（T2M &lt; 0°C）：<b>{stats.veryCold.pct}%</b>（
                {stats.veryCold.hits}/{stats.veryCold.n}）
              </li>
              <li>
                Very wet（PRECTOT ≥ 10 mm）：<b>{stats.veryWet.pct}%</b>（
                {stats.veryWet.hits}/{stats.veryWet.n}）
              </li>
              <li>
                Very windy（WS2M ≥ 10 m/s）：<b>{stats.veryWindy.pct}%</b>（
                {stats.veryWindy.hits}/{stats.veryWindy.n}）
              </li>
              <li>
                Very uncomfortable（T2M ≥ 32 且 RH2M ≥ 60%）：
                <b>{stats.veryUncomfortable.pct}%</b>（
                {stats.veryUncomfortable.hits}/{stats.veryUncomfortable.n}）
              </li>
            </ul>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              {csvURL ? (
                <a
                  href={csvURL}
                  download={`nasa_power_prob_${(
                    selectedArea?.name || "location"
                  ).replace(/\s+/g, "_")}_${month}_${day}_pm${windowDays}.csv`}
                  style={{
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#1f8fff",
                    color: "#fff",
                  }}
                >
                  下载 CSV
                </a>
              ) : null}
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                数据源：NASA POWER（temporal=daily, point）
              </span>
            </div>
          </>
        ) : (
          <div>在左下选择日期并点击“计算概率”。</div>
        )}
      </div>
    </>
  );
}

const numInput = () => ({
  width: 64,
  marginLeft: 6,
  padding: "6px 8px",
  borderRadius: 8,
  border: 0,
  outline: "none",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
});

// 小工具
function clampInt(v, min, max) {
  let n = parseInt(v, 10);
  if (Number.isNaN(n)) n = min;
  return Math.max(min, Math.min(max, n));
}
