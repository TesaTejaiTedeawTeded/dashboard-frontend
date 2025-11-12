import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSocket } from "../../../../hooks/useSocket.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const MapOffensive = ({ enabled = true }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});

    const camId = import.meta.env.VITE_OFF_CAM_ID;
    const { realtimeData, isConnected } = useSocket(camId, enabled);

    // ✅ initialize map once
    useEffect(() => {
        if (mapRef.current) return;

        mapRef.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/satellite-streets-v12",
            center: [101.171298, 14.286451], // initial default, won't matter after first data
            zoom: 15,
        });
    }, []);

    // ✅ update markers & auto-center
    useEffect(() => {
        const objects = realtimeData?.data?.objects || realtimeData?.objects;
        const timestamp =
            realtimeData?.data?.timestamp || realtimeData?.timestamp;

        if (!objects || !mapRef.current) {
            console.log("⚠️ No objects or map not ready");
            return;
        }

        console.log("🛰 Updating map with objects:", objects);

        // --- Create or update markers ---
        objects.forEach((obj) => {
            const { obj_id, lat, lng, type, size, objective } = obj;

            if (markersRef.current[obj_id]) {
                markersRef.current[obj_id].setLngLat([lng, lat]);
            } else {
                const el = document.createElement("div");
                el.className = "drone-marker";
                el.style.width = size === "large" ? "50px" : "35px";
                el.style.height = size === "large" ? "50px" : "35px";
                el.style.background =
                    "linear-gradient(135deg, rgba(248,113,113,0.9), rgba(239,68,68,0.9))";
                el.style.borderRadius = "50%";
                el.style.cursor = "pointer";
                el.style.border = "1px solid rgba(255,255,255,0.7)";
                el.style.boxShadow = "0 0 12px rgba(248,113,113,0.6)";

                const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div>
                <strong>${type.toUpperCase()}</strong><br/>
                ID: ${obj_id}<br/>
                Objective: ${objective}<br/>
                Size: ${size}<br/>
                Time: ${new Date(timestamp).toLocaleTimeString()}
              </div>
            `);

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .setPopup(popup)
                    .addTo(mapRef.current);

                markersRef.current[obj_id] = marker;
            }
        });

        // --- Auto-center & zoom ---
        const lats = objects.map((o) => o.lat);
        const lngs = objects.map((o) => o.lng);

        if (lats.length && lngs.length) {
            const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
            const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

            mapRef.current.flyTo({
                center: [avgLng, avgLat],
                zoom: 15,
                speed: 0.8,
                essential: true,
            });
        }
    }, [realtimeData]);

    return (
        <div className="map-surface">
            <div ref={mapContainer} className="map-surface__canvas" />

            <div className="map-status">
                <span
                    className={`map-status__dot ${
                        isConnected ? "bg-lime-300" : "bg-rose-400"
                    }`}
                />
                {isConnected ? "Connected" : "Disconnected"}
            </div>
        </div>
    );
};

export default MapOffensive;
