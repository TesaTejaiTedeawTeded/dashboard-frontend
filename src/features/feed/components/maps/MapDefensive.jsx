import { useEffect, useRef, useState } from "react";
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

const formatCoord = (value) =>
    Number.isFinite(value) ? value.toFixed(5) : "-";

const formatAltitude = (value) => (Number.isFinite(value) ? `${value} m` : "-");

const formatTime = (value) =>
    value ? new Date(value).toLocaleTimeString() : "-";

const formatDetailTimestamp = (value) =>
    value ? new Date(value).toLocaleString("th-TH") : "-";

const defensiveCameraConfig = createCameraConfig({
    mock: import.meta.env.VITE_DEF_CAM_ID,
    real: import.meta.env.VITE_DEF_CAM_ID_REAL,
});

const MapDefensive = ({ enabled = true }) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});
    const telemetryRef = useRef({});
    const [selectedObject, setSelectedObject] = useState(null);
    const selectedObjectRef = useRef(null);

    const hasCamIds = hasCameraConfig(defensiveCameraConfig);
    const { realtimeData, isConnected, mode } = useSocket(
        defensiveCameraConfig,
        enabled && hasCamIds,
        { events: ["defensive_alert", "object_detection"] }
    );

    useEffect(() => {
        selectedObjectRef.current = selectedObject;
    }, [selectedObject]);

    useEffect(() => {
        if (!enabled) {
            setSelectedObject(null);
        }
    }, [enabled]);

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
        return () => {};
    }, []);

    // ✅ อัปเดต marker ตาม realtimeData
    useEffect(() => {
        if (!enabled || !realtimeData || !mapRef.current) return;
        const normalized = normalizeDefenseData(realtimeData);
        const objects = normalized.objects;
        if (!objects.length) return;

        const timestamp = normalized.timestamp;
        const cameraLabel =
            realtimeData?.cameraId ||
            realtimeData?.camera?.id ||
            realtimeData?.data?.camera?.id ||
            "Defense net";

        objects.forEach((obj) => {
            const { objId, lat, long, alt } = obj;
            const altitude = parseAltitude(alt);
            telemetryRef.current[objId] = {
                objId,
                lat,
                long,
                altitude,
                timestamp,
                cameraLabel,
                image: normalized.imagePath,
                imageCandidates: normalized.imageCandidates,
            };

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

                const handleClick = (event) => {
                    event?.stopPropagation();
                    const latest = telemetryRef.current[objId];
                    if (latest) {
                        setSelectedObject({
                            ...latest,
                        });
                    }
                };
                el.addEventListener("click", handleClick);

                const marker = new mapboxgl.Marker({
                    element: el,
                    altitude: altitude, // ความสูง marker
                    occludedOpacity: 0.3, // จางลงถ้าถูก terrain บัง
                })
                    .setLngLat([long, lat])
                    .addTo(mapRef.current);

                markersRef.current[objId] = marker;
            }
        });

        const selection = selectedObjectRef.current;
        if (selection) {
            const updated = telemetryRef.current[selection.objId];
            if (updated) {
                const changed =
                    updated.lat !== selection.lat ||
                    updated.long !== selection.long ||
                    updated.altitude !== selection.altitude ||
                    updated.timestamp !== selection.timestamp ||
                    updated.image !== selection.image;
                if (changed) {
                    setSelectedObject(updated);
                }
            }
        }

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
            {selectedObject && (
                <DefensiveDetailPanel
                    data={selectedObject}
                    onClose={() => setSelectedObject(null)}
                />
            )}
        </div>
    );
};

const DefensiveDetailPanel = ({ data, onClose }) => (
    <div className="map-with-detail__detail">
        <DetailImage
            candidates={data.imageCandidates}
            alt={`Defensive snapshot ${data.objId}`}
        />
        <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-200/80">
                    Defensive Detection
                </p>
                <h3 className="text-xl font-semibold text-slate-50">
                    {data.objId}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                    {data.cameraLabel || "Defense net"} · Last ping{" "}
                    {formatDetailTimestamp(data.timestamp)}
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
            <DetailStat label="Local time" value={formatTime(data.timestamp)} />
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

const DetailImage = ({ candidates = [], alt }) => {
    const [index, setIndex] = useState(0);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        setIndex(0);
        setHidden(false);
    }, [candidates]);

    if (!candidates?.length || hidden) {
        return (
            <div className="map-with-detail__media map-with-detail__media--empty">
                No snapshot available
            </div>
        );
    }

    const handleError = () => {
        setIndex((prev) => {
            if (prev + 1 < candidates.length) return prev + 1;
            setHidden(true);
            return prev;
        });
    };

    return (
        <div className="map-with-detail__media">
            <img src={candidates[index]} alt={alt} onError={handleError} />
        </div>
    );
};

export default MapDefensive;
