import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Drone } from "lucide-react";
import { useSocket } from "../../../../hooks/useSocket.js";
import {
    createCameraConfig,
    hasCameraConfig,
} from "../../../../utils/cameraConfig.js";
import { normalizeOffensiveData } from "../../../../utils/normalizeOffensiveData.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const parseAltitude = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const formatCoord = (value) =>
    Number.isFinite(value) ? value.toFixed(5) : "-";

const formatAltitude = (value) => (Number.isFinite(value) ? `${value} m` : "-");

const formatTime = (value) =>
    value ? new Date(value).toLocaleTimeString("th-TH") : "-";

const formatDetailTimestamp = (value) =>
    value ? new Date(value).toLocaleString("th-TH") : "-";

const PATH_TTL_MS =
    Number(import.meta.env.VITE_OFFENSIVE_PATH_TTL_MS) || 3 * 60 * 1000;
const PATH_MAX_POINTS =
    Number(import.meta.env.VITE_OFFENSIVE_PATH_MAX_POINTS) || 500;

const offensiveCameraConfig = createCameraConfig({
    mock: import.meta.env.VITE_OFF_CAM_ID,
    real: import.meta.env.VITE_OFF_CAM_ID_REAL,
});

const MapOffensive = ({ enabled = true }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});
    const pathsRef = useRef({});
    const latestTelemetryRef = useRef({});
    const [selectedDrone, setSelectedDrone] = useState(null);
    const selectedDroneRef = useRef(null);

    const hasCamIds = hasCameraConfig(offensiveCameraConfig);
    const { realtimeData, isConnected, mode } = useSocket(
        offensiveCameraConfig,
        enabled && hasCamIds,
        { events: ["object_detection"] }
    );

    useEffect(() => {
        selectedDroneRef.current = selectedDrone;
    }, [selectedDrone]);

    useEffect(() => {
        if (!enabled) {
            setSelectedDrone(null);
        }
    }, [enabled]);

    const updatePathSource = () => {
        if (!mapRef.current) return;
        const source = mapRef.current.getSource("offensive-paths");
        if (!source || typeof source.setData !== "function") return;

        const features = Object.entries(pathsRef.current)
            .filter(([, data]) => data.coordinates.length > 1)
            .map(([droneId, data]) => ({
                type: "Feature",
                properties: { droneId },
                geometry: {
                    type: "LineString",
                    coordinates: data.coordinates,
                },
            }));

        source.setData({
            type: "FeatureCollection",
            features,
        });
    };

    const pruneStalePaths = (now = Date.now()) => {
        let changed = false;
        Object.entries(pathsRef.current).forEach(([droneId, data]) => {
            if (now - data.lastUpdate > PATH_TTL_MS) {
                delete pathsRef.current[droneId];
                if (markersRef.current[droneId]) {
                    markersRef.current[droneId].remove();
                    delete markersRef.current[droneId];
                }
                delete latestTelemetryRef.current[droneId];
                if (selectedDroneRef.current?.markerId === droneId) {
                    setSelectedDrone(null);
                }
                changed = true;
            }
        });
        if (changed) {
            updatePathSource();
        }
    };

    // ✅ initialize map once (with 3D terrain + buildings)
    useEffect(() => {
        if (mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/satellite-streets-v12",
            center: [101.171298, 14.286451],
            zoom: 15,
            pitch: 60, // มุมกล้องเอียง (สำหรับมุมมอง 3D)
            bearing: -20, // หมุนกล้องเล็กน้อย
            antialias: true, // ขอบภาพเนียนขึ้น
        });

        mapRef.current = map;

        map.on("style.load", () => {
            // --- เพิ่มแหล่งข้อมูล Terrain (DEM) ---
            map.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                tileSize: 512,
                maxzoom: 14,
            });

            // --- เปิด Terrain 3D ---
            map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

            // --- เพิ่มอาคาร 3D (fill-extrusion layer) ---
            const layers = map.getStyle().layers;
            const labelLayerId = layers.find(
                (layer) => layer.type === "symbol" && layer.layout["text-field"]
            )?.id;

            map.addLayer(
                {
                    id: "3d-buildings",
                    source: "composite",
                    "source-layer": "building",
                    filter: ["==", "extrude", "true"],
                    type: "fill-extrusion",
                    minzoom: 15,
                    paint: {
                        "fill-extrusion-color": "#aaa",
                        "fill-extrusion-height": ["get", "height"],
                        "fill-extrusion-base": ["get", "min_height"],
                        "fill-extrusion-opacity": 0.6,
                    },
                },
                labelLayerId
            );

            if (!map.getSource("offensive-paths")) {
                map.addSource("offensive-paths", {
                    type: "geojson",
                    data: { type: "FeatureCollection", features: [] },
                });
            }

            if (!map.getLayer("offensive-paths")) {
                map.addLayer({
                    id: "offensive-paths",
                    type: "line",
                    source: "offensive-paths",
                    paint: {
                        "line-color": "#fb7185",
                        "line-width": 3,
                        "line-opacity": 0.85,
                    },
                });
            }
            updatePathSource();
        });

        return () => {};
    }, []);

    // ✅ update markers & auto-center
    useEffect(() => {
        if (!enabled) return;

        const normalized = normalizeOffensiveData(realtimeData);
        const objects = normalized.objects;
        const timestamp = normalized.timestamp;

        if (!objects || !mapRef.current) {
            console.log("⚠️ No objects or map not ready");
            return;
        }

        console.log("🛰 Updating map with objects:", objects);

        // --- Create or update markers ---
        const now = Date.now();

        objects.forEach((obj) => {
            const { id, droneId, lat, long, alt } = obj;
            const altitude = parseAltitude(alt);
            const markerId = id || droneId;

            if (!Number.isFinite(lat) || !Number.isFinite(long)) {
                console.warn("⚠️ Skipping object with invalid coords:", obj);
                return;
            }

            const existingPath = pathsRef.current[markerId] || {
                coordinates: [],
                lastUpdate: 0,
            };
            if (!pathsRef.current[markerId]) {
                pathsRef.current[markerId] = existingPath;
            }
            const coords = existingPath.coordinates.concat([[long, lat]]);
            pathsRef.current[markerId] = {
                coordinates:
                    coords.length > PATH_MAX_POINTS
                        ? coords.slice(coords.length - PATH_MAX_POINTS)
                        : coords,
                lastUpdate: now,
            };
            latestTelemetryRef.current[markerId] = {
                markerId,
                droneId: droneId || markerId,
                altitude,
                lat,
                long,
                lastPing: obj.timestamp || timestamp,
            };

            if (markersRef.current[markerId]) {
                // อัปเดตตำแหน่งและความสูง
                markersRef.current[markerId].setLngLat([long, lat]);
                if (markersRef.current[markerId].setAltitude) {
                    markersRef.current[markerId].setAltitude(altitude);
                }
            } else {
                const el = document.createElement("div");
                el.className = "drone-marker";
                const iconSize = 32;
                el.style.width = `${iconSize}px`;
                el.style.height = `${iconSize}px`;
                el.style.display = "flex";
                el.style.alignItems = "center";
                el.style.justifyContent = "center";
                el.style.background = "rgba(15,23,42,0.9)";
                el.style.borderRadius = "999px";
                el.style.border = "1px solid rgba(255,255,255,0.4)";
                el.style.boxShadow = "0 0 15px rgba(248,113,113,0.6)";
                el.style.cursor = "pointer";

                const icon = document.createElement("div");
                icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12h5"/><path d="M16.5 12h5"/><path d="M12 7.5v5"/><path d="M7 17.5l3.5-3.5"/><path d="M17 17.5L13.5 14"/><circle cx="12" cy="12" r="2"/></svg>`;
                el.appendChild(icon);

                const handleMarkerClick = (event) => {
                    event?.stopPropagation();
                    const latest = latestTelemetryRef.current[markerId] || {};
                    setSelectedDrone({
                        markerId,
                        droneId: latest.droneId || droneId || markerId,
                        altitude:
                            latest.altitude !== undefined
                                ? latest.altitude
                                : altitude,
                        lat: latest.lat ?? lat,
                        long: latest.long ?? long,
                        lastPing: latest.lastPing || obj.timestamp || timestamp,
                        trackPoints:
                            pathsRef.current[markerId]?.coordinates?.length ||
                            coords.length,
                    });
                };
                el.addEventListener("click", handleMarkerClick);

                const marker = new mapboxgl.Marker({
                    element: el,
                    altitude: altitude, // เพิ่มความสูงในแนวตั้ง
                    occludedOpacity: 0.3, // จางลงถ้าอยู่หลังภูเขา
                })
                    .setLngLat([long, lat])
                    .addTo(mapRef.current);

                markersRef.current[markerId] = marker;
            }
        });

        const selection = selectedDroneRef.current;
        if (selection) {
            const latest = objects.find((obj) => {
                const key = obj.id || obj.droneId;
                return key && key === selection.markerId;
            });
            if (latest) {
                const latestAltitude = parseAltitude(latest.alt);
                const updatedPayload = {
                    markerId: selection.markerId,
                    droneId: latest.droneId || selection.droneId,
                    altitude: latestAltitude,
                    lat: latest.lat,
                    long: latest.long,
                    lastPing: latest.timestamp || timestamp,
                    trackPoints:
                        pathsRef.current[selection.markerId]?.coordinates
                            ?.length || selection.trackPoints,
                };
                const changed =
                    updatedPayload.altitude !== selection.altitude ||
                    updatedPayload.lat !== selection.lat ||
                    updatedPayload.long !== selection.long ||
                    updatedPayload.lastPing !== selection.lastPing ||
                    updatedPayload.trackPoints !== selection.trackPoints;
                if (changed) {
                    setSelectedDrone((prev) =>
                        prev?.markerId === updatedPayload.markerId
                            ? updatedPayload
                            : prev
                    );
                }
            }
        }

        updatePathSource();

        // --- Auto-center & zoom ---
        const coords = objects.filter(
            (o) => Number.isFinite(o.lat) && Number.isFinite(o.long)
        );
        const lats = coords.map((o) => o.lat);
        const lngs = coords.map((o) => o.long);

        if (lats.length && lngs.length) {
            const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
            const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

            mapRef.current.flyTo({
                center: [avgLng, avgLat],
                zoom: 15,
                pitch: 60,
                bearing: -20,
                speed: 0.8,
                essential: true,
            });
        }
    }, [realtimeData, enabled]);

    useEffect(() => {
        if (!enabled) return;
        const interval = setInterval(() => {
            pruneStalePaths();
        }, Math.min(PATH_TTL_MS / 2, 30000));
        return () => clearInterval(interval);
    }, [enabled]);

    return (
        <div className="map-with-detail">
            <div className="map-with-detail__map">
                <div className="map-surface">
                    <div ref={mapContainer} className="map-surface__canvas" />

                    <div className="map-status">
                        <span
                            className={`map-status__dot ${
                                isConnected ? "bg-lime-300" : "bg-rose-400"
                            }`}
                        />
                        {isConnected ? "Connected" : "Disconnected"} ·{" "}
                        {mode?.toUpperCase()} socket
                    </div>
                </div>
            </div>
            {selectedDrone && (
                <DroneDetailPanel
                    data={selectedDrone}
                    onClose={() => setSelectedDrone(null)}
                />
            )}
        </div>
    );
};

const DroneDetailPanel = ({ data, onClose }) => (
    <div className="map-with-detail__detail">
        <div className="flex items-start justify-between gap-3">
            <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-rose-200/80">
                    Offensive Drone
                </p>
                <h3 className="text-xl font-semibold text-slate-50">
                    {data.droneId || data.markerId}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                    {data.trackPoints || 0} track points · Last ping{" "}
                    {formatDetailTimestamp(data.lastPing)}
                </p>
            </div>
            <button
                type="button"
                onClick={onClose}
                className="glass-button glass-button--ghost text-xs px-3 py-1"
            >
                Close
            </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-100">
            <DetailStat label="Latitude" value={formatCoord(data.lat)} />
            <DetailStat label="Longitude" value={formatCoord(data.long)} />
            <DetailStat
                label="Altitude"
                value={formatAltitude(data.altitude)}
            />
            <DetailStat label="Local time" value={formatTime(data.lastPing)} />
        </div>
        <div className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Click another drone marker to update this panel.
        </div>
    </div>
);

const DetailStat = ({ label, value }) => (
    <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
            {label}
        </p>
        <p className="text-base font-semibold text-slate-50">{value}</p>
    </div>
);

export default MapOffensive;
