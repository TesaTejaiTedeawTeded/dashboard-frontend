import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import GlassPanel from "../../../components/ui/GlassPanel.jsx";
import { useSocket } from "../../../hooks/useSocket.js";
import { normalizeDefenseData } from "../../../utils/normalizeDefenseData.js";

const DefenseAlertFeed = () => {
    const camId = import.meta.env.VITE_DEF_CAM_ID;
    const { realtimeData, isConnected } = useSocket(camId, true);
    const [alerts, setAlerts] = useState([]);
    const [selectedAlert, setSelectedAlert] = useState(null);

    // ✅ Fix timezone: treat timestamp as local (ignore UTC 'Z')
    const parseAsLocal = (timestamp) => {
        if (!timestamp) return "-";
        const local = timestamp.replace("Z", ""); // remove UTC indicator
        return new Date(local).toLocaleString("th-TH"); // Thailand locale
    };

    const formatCoord = (value) =>
        typeof value === "number" ? value.toFixed(5) : "-";

    useEffect(() => {
        if (!realtimeData) return;

        // Normalize incoming data (works for mock + real)
        const normalized = normalizeDefenseData(realtimeData);
        if (!normalized || normalized.count === 0) return;

        const newAlert = {
            id: crypto.randomUUID(),
            timestamp: normalized.timestamp,
            imagePath: normalized.objects[0]?.imgPath || null,
            count: normalized.count,
            objects: normalized.objects,
        };

        setAlerts((prev) => [newAlert, ...prev].slice(0, 10));
    }, [realtimeData]);

    const modalContent =
        selectedAlert && (
            <div className="modal-overlay">
                <GlassPanel className="modal-panel space-y-4 relative">
                    <button
                        type="button"
                        onClick={() => setSelectedAlert(null)}
                        className="modal-close"
                    >
                        ✕
                    </button>
                    <div className="space-y-2">
                        <p className="section-eyebrow">Alert details</p>
                        <h3 className="section-title">Drone cluster insight</h3>
                    </div>

                    {selectedAlert.imagePath ? (
                        <img
                            src={selectedAlert.imagePath}
                            alt="Detected Drone"
                            className="rounded-2xl border border-white/10 object-cover w-full max-h-[30vh]"
                        />
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 text-center text-sm text-slate-400 py-8">
                            No snapshot was provided for this alert.
                        </div>
                    )}

                    {selectedAlert.objects.length > 0 ? (
                        <div className="glass-scroll max-h-[240px]">
                            <table className="w-full text-sm text-left text-slate-200">
                                <thead className="text-xs uppercase tracking-[0.25em] text-slate-400">
                                    <tr>
                                        <th>ID</th>
                                        <th>Lat</th>
                                        <th>Lng</th>
                                        <th>Alt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedAlert.objects.map((obj) => (
                                        <tr key={obj.objId} className="border-b border-white/5">
                                            <td className="py-2">{obj.objId}</td>
                                            <td>{formatCoord(obj.lat)}</td>
                                            <td>{formatCoord(obj.long)}</td>
                                            <td>{obj.alt ?? "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-6">
                            No individual drone telemetry was attached to this alert.
                        </p>
                    )}

                    <p className="text-xs text-slate-400 text-right">
                        Timestamp: {parseAsLocal(selectedAlert.timestamp)}
                    </p>
                </GlassPanel>
            </div>
        );

    return (
        <>
            <div className="feed-panel">
            <header className="feed-panel__header">
                <div>
                    <p className="section-eyebrow text-red-200">
                        Defense camera alerts
                    </p>
                    <h3 className="section-title">Escalations</h3>
                </div>
                <span
                    className={`badge ${
                        isConnected ? "badge--success" : "badge--danger"
                    }`}
                >
                    {isConnected ? "Live" : "Offline"}
                </span>
            </header>

            <div className="feed-panel__scroll">
                {alerts.length === 0 ? (
                    <p className="text-slate-400 text-center py-12 text-sm tracking-wide">
                        Waiting for the first detection.
                    </p>
                ) : (
                    alerts.map((alert) => (
                        <button
                            key={alert.id}
                            type="button"
                            onClick={() => setSelectedAlert(alert)}
                            className="alert-card"
                        >
                            {alert.imagePath && (
                                <img
                                    src={alert.imagePath}
                                    alt="Alert Snapshot"
                                    className="alert-card__thumb"
                                />
                            )}
                            <div className="flex-1 text-left">
                                <p className="text-sm font-semibold text-slate-50">
                                    Drone detected
                                </p>
                                <p className="text-xs text-slate-300">
                                    {alert.count} object
                                    {alert.count > 1 ? "s" : ""} tracked
                                </p>
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-1">
                                    {parseAsLocal(alert.timestamp)}
                                </p>
                            </div>
                        </button>
                    ))
                )}
            </div>

            </div>

            {selectedAlert &&
                typeof document !== "undefined" &&
                createPortal(modalContent, document.body)}
        </>
    );
};

export default DefenseAlertFeed;
