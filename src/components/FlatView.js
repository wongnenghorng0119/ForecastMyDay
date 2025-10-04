import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./css/MapStyles.css";
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

    // Store start time to ensure minimum loading duration
    const startTime = Date.now();
    const minLoadingTime = 2000; // Minimum 800ms loading time

    try {
      const rows = await fetchPowerDailyRange(lat, lng, ac.signal);
      const s = computeProbabilities(rows, m, d, w);
      setStats(s);
      const url = buildCSV({ name: selectedArea?.name, lat, lng }, m, d, w, s);
      setCsvURL(url);
      
      // Ensure minimum loading time has passed
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
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
        hideWhenResultsOpen={showResults}
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


    </>
  );
};

export default FlatView;