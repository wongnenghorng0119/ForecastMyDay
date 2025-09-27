import React, { useEffect } from "react";
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
        onSwitchToGlobe?.(center.lat, center.lng);
      }
    },
  });

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
};

export default MapInteractions;