import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSocket } from "../../../../hooks/useSocket.js";
import {
    createCameraConfig,
    hasCameraConfig,
} from "../../../../utils/cameraConfig.js";
import { normalizeOffensiveData } from "../../../../utils/normalizeOffensiveData.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// ✅ Helper: ตรวจและแปลงค่าความสูง
const parseAltitude = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

// ✅ Helper: ตรวจพิกัดว่าถูกต้องหรือไม่
const isValidCoordinate = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng);

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
        if (!enabled) return;
        const normalized = normalizeOffensiveData(offData);
        const objects = normalized.objects;
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
                const sizePx = 30 + (altitude ? Math.min(altitude / 5, 20) : 0);
                el.style.width = `${sizePx}px`;
                el.style.height = `${sizePx}px`;
                el.style.background =
                    "linear-gradient(135deg, rgba(248,113,113,0.9), rgba(251,113,133,0.9))";
                el.style.borderRadius = "50%";
                el.style.border = "1px solid rgba(255,255,255,0.7)";
                el.style.boxShadow = "0 0 12px rgba(248,113,113,0.6)";
                el.style.cursor = "pointer";

                const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
                    <div>
                        <strong>Offensive Drone</strong><br/>
                        ID: ${droneId || markerId}<br/>
                        Lat: ${latitude.toFixed(5)}<br/>
                        Long: ${longitude.toFixed(5)}<br/>
                        Altitude: ${altitude} m
                    </div>
                `);

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
        if (!enabled) return;
        const objects = defData?.data?.objects || defData?.objects;
        if (!objects || !mapRef.current) return;

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
                const sizePx =
                    size === "large" ? 50 : size === "medium" ? 40 : 30;
                el.style.width = `${sizePx}px`;
                el.style.height = `${sizePx}px`;
                el.style.background =
                    "linear-gradient(135deg, rgba(34,197,94,0.9), rgba(16,185,129,0.9))";
                el.style.borderRadius = "50%";
                el.style.border = "1px solid rgba(255,255,255,0.7)";
                el.style.boxShadow = "0 0 12px rgba(34,197,94,0.6)";
                el.style.cursor = "pointer";

                const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
                    <div>
                        <strong>Defensive Drone</strong><br/>
                        ID: ${id}<br/>
                        Lat: ${latitude.toFixed(5)}<br/>
                        Long: ${longitude.toFixed(5)}<br/>
                        Altitude: ${altitude} m
                    </div>
                `);

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
    );
};

export default MapCombined;
