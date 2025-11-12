import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSocket } from "../../../../hooks/useSocket.js";
import { normalizeDefenseData } from "../../../../utils/normalizeDefenseData.js";
import {
    createCameraConfig,
    hasCameraConfig,
} from "../../../../utils/cameraConfig.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const parseAltitude = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const defensiveCameraConfig = createCameraConfig({
    mock: import.meta.env.VITE_DEF_CAM_ID,
    real: import.meta.env.VITE_DEF_CAM_ID_REAL,
});

const MapDefensive = ({ enabled = true }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});

    const hasCamIds = hasCameraConfig(defensiveCameraConfig);
    const { realtimeData, isConnected, mode } = useSocket(
        defensiveCameraConfig,
        enabled && hasCamIds,
        { events: ["defensive_alert", "object_detection"] }
    );

    // ✅ สร้างแผนที่พร้อม 3D Terrain + Buildings
    useEffect(() => {
        if (mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/satellite-streets-v12",
            center: [101.166363, 14.298039],
            zoom: 15,
            pitch: 60, // มุมมองเอียงเพื่อเห็น terrain
            bearing: -20, // หมุนมุมกล้อง
            antialias: true, // render 3D เนียนขึ้น
        });

        mapRef.current = map;

        // --- เมื่อ style โหลดแล้วค่อยเพิ่ม Terrain/Buildings ---
        map.on("style.load", () => {
            // เพิ่ม Terrain DEM
            map.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                tileSize: 512,
                maxzoom: 14,
            });

            // เปิด Terrain
            map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

            // เพิ่มอาคาร 3D
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

    // ✅ อัปเดต marker ตาม realtimeData
    useEffect(() => {
        if (!enabled || !realtimeData || !mapRef.current) return;
        const normalized = normalizeDefenseData(realtimeData);
        const objects = normalized.objects;
        if (!objects.length) return;

        objects.forEach((obj) => {
            const { objId, lat, long, alt } = obj;
            const altitude = parseAltitude(alt);

            if (markersRef.current[objId]) {
                markersRef.current[objId].setLngLat([long, lat]);
                if (markersRef.current[objId].setAltitude) {
                    markersRef.current[objId].setAltitude(altitude);
                }
            } else {
                const el = document.createElement("div");
                el.className = "drone-marker";
                const sizePx = 35 + (alt ? Math.min(alt / 5, 15) : 0);
                el.style.width = `${sizePx}px`;
                el.style.height = `${sizePx}px`;
                el.style.background =
                    "linear-gradient(135deg, rgba(163,230,53,0.9), rgba(16,185,129,0.9))";
                el.style.borderRadius = "50%";
                el.style.border = "1px solid rgba(255,255,255,0.8)";
                el.style.boxShadow = "0 0 12px rgba(16,185,129,0.5)";
                el.style.cursor = "pointer";

                const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
                    <div>
                        <strong>Drone</strong><br/>
                        ID: ${objId}<br/>
                        Lat: ${lat.toFixed(5)}<br/>
                        Long: ${long.toFixed(5)}<br/>
                        Altitude: ${altitude} m
                    </div>
                `);

                const marker = new mapboxgl.Marker({
                    element: el,
                    altitude: altitude, // ความสูง marker
                    occludedOpacity: 0.3, // จางลงถ้าถูก terrain บัง
                })
                    .setLngLat([long, lat])
                    .setPopup(popup)
                    .addTo(mapRef.current);

                markersRef.current[objId] = marker;
            }
        });

        // --- Auto-center ---
        const avgLat =
            objects.reduce((sum, o) => sum + o.lat, 0) / objects.length;
        const avgLong =
            objects.reduce((sum, o) => sum + o.long, 0) / objects.length;

        mapRef.current.flyTo({
            center: [avgLong, avgLat],
            zoom: 15,
            pitch: 60, // คงมุมมอง 3D
            bearing: -20,
            speed: 0.8,
            essential: true,
        });
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

export default MapDefensive;
