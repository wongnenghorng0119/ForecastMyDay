import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./FlatView/MapStyles.css";
import MapInteractions from "./FlatView/MapInteractions";
import ProbabilityControls from "./FlatView/ProbabilityControls";
import ResultsPanel from "./FlatView/ResultsPanel";
import ProbabilityInsights from "./ProbabilityInsights";
import { fetchPowerDailyRange, computeProbabilities, buildCSV } from "../utils/nasaPowerApi";
import { searchPlace } from "../utils/geocoding";

// Fix default Marker icon aaa
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

const FlatView = ({ selectedArea, setSelectedArea, setSearchHandler, onSwitchToGlobe }) => {
  const markerRef = useRef(null);
  const mapRef = useRef(null);

  // Abort control
  const reverseAbortRef = useRef(null);
  const searchAbortRef = useRef(null);
  const powerAbortRef = useRef(null);

  // Probability statistics UI state - now handled by calendar
  const [month, setMonth] = useState(6);
  const [day, setDay] = useState(15);
  const [windowDays, setWindowDays] = useState(3);

  // Results state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsErr, setStatsErr] = useState(null);
  const [csvURL, setCsvURL] = useState(null);
  const [showResults, setShowResults] = useState(false);

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

    // Update state with the new values
    setMonth(m);
    setDay(d);
    setWindowDays(w);

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

  // Forward: search place
  const handleSearchPlace = async (query) => {
    if (!query) return;
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;

    const result = await searchPlace(query, ac.signal);
    if (!result) return;

    const { lat, lng, name, type } = result;

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

  // Allow parent component to trigger searchsss
  useEffect(() => {
    setSearchHandler?.(handleSearchPlace);
    return () => setSearchHandler?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <MapContainer
        center={[20, 0]}
        zoom={3}
        style={{ 
          width: "100%", 
          height: "100%", 
          zIndex: 1,
          // Mobile responsive
          [`@media (max-width: 480px)`]: {
            minHeight: "50vh"
          }
        }}
        worldCopyJump
        whenCreated={(m) => (mapRef.current = m)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap
        />
        <MapInteractions
          markerRef={markerRef}
          mapRef={mapRef}
          setSelectedArea={setSelectedArea}
          setStats={setStats}
          setStatsErr={setStatsErr}
          setCsvURL={setCsvURL}
          csvURL={csvURL}
          onSwitchToGlobe={onSwitchToGlobe}
        />
      </MapContainer>

      <ProbabilityControls
        selectedArea={selectedArea}
        onCalculate={runStats}
      />

      {/* Full-page loading overlay while fetching stats */}
      {loadingStats && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            zIndex: 2147483646,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: "system-ui",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div style={{ width: 40, height: 40, border: "4px solid #66aaff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 14, opacity: 0.9 }}>Loading NASA POWER data…</div>
          <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

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

      {stats && (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            zIndex: 2147483647,
            minWidth: 340,
            maxWidth: 560,
            padding: 12,
            borderRadius: 10,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontFamily: "system-ui",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.12)",
            // Mobile responsive
            [`@media (max-width: 768px)`]: {
              right: 8,
              top: 8,
              minWidth: 280,
              maxWidth: "calc(100vw - 16px)",
              padding: 10
            },
            [`@media (max-width: 480px)`]: {
              right: 4,
              top: 4,
              minWidth: "calc(100vw - 8px)",
              maxWidth: "calc(100vw - 8px)",
              padding: 8,
              borderRadius: 6,
              boxSizing: "border-box"
            }
          }}
        >
          <ProbabilityInsights
            title={`Insights${selectedArea?.name ? ` • ${selectedArea.name}` : ""}`}
            data={{
              "Very hot": Number(stats.veryHot.pct),
              "Very cold": Number(stats.veryCold.pct),
              "Very wet": Number(stats.veryWet.pct),
              "Very windy": Number(stats.veryWindy.pct),
              "Very uncomfortable": Number(stats.veryUncomfortable.pct),
            }}
            maxBars={6}
          />
        </div>
      )}
    </>
  );
};

export default FlatView;