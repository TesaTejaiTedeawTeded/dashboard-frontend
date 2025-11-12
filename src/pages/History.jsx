import { useEffect, useMemo, useState } from "react";
import GlassPanel from "../components/ui/GlassPanel.jsx";
import DateRangePicker from "../components/form/DateRangePicker.jsx";
import {
    fetchDefensiveHistory,
    fetchDefensiveCameras,
} from "../services/api.js";
import { normalizeDefenseData } from "../utils/normalizeDefenseData.js";

const History = () => {
    const [entries, setEntries] = useState([]);
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getTime() - 1000 * 60 * 60 * 6); // last 6 hours
    });
    const [endDate, setEndDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [cameraOptions, setCameraOptions] = useState([]);
    const [cameraFilter, setCameraFilter] = useState("all");
    const [cameraError, setCameraError] = useState("");

    const loadHistory = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchDefensiveHistory(
                startDate,
                endDate,
                cameraFilter === "all" ? undefined : cameraFilter
            );
            const hydrated = data
                .map(enhanceRecord)
                .filter((entry) => entry !== null);
            setEntries(hydrated);
            if (hydrated.length === 0) {
                setError("No telemetry found for this range.");
            }
        } catch (err) {
            setError(
                err?.response?.data?.error ||
                    err.message ||
                    "Unable to load history"
            );
        } finally {
            setLoading(false);
        }
    };

    const totals = useMemo(() => {
        const count = entries.length;
        const detections = entries.reduce(
            (sum, entry) => sum + (entry.normalized?.count || 0),
            0
        );
        return { count, detections };
    }, [entries]);

    useEffect(() => {
        setSelectedEntry(null);
    }, [entries]);

    useEffect(() => {
        setError("");
    }, [cameraFilter]);

    useEffect(() => {
        const loadCameras = async () => {
            try {
                const data = await fetchDefensiveCameras();
                setCameraOptions(data);
                setCameraError("");
            } catch (err) {
                setCameraError(
                    err?.response?.data?.error ||
                        err.message ||
                        "Unable to load camera list"
                );
            }
        };
        loadCameras();
    }, []);

    return (
        <div className="page-stack">
            <header className="page-header">
                <p className="page-eyebrow">Archive</p>
                <div>
                    <h1 className="page-title">Historical telemetry</h1>
                    <p className="page-subtitle">
                        Query saved defensive detections to investigate past
                        escalations.
                    </p>
                </div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                    {totals.count} events · {totals.detections} tracked objects
                </p>
            </header>

            <GlassPanel className="p-6 space-y-6">
                <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    setStartDate={setStartDate}
                    setEndDate={setEndDate}
                    onFetch={loadHistory}
                />

                {error && (
                    <p className="text-sm text-red-300 text-center">{error}</p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                        Camera filter
                        <select
                            className="glass-input bg-slate-900/60"
                            value={cameraFilter}
                            onChange={(event) => setCameraFilter(event.target.value)}
                        >
                            <option value="all">All cameras</option>
                            {cameraOptions.map((cam) => (
                                <option key={cam.cameraId} value={cam.cameraId}>
                                    {cam.cameraId} · {cam.count} events
                                </option>
                            ))}
                        </select>
                    </label>
                    {cameraError && (
                        <p className="text-sm text-red-300">{cameraError}</p>
                    )}
                </div>

                <div className="glass-scroll max-h-[420px] divide-y divide-white/5">
                    {loading ? (
                        <p className="text-slate-300 text-center py-12 text-sm tracking-wide">
                            Fetching telemetry…
                        </p>
                    ) : entries.length === 0 ? (
                        <p className="text-slate-300 text-center py-12 text-sm tracking-wide">
                            Select a range to load archived events.
                        </p>
                    ) : (
                        entries.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                onClick={() => setSelectedEntry(entry)}
                                className="history-row"
                            >
                                <div>
                                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                                        {entry.topic}
                                    </p>
                                    <h3 className="text-sm font-semibold text-slate-50">
                                        {entry.cameraLabel}
                                    </h3>
                                    <p className="text-slate-300 text-xs">
                                        {entry.summary}
                                    </p>
                                </div>
                                <div className="text-right text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                    {formatTimestamp(entry.timestamp)}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </GlassPanel>

            {selectedEntry && (
                <div className="modal-overlay">
                    <GlassPanel className="modal-panel space-y-5 relative">
                        <button
                            type="button"
                            onClick={() => setSelectedEntry(null)}
                            className="modal-close"
                        >
                            ✕
                        </button>

                        <div className="space-y-1">
                            <p className="section-eyebrow">Historical detail</p>
                            <h2 className="section-title">
                                {selectedEntry.cameraLabel}
                            </h2>
                            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                                {selectedEntry.topic} ·{" "}
                                {formatTimestamp(selectedEntry.timestamp)}
                            </p>
                        </div>

                        {selectedEntry.imageCandidates?.length ? (
                            <ImageWithFallback
                                candidates={selectedEntry.imageCandidates}
                                alt="Historical snapshot"
                                className="rounded-2xl border border-white/10 object-cover w-full max-h-[40vh]"
                            />
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 text-center text-sm text-slate-400 py-8">
                                No snapshot associated with this record.
                            </div>
                        )}

                        {selectedEntry.normalized?.objects?.length ? (
                            <div className="glass-scroll max-h-60">
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
                                        {selectedEntry.normalized.objects.map(
                                            (obj) => (
                                                <tr
                                                    key={obj.objId}
                                                    className="border-b border-white/5"
                                                >
                                                    <td className="py-2">
                                                        {obj.objId}
                                                    </td>
                                                    <td>
                                                        {formatCoord(obj.lat)}
                                                    </td>
                                                    <td>
                                                        {formatCoord(obj.long)}
                                                    </td>
                                                    <td>{obj.alt ?? "-"}</td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-4">
                                No object telemetry contained in this payload.
                            </p>
                        )}

                        <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-2">
                                Raw payload
                            </p>
                            <pre className="history-raw">
                                {selectedEntry.prettyPayload}
                            </pre>
                        </div>
                    </GlassPanel>
                </div>
            )}
        </div>
    );
};

const formatTimestamp = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("th-TH");
};

const formatCoord = (value) =>
    typeof value === "number" ? value.toFixed(5) : "-";

const enhanceRecord = (record) => {
    if (!record) return null;
    const normalized = normalizeDefenseData(record);
    const cameraId =
        record.cameraId ||
        normalized?.camId ||
        normalized?.camera?.id ||
        "Unknown camera";

    const summary = normalized
        ? `${normalized.count} object${
              normalized.count === 1 ? "" : "s"
          } tracked`
        : "No tracked objects";

    return {
        id: record._id || `${cameraId}-${record.timestamp}`,
        topic: "Defensive alert",
        timestamp: normalized?.timestamp || record.timestamp || record.createdAt,
        cameraLabel: cameraId,
        summary,
        normalized,
        imageCandidates: normalized?.imageCandidates || [],
        prettyPayload: JSON.stringify(record, null, 2),
    };
};

const ImageWithFallback = ({ candidates = [], alt, className }) => {
    const [index, setIndex] = useState(0);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        setIndex(0);
        setHidden(false);
    }, [candidates]);

    if (!candidates.length || hidden) return null;

    const handleError = () => {
        setIndex((prev) => {
            if (prev + 1 < candidates.length) return prev + 1;
            setHidden(true);
            return prev;
        });
    };

    return (
        <img
            src={candidates[index]}
            alt={alt}
            className={className}
            onError={handleError}
        />
    );
};

export default History;
