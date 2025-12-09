import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// Fix default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/**
 * Component to auto-fit map bounds to both trajectories
 */
function MapBoundsHandler({ drPathCoords, gpsPathCoords }) {
  const map = useMap();

  useEffect(() => {
    const allCoords = [...drPathCoords, ...gpsPathCoords];
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [drPathCoords, gpsPathCoords, map]);

  return null;
}

/**
 * Renders the calculated path with toggle between SVG and Map view.
 * @param {object} props - Component props.
 * @param {Array<object>} props.path - Array of {x, y} points (DR path).
 * @param {object} props.gpsLocation - GPS location {latitude, longitude, accuracy}.
 */
export default function PathVisualizer({ path, gpsLocation }) {
  // Map view state
  const [drPathCoords, setDrPathCoords] = useState([]);
  const [gpsPathCoords, setGpsPathCoords] = useState([]);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [initialCenter, setInitialCenter] = useState(null);

  // Convert DR path (x,y in meters) to GPS coordinates
  useEffect(() => {
    if (!gpsLocation || path.length < 2) {
      setDrPathCoords([]);
      return;
    }

    // Use GPS location as origin (0,0) for DR path
    const originLat = gpsLocation.latitude;
    const originLon = gpsLocation.longitude;

    // Convert meters to lat/lon offset (approximate)
    // 1 degree latitude ≈ 111,320 meters
    // 1 degree longitude ≈ 111,320 * cos(latitude) meters
    const metersPerLatDegree = 111320;
    const metersPerLonDegree = 111320 * Math.cos((originLat * Math.PI) / 180);

    const coords = path.map((p) => {
      const lat = originLat + p.y / metersPerLatDegree;
      const lon = originLon + p.x / metersPerLonDegree;
      return [lat, lon];
    });

    setDrPathCoords(coords);

    // Set initial center to first GPS location
    if (!initialCenter && coords.length > 0) {
      setInitialCenter(coords[0]);
      setMapCenter(coords[0]);
    }
  }, [path, gpsLocation, initialCenter]);

  // Track GPS path as user moves
  useEffect(() => {
    if (!gpsLocation) return;

    const newPoint = [gpsLocation.latitude, gpsLocation.longitude];

    setGpsPathCoords((prev) => {
      // Avoid duplicate points (within 0.5m accuracy)
      const isDuplicate = prev.some((point) => {
        const distance = Math.sqrt(
          Math.pow((point[0] - newPoint[0]) * 111320, 2) +
          Math.pow(
            (point[1] - newPoint[1]) *
            111320 *
            Math.cos((point[0] * Math.PI) / 180),
            2
          )
        );
        return distance < 0.5;
      });

      if (isDuplicate) return prev;
      return [...prev, newPoint];
    });

    // Update map center to current GPS position
    setMapCenter(newPoint);
  }, [gpsLocation]);

  return (
    <div className="bg-white/10 p-4 rounded-lg mb-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Path Comparison
        </h3>
      </div>

      {/* Map Visualization */}
      <div
        className="w-full bg-zinc-800 rounded-md mt-2 overflow-hidden relative"
        style={{ height: "400px" }}
      >
        {gpsLocation &&
          (drPathCoords.length > 0 || gpsPathCoords.length > 0) ? (
          <MapContainer
            center={mapCenter}
            zoom={18}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapBoundsHandler
              drPathCoords={drPathCoords}
              gpsPathCoords={gpsPathCoords}
            />

            {/* GPS Path (Real Path) - Indigo */}
            {gpsPathCoords.length > 1 && (
              <>
                <Polyline
                  positions={gpsPathCoords}
                  pathOptions={{
                    color: "#818cf8",
                    weight: 4,
                    opacity: 0.8,
                  }}
                />
                {/* GPS Start Point */}
                <Circle
                  center={gpsPathCoords[0]}
                  radius={2}
                  pathOptions={{
                    color: "#818cf8",
                    fillColor: "#818cf8",
                    fillOpacity: 1,
                    weight: 2,
                  }}
                />
                {/* GPS Current Point */}
                <Circle
                  center={gpsPathCoords[gpsPathCoords.length - 1]}
                  radius={3}
                  pathOptions={{
                    color: "#818cf8",
                    fillColor: "#818cf8",
                    fillOpacity: 1,
                    weight: 2,
                  }}
                />
              </>
            )}

            {/* DR Path (Dead Reckoning) - Violet */}
            {drPathCoords.length > 1 && (
              <>
                <Polyline
                  positions={drPathCoords}
                  pathOptions={{
                    color: "#a78bfa",
                    weight: 4,
                    opacity: 0.8,
                    dashArray: "10, 5",
                  }}
                />
                {/* DR Start Point */}
                <Circle
                  center={drPathCoords[0]}
                  radius={2}
                  pathOptions={{
                    color: "#a78bfa",
                    fillColor: "#a78bfa",
                    fillOpacity: 1,
                    weight: 2,
                  }}
                />
                {/* DR Current Point */}
                <Circle
                  center={drPathCoords[drPathCoords.length - 1]}
                  radius={3}
                  pathOptions={{
                    color: "#a78bfa",
                    fillColor: "#a78bfa",
                    fillOpacity: 1,
                    weight: 2,
                  }}
                />
              </>
            )}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900/50">
            <p className="text-zinc-400 text-sm">
              {gpsLocation
                ? "Waiting for movement data..."
                : "Waiting for GPS signal..."}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-xs text-zinc-400 mt-2">
        <div className="flex items-center gap-4">
          <span>
            <span className="w-3 h-0.5 inline-block bg-indigo-500 mr-1"></span>
            Estimated Path
          </span>
        </div>
        <div className="text-zinc-500">Use map controls to navigate</div>
      </div>
    </div>
  );
}
