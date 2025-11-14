import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Drone, Shield } from "lucide-react";
import { useSocket } from "../../../../hooks/useSocket.js";
import {
    createCameraConfig,
    hasCameraConfig,
} from "../../../../utils/cameraConfig.js";
import { normalizeOffensiveData } from "../../../../utils/normalizeOffensiveData.js";
import { buildPopupContent } from "./popupTemplate.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// ✅ Helper: ตรวจและแปลงค่าความสูง
const parseAltitude = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const formatCoord = (value) =>
    Number.isFinite(value) ? value.toFixed(5) : "-";

const formatAltitude = (value) =>
    Number.isFinite(value) ? `${value} m` : "-";

// ✅ Helper: ตรวจพิกัดว่าถูกต้องหรือไม่
const isValidCoordinate = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng);

const toTimestampMs = (value) => {
    if (!value) return 0;
    const date = new Date(value);
    const ms = date.getTime();
    return Number.isFinite(ms) ? ms : 0;
};

const formatTimestampLabel = (value) => {
    if (!value) return "Pending ping";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Pending ping";
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const DRONE_CHANNEL_META = {
    offensive: {
        label: "Offensive",
        badgeClass: "text-rose-200 border border-rose-400/20 bg-rose-500/10",
        Icon: Drone,
    },
    defensive: {
        label: "Defensive",
        badgeClass:
            "text-emerald-200 border border-emerald-400/20 bg-emerald-500/10",
        Icon: Shield,
    },
};

const offensiveCameraConfig = createCameraConfig({
    mock: import.meta.env.VITE_OFF_CAM_ID,
    real: import.meta.env.VITE_OFF_CAM_ID_REAL,
});

const defensiveCameraConfig = createCameraConfig({
    mock: import.meta.env.VITE_DEF_CAM_ID,
    real: import.meta.env.VITE_DEF_CAM_ID_REAL,
});

const MapCombined = ({ enabled = true }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const offMarkersRef = useRef({});
    const defMarkersRef = useRef({});
    const [offTelemetry, setOffTelemetry] = useState([]);
    const [defTelemetry, setDefTelemetry] = useState([]);
    const [focusedDroneId, setFocusedDroneId] = useState(null);

    const hasOffensiveCams = hasCameraConfig(offensiveCameraConfig);
    const hasDefensiveCams = hasCameraConfig(defensiveCameraConfig);

    const {
        realtimeData: offData,
        isConnected: isOffConnected,
        mode: offMode,
    } = useSocket(
        offensiveCameraConfig,
        enabled && hasOffensiveCams,
        { events: ["object_detection"] }
    );
    const {
        realtimeData: defData,
        isConnected: isDefConnected,
        mode: defMode,
    } = useSocket(
        defensiveCameraConfig,
        enabled && hasDefensiveCams,
        { events: ["defensive_alert", "object_detection"] }
    );
    const socketMode = offMode || defMode;
    const isConnected = isOffConnected || isDefConnected;

    const droneEntries = useMemo(() => {
        const combined = [...offTelemetry, ...defTelemetry];
        combined.sort(
            (a, b) => toTimestampMs(b.timestamp) - toTimestampMs(a.timestamp)
        );
        return combined;
    }, [offTelemetry, defTelemetry]);

    useEffect(() => {
        if (!focusedDroneId) return;
        const stillExists = droneEntries.some(
            (drone) => drone.markerId === focusedDroneId
        );
        if (!stillExists) {
            setFocusedDroneId(null);
        }
    }, [droneEntries, focusedDroneId]);

    const flyToDrone = (drone) => {
        if (!drone || !mapRef.current) return;
        mapRef.current.flyTo({
            center: [drone.longitude, drone.latitude],
            zoom: 15.5,
            pitch: 60,
            bearing: -20,
            speed: 0.8,
            essential: true,
        });

    };

    const handleDroneClick = (drone) => {
        setFocusedDroneId(drone.markerId);
        flyToDrone(drone);
    };

    // ✅ Initialize map once (with 3D terrain and buildings)
    useEffect(() => {
        if (mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/satellite-streets-v12",
            center: [101.17, 14.29],
            zoom: 14,
            pitch: 60, // มุมเอียง
            bearing: -20, // หมุนกล้องเล็กน้อย
            antialias: true, // ขอบภาพเนียนขึ้น
        });

        mapRef.current = map;

        map.on("style.load", () => {
            // --- Terrain DEM ---
            map.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                tileSize: 512,
                maxzoom: 14,
            });

            // --- Enable 3D terrain ---
            map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

            // --- Add 3D buildings ---
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
        });
    }, []);

    // 🟥 Offensive drones
    useEffect(() => {
        if (!enabled) {
            setOffTelemetry([]);
            return;
        }
        const normalized = normalizeOffensiveData(offData);
        const objects = normalized.objects || [];

        const offList = objects
            .map((obj) => {
                const markerId = obj.id || obj.droneId;
                const latitude = Number(obj.lat);
                const longitude = Number(obj.long);
                if (!markerId || !isValidCoordinate(latitude, longitude))
                    return null;
                return {
                    markerId,
                    droneId: obj.droneId || obj.id || markerId,
                    latitude,
                    longitude,
                    altitude: parseAltitude(obj.alt),
                    timestamp: obj.timestamp,
                    channel: "offensive",
                };
            })
            .filter(Boolean);
        setOffTelemetry(offList);
        if (!objects.length || !mapRef.current) return;

        objects.forEach((obj) => {
            const { id, droneId, lat, long, alt } = obj;
            const markerId = id || droneId;
            const latitude = Number(lat);
            const longitude = Number(long);
            const altitude = parseAltitude(alt);

            if (!isValidCoordinate(latitude, longitude)) {
                console.warn("⚠️ Invalid coordinates (Off):", obj);
                return;
            }

            if (offMarkersRef.current[markerId]) {
                offMarkersRef.current[markerId].setLngLat([
                    longitude,
                    latitude,
                ]);
                if (offMarkersRef.current[markerId].setAltitude)
                    offMarkersRef.current[markerId].setAltitude(altitude);
            } else {
                const el = document.createElement("div");
                const iconSize = 28;
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

                const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
                    buildPopupContent({
                        title: "Offensive Drone",
                        accent: "#fb7185",
                        rows: [
                            { label: "ID", value: droneId || markerId },
                            { label: "Altitude", value: formatAltitude(altitude) },
                            { label: "Lat", value: formatCoord(latitude) },
                            { label: "Long", value: formatCoord(longitude) },
                        ],
                        metaLabel: "Ping",
                        metaValue: new Date(obj.timestamp || Date.now()).toLocaleTimeString("th-TH"),
                    })
                );

                const marker = new mapboxgl.Marker({
                    element: el,
                    altitude: altitude,
                    occludedOpacity: 0.3,
                })
                    .setLngLat([longitude, latitude])
                    .setPopup(popup)
                    .addTo(mapRef.current);

                offMarkersRef.current[markerId] = marker;
            }
        });
    }, [offData, enabled]);

    // 🟢 Defensive drones
    useEffect(() => {
        if (!enabled) {
            setDefTelemetry([]);
            return;
        }
        const fallbackDefTimestamp =
            defData?.timestamp ||
            defData?.createdAt ||
            defData?.updatedAt ||
            defData?.detectedAt ||
            defData?.data?.timestamp ||
            defData?.data?.createdAt;
        const objectsSource =
            defData?.data?.objects || defData?.objects || defData?.detections;
        const objects = Array.isArray(objectsSource) ? objectsSource : [];

        setDefTelemetry(
            objects
                .map((obj) => {
                    const { obj_id, objId, lat, lng, long, alt } = obj;
                    const markerId = obj_id || objId;
                    const longitude = Number(lng ?? long);
                    const latitude = Number(lat);
                    if (!markerId || !isValidCoordinate(latitude, longitude))
                        return null;
                    return {
                        markerId,
                        droneId: markerId,
                        latitude,
                        longitude,
                        altitude: parseAltitude(alt),
                        timestamp:
                            obj.timestamp ||
                            obj.detected_at ||
                            fallbackDefTimestamp,
                        channel: "defensive",
                    };
                })
                .filter(Boolean)
        );

        if (!objects.length || !mapRef.current) return;

        objects.forEach((obj) => {
            const { obj_id, objId, lat, lng, long, size, alt } = obj;
            const id = obj_id || objId;
            const longitude = Number(lng ?? long);
            const latitude = Number(lat);
            const altitude = parseAltitude(alt);

            // ป้องกัน NaN
            if (!isValidCoordinate(latitude, longitude)) {
                console.warn("⚠️ Invalid coordinates (Def):", obj);
                return;
            }

            if (defMarkersRef.current[id]) {
                defMarkersRef.current[id].setLngLat([longitude, latitude]);
                if (defMarkersRef.current[id].setAltitude)
                    defMarkersRef.current[id].setAltitude(altitude);
            } else {
                const el = document.createElement("div");
                const iconSize = 28;
                el.style.width = `${iconSize}px`;
                el.style.height = `${iconSize}px`;
                el.style.display = "flex";
                el.style.alignItems = "center";
                el.style.justifyContent = "center";
                el.style.background = "rgba(15,23,42,0.9)";
                el.style.borderRadius = "999px";
                el.style.border = "1px solid rgba(255,255,255,0.4)";
                el.style.boxShadow = "0 0 15px rgba(34,197,94,0.6)";
                el.style.cursor = "pointer";

                const icon = document.createElement("div");
                icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#86efac" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M17.66 6.34l1.41-1.41"/><path d="M4.93 19.07l1.41-1.41"/></svg>`;
                el.appendChild(icon);

                const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
                    buildPopupContent({
                        title: "Defensive Drone",
                        accent: "#34d399",
                        rows: [
                            { label: "ID", value: id },
                            { label: "Altitude", value: formatAltitude(altitude) },
                            { label: "Lat", value: formatCoord(latitude) },
                            { label: "Long", value: formatCoord(longitude) },
                            size ? { label: "Size", value: size } : null,
                        ].filter(Boolean),
                        metaLabel: "Channel",
                        metaValue: "Defense",
                    })
                );

                const marker = new mapboxgl.Marker({
                    element: el,
                    altitude: altitude,
                    occludedOpacity: 0.3,
                })
                    .setLngLat([longitude, latitude])
                    .setPopup(popup)
                    .addTo(mapRef.current);

                defMarkersRef.current[id] = marker;
            }
        });
    }, [defData, enabled]);

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
                        Combined stream · {socketMode?.toUpperCase()} socket
                    </div>
                </div>
            </div>
            <div className="map-with-detail__detail">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">
                            Active drones
                        </p>
                        <h3 className="text-xl font-semibold text-white">
                            {droneEntries.length
                                ? `${droneEntries.length} contact${
                                      droneEntries.length > 1 ? "s" : ""
                                  }`
                                : "No contacts"}
                        </h3>
                        <p className="text-xs text-slate-400">
                            Tap an entry to focus the map.
                        </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.4em] text-white/50">
                        {socketMode?.toUpperCase() || "MOCK"} socket
                    </span>
                </div>

                {droneEntries.length ? (
                    <ul className="space-y-3">
                        {droneEntries.map((drone) => {
                            const meta =
                                DRONE_CHANNEL_META[drone.channel] ||
                                DRONE_CHANNEL_META.offensive;
                            const Icon = meta.Icon;
                            const isActive =
                                focusedDroneId === drone.markerId;
                            return (
                                <li key={`${drone.channel}-${drone.markerId}`}>
                                    <button
                                        type="button"
                                        onClick={() => handleDroneClick(drone)}
                                        className={`w-full text-left rounded-2xl border px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                                            isActive
                                                ? "border-white/40 bg-white/5 shadow-lg shadow-rose-500/10"
                                                : "border-white/10 hover:border-white/25 hover:bg-white/5"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 text-white">
                                                <span
                                                    className={`flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 ${isActive ? "border-white/30" : ""}`}
                                                >
                                                    <Icon
                                                        size={16}
                                                        className="text-white/80"
                                                    />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {drone.droneId}
                                                    </p>
                                                    <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                                                        Track {drone.markerId}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`text-[11px] px-2 py-0.5 rounded-full ${meta.badgeClass}`}
                                            >
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                                            <span>
                                                Lat:{" "}
                                                <strong className="text-slate-100">
                                                    {formatCoord(
                                                        drone.latitude
                                                    )}
                                                </strong>
                                            </span>
                                            <span className="text-right">
                                                Long:{" "}
                                                <strong className="text-slate-100">
                                                    {formatCoord(
                                                        drone.longitude
                                                    )}
                                                </strong>
                                            </span>
                                            <span>
                                                Alt:{" "}
                                                <strong className="text-slate-100">
                                                    {formatAltitude(
                                                        drone.altitude
                                                    )}
                                                </strong>
                                            </span>
                                            <span className="text-right">
                                                Ping:{" "}
                                                <strong className="text-slate-100">
                                                    {formatTimestampLabel(
                                                        drone.timestamp
                                                    )}
                                                </strong>
                                            </span>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="map-with-detail__media map-with-detail__media--empty h-auto py-8">
                        <div className="flex flex-col items-center gap-2 text-center px-4">
                            <IconPlaceholder />
                            <p className="text-sm text-slate-300">
                                Waiting for live drone telemetry
                            </p>
                            <p className="text-xs text-slate-500">
                                Once a drone reports in, it will appear here.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const IconPlaceholder = () => (
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60">
        <Drone size={20} />
    </div>
);

export default MapCombined;
