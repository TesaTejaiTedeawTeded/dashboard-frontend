import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSocket } from "../../../../hooks/useSocket.js";
import { normalizeDefenseData } from "../../../../utils/normalizeDefenseData.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const MapDefensive = ({ enabled = true }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});

    const camId = import.meta.env.VITE_DEF_CAM_ID;
    const { realtimeData, isConnected } = useSocket(camId, enabled);

    useEffect(() => {
        if (mapRef.current) return;
        mapRef.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/satellite-streets-v12",
            center: [101.166363, 14.298039],
            zoom: 15,
        });
    }, []);

    useEffect(() => {
        if (!realtimeData || !mapRef.current) return;
        const normalized = normalizeDefenseData(realtimeData);
        const objects = normalized.objects;
        if (!objects.length) return;

        objects.forEach((obj) => {
            const { objId, lat, long, alt } = obj;

            if (markersRef.current[objId]) {
                markersRef.current[objId].setLngLat([long, lat]);
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
                        Alt: ${alt ?? "-"}
                    </div>
                `);

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([long, lat])
                    .setPopup(popup)
                    .addTo(mapRef.current);

                markersRef.current[objId] = marker;
            }
        });

        // Auto-center on avg position
        const avgLat =
            objects.reduce((sum, o) => sum + o.lat, 0) / objects.length;
        const avgLong =
            objects.reduce((sum, o) => sum + o.long, 0) / objects.length;

        mapRef.current.flyTo({
            center: [avgLong, avgLat],
            zoom: 15,
            speed: 0.8,
            essential: true,
        });
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

export default MapDefensive;
