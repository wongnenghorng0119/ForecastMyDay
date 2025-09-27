import React, { useRef } from "react";
import Globe from "react-globe.gl";
import { geoCentroid, geoBounds } from "d3-geo";

const GlobeView = ({ features, selectedName, onPick }) => {
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
};

export default GlobeView;