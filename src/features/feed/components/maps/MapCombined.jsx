import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSocket } from "../../../../hooks/useSocket.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const MapCombined = ({ enabled = true }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const offMarkersRef = useRef({});
    const defMarkersRef = useRef({});

    const offCamId = import.meta.env.VITE_OFF_CAM_ID;
    const defCamId = import.meta.env.VITE_DEF_CAM_ID;

    const { realtimeData: offData } = useSocket(offCamId, enabled);
    const { realtimeData: defData } = useSocket(defCamId, enabled);

    useEffect(() => {
        if (mapRef.current) return;
        mapRef.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/satellite-streets-v12",
            center: [101.17, 14.29],
            zoom: 14,
        });
    }, []);

    // 🟥 Offensive drones
    useEffect(() => {
        const objects = offData?.data?.objects || offData?.objects;
        if (!objects || !mapRef.current) return;

        objects.forEach((obj) => {
            const { obj_id, lat, lng, size } = obj;
            if (offMarkersRef.current[obj_id]) {
                offMarkersRef.current[obj_id].setLngLat([lng, lat]);
            } else {
                const el = document.createElement("div");
                const sizePx =
                    size === "large" ? 50 : size === "medium" ? 40 : 30;
                el.style.width = `${sizePx}px`;
                el.style.height = `${sizePx}px`;
                el.style.background =
                    "linear-gradient(135deg, rgba(248,113,113,0.9), rgba(251,113,133,0.9))";
                el.style.borderRadius = "50%";
                el.style.border = "1px solid rgba(255,255,255,0.7)";
                el.style.boxShadow = "0 0 12px rgba(248,113,113,0.6)";
                el.style.cursor = "pointer";

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .addTo(mapRef.current);

                offMarkersRef.current[obj_id] = marker; // ✅ store Marker, not el
            }
        });
    }, [offData]);

    // 🟢 Defensive drones
    useEffect(() => {
        const objects = defData?.data?.objects || defData?.objects;
        if (!objects || !mapRef.current) return;

        objects.forEach((obj) => {
            const { obj_id, lat, lng, size } = obj;
            if (defMarkersRef.current[obj_id]) {
                defMarkersRef.current[obj_id].setLngLat([lng, lat]);
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

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .addTo(mapRef.current);

                defMarkersRef.current[obj_id] = marker; // ✅ store Marker, not el
            }
        });
    }, [defData]);

    return (
        <div className="map-surface">
            <div ref={mapContainer} className="map-surface__canvas" />
            <div className="map-status">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-rose-400 to-emerald-300" />
                Combined stream
            </div>
        </div>
    );
};

export default MapCombined;
