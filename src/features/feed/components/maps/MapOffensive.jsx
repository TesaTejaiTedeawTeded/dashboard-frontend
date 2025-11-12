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

const parseAltitude = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const offensiveCameraConfig = createCameraConfig({
    mock: import.meta.env.VITE_OFF_CAM_ID,
    real: import.meta.env.VITE_OFF_CAM_ID_REAL,
});

const MapOffensive = ({ enabled = true }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});

    const hasCamIds = hasCameraConfig(offensiveCameraConfig);
    const { realtimeData, isConnected, mode } = useSocket(
        offensiveCameraConfig,
        enabled && hasCamIds,
        { events: ["object_detection"] }
    );

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
        });
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
        objects.forEach((obj) => {
            const { id, droneId, lat, long, alt } = obj;
            const altitude = parseAltitude(alt);
            const markerId = id || droneId;

            if (!Number.isFinite(lat) || !Number.isFinite(long)) {
                console.warn("⚠️ Skipping object with invalid coords:", obj);
                return;
            }

            if (markersRef.current[markerId]) {
                // อัปเดตตำแหน่งและความสูง
                markersRef.current[markerId].setLngLat([long, lat]);
                if (markersRef.current[markerId].setAltitude) {
                    markersRef.current[markerId].setAltitude(altitude);
                }
            } else {
                const el = document.createElement("div");
                el.className = "drone-marker";
                const sizePx = 35 + (altitude ? Math.min(altitude / 5, 15) : 0);
                el.style.width = `${sizePx}px`;
                el.style.height = `${sizePx}px`;
                el.style.background =
                    "linear-gradient(135deg, rgba(248,113,113,0.9), rgba(239,68,68,0.9))";
                el.style.borderRadius = "50%";
                el.style.cursor = "pointer";
                el.style.border = "1px solid rgba(255,255,255,0.7)";
                el.style.boxShadow = "0 0 12px rgba(248,113,113,0.6)";

                const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
                    <div>
                        <strong>Offensive drone</strong><br/>
                        ID: ${droneId || markerId}<br/>
                        Altitude: ${altitude} m<br/>
                        Lat: ${lat.toFixed(5)}<br/>
                        Long: ${long.toFixed(5)}<br/>
                        Time: ${new Date(
                            obj.timestamp || timestamp
                        ).toLocaleTimeString()}
                    </div>
                `);

                const marker = new mapboxgl.Marker({
                    element: el,
                    altitude: altitude, // เพิ่มความสูงในแนวตั้ง
                    occludedOpacity: 0.3, // จางลงถ้าอยู่หลังภูเขา
                })
                    .setLngLat([long, lat])
                    .setPopup(popup)
                    .addTo(mapRef.current);

                markersRef.current[markerId] = marker;
            }
        });

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
                pitch: 60, // คงมุมมอง 3D
                bearing: -20,
                speed: 0.8,
                essential: true,
            });
        }
    }, [realtimeData, enabled]);

    return (
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
    );
};

export default MapOffensive;
