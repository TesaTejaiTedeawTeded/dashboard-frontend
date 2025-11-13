import { useEffect, useMemo, useState } from "react";
import GlassPanel from "../components/ui/GlassPanel.jsx";
import DateRangePicker from "../components/form/DateRangePicker.jsx";
import {
    fetchDefensiveHistory,
    fetchDefensiveCameras,
    fetchOffensiveHistory,
    fetchOffensiveDrones,
} from "../services/api.js";
import { normalizeDefenseData } from "../utils/normalizeDefenseData.js";
import { normalizeOffensiveData } from "../utils/normalizeOffensiveData.js";

const HISTORY_TABS = [
    { id: "defensive", label: "Defensive" },
    { id: "offensive", label: "Offensive" },
];

const DRONE_COLORS = [];

const defaultStartDate = () => {
    const now = new Date();
    return new Date(now.getTime() - 1000 * 60 * 60 * 6);
};

const History = () => {
    const [activeTab, setActiveTab] = useState("defensive");

    const [defEntries, setDefEntries] = useState([]);
    const [defStartDate, setDefStartDate] = useState(() => defaultStartDate());
    const [defEndDate, setDefEndDate] = useState(() => new Date());
    const [defLoading, setDefLoading] = useState(false);
    const [defError, setDefError] = useState("");
    const [defSelectedCamera, setDefSelectedCamera] = useState("all");
    const [defCameraOptions, setDefCameraOptions] = useState([]);
    const [defCameraError, setDefCameraError] = useState("");

    const [offEntries, setOffEntries] = useState([]);
    const [offStartDate, setOffStartDate] = useState(() => defaultStartDate());
    const [offEndDate, setOffEndDate] = useState(() => new Date());
    const [offLoading, setOffLoading] = useState(false);
    const [offError, setOffError] = useState("");
    const [offSelectedDrone, setOffSelectedDrone] = useState("all");
    const [offDroneOptions, setOffDroneOptions] = useState([]);
    const [offDroneError, setOffDroneError] = useState("");

    const [selectedEntry, setSelectedEntry] = useState(null);

    const defensiveTotals = useMemo(() => {
        const count = defEntries.length;
        const detections = defEntries.reduce(
            (sum, entry) => sum + (entry.normalized?.count || 0),
            0
        );
        return { count, detections };
    }, [defEntries]);

    const offensiveTotals = useMemo(() => {
        const unique = new Set(offEntries.map((entry) => entry.droneId));
        return {
            count: offEntries.length,
            drones: unique.size,
        };
    }, [offEntries]);

    const loadDefensiveHistory = async () => {
        setDefLoading(true);
        setDefError("");
        try {
            const data = await fetchDefensiveHistory(
                defStartDate,
                defEndDate,
                defSelectedCamera === "all" ? undefined : defSelectedCamera
            );
            const hydrated = data
                .map(enhanceDefensiveRecord)
                .filter((entry) => entry !== null);
            setDefEntries(hydrated);
            if (hydrated.length === 0) {
                setDefError("No defensive telemetry found for this range.");
            }
        } catch (error) {
            setDefError(
                error?.response?.data?.error ||
                    error.message ||
                    "Unable to load defensive history"
            );
        } finally {
            setDefLoading(false);
        }
    };

    const loadOffensiveHistory = async () => {
        setOffLoading(true);
        setOffError("");
        try {
            const data = await fetchOffensiveHistory(
                offStartDate,
                offEndDate,
                offSelectedDrone === "all" ? undefined : offSelectedDrone
            );
            const hydrated = data
                .map(enhanceOffensiveRecord)
                .filter((entry) => entry !== null);
            setOffEntries(hydrated);
            if (hydrated.length === 0) {
                setOffError("No offensive tracks found for this range.");
            }
        } catch (error) {
            setOffError(
                error?.response?.data?.error ||
                    error.message ||
                    "Unable to load offensive history"
            );
        } finally {
            setOffLoading(false);
        }
    };

    useEffect(() => {
        const loadCameras = async () => {
            try {
                const data = await fetchDefensiveCameras();
                setDefCameraOptions(data);
                setDefCameraError("");
            } catch (error) {
                setDefCameraError(
                    error?.response?.data?.error ||
                        error.message ||
                        "Unable to load camera list"
                );
            }
        };
        loadCameras();
    }, []);

    useEffect(() => {
        const loadDrones = async () => {
            try {
                const data = await fetchOffensiveDrones();
                setOffDroneOptions(data);
                setOffDroneError("");
            } catch (error) {
                setOffDroneError(
                    error?.response?.data?.error ||
                        error.message ||
                        "Unable to load drone list"
                );
            }
        };
        loadDrones();
    }, []);

    useEffect(() => {
        if (selectedEntry?.type === "defensive") {
            setSelectedEntry(null);
        }
    }, [defEntries]);

    useEffect(() => {
        if (selectedEntry?.type === "offensive") {
            setSelectedEntry(null);
        }
    }, [offEntries]);

    useEffect(() => {
        setDefError("");
    }, [defSelectedCamera]);

    useEffect(() => {
        setOffError("");
    }, [offSelectedDrone]);

    const headerSubtitle =
        activeTab === "defensive"
            ? "Kae Yak Pen Kon Tee Tuk Rak 😘"
            : "Ror Naan Naan Kor Arjja Bun Torn Huajai 😢";

    const headerStats =
        activeTab === "defensive"
            ? `${defensiveTotals.count} events · ${defensiveTotals.detections} tracked objects`
            : `${offensiveTotals.count} pings · ${offensiveTotals.drones} drones`;

    return (
        <div className="page-stack">
            <header className="page-header">
                <p className="page-eyebrow">Archive</p>
                <div>
                    <h1 className="page-title">Historical telemetry</h1>
                    <p className="page-subtitle">{headerSubtitle}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                    {headerStats}
                </p>
            </header>

            <div className="flex gap-3">
                {HISTORY_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`glass-button glass-button--ghost text-sm px-4 py-2 ${
                            activeTab === tab.id
                                ? "border border-white/40 bg-white/5 text-white"
                                : "text-white/60"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "defensive" ? (
                <DefensiveSection
                    entries={defEntries}
                    startDate={defStartDate}
                    endDate={defEndDate}
                    setStartDate={setDefStartDate}
                    setEndDate={setDefEndDate}
                    onFetch={loadDefensiveHistory}
                    loading={defLoading}
                    error={defError}
                    cameraFilter={defSelectedCamera}
                    setCameraFilter={setDefSelectedCamera}
                    cameraOptions={defCameraOptions}
                    cameraError={defCameraError}
                    onSelectEntry={(entry) =>
                        setSelectedEntry({ type: "defensive", data: entry })
                    }
                />
            ) : (
                <OffensiveSection
                    entries={offEntries}
                    startDate={offStartDate}
                    endDate={offEndDate}
                    setStartDate={setOffStartDate}
                    setEndDate={setOffEndDate}
                    onFetch={loadOffensiveHistory}
                    loading={offLoading}
                    error={offError}
                    droneFilter={offSelectedDrone}
                    setDroneFilter={setOffSelectedDrone}
                    droneOptions={offDroneOptions}
                    droneError={offDroneError}
                    onSelectEntry={(entry) =>
                        setSelectedEntry({ type: "offensive", data: entry })
                    }
                />
            )}

            {selectedEntry && (
                <HistoryModal
                    entry={selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                />
            )}
        </div>
    );
};

const DefensiveSection = ({
    entries,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    onFetch,
    loading,
    error,
    cameraFilter,
    setCameraFilter,
    cameraOptions,
    cameraError,
    onSelectEntry,
}) => (
    <GlassPanel className="p-6 space-y-6">
        <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            onFetch={onFetch}
        />

        {error && <p className="text-sm text-red-300 text-center">{error}</p>}

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

        <HistoryList
            entries={entries}
            loading={loading}
            emptyText="Select a range to load archived events."
            onSelectEntry={onSelectEntry}
        />
    </GlassPanel>
);

const OffensiveSection = ({
    entries,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    onFetch,
    loading,
    error,
    droneFilter,
    setDroneFilter,
    droneOptions,
    droneError,
    onSelectEntry,
}) => (
    <GlassPanel className="p-6 space-y-6">
        <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            onFetch={onFetch}
        />

        {error && <p className="text-sm text-red-300 text-center">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                Drone filter
                <select
                    className="glass-input bg-slate-900/60"
                    value={droneFilter}
                    onChange={(event) => setDroneFilter(event.target.value)}
                >
                    <option value="all">All drones</option>
                    {droneOptions.map((drone) => (
                        <option key={drone.droneId} value={drone.droneId}>
                            {drone.droneId} · {drone.count} hits
                        </option>
                    ))}
                </select>
            </label>
            {droneError && <p className="text-sm text-red-300">{droneError}</p>}
        </div>

        <HistoryList
            entries={entries}
            loading={loading}
            emptyText="Select a range to view offensive path breadcrumbs."
            onSelectEntry={onSelectEntry}
            renderRow={(entry) => (
                <OffensiveRow entry={entry} />
            )}
        />
    </GlassPanel>
);

const HistoryList = ({
    entries,
    loading,
    emptyText,
    onSelectEntry,
    renderRow,
}) => (
    <div className="glass-scroll max-h-[420px] divide-y divide-white/5">
        {loading ? (
            <p className="text-slate-300 text-center py-12 text-sm tracking-wide">
                Fetching telemetry…
            </p>
        ) : entries.length === 0 ? (
            <p className="text-slate-300 text-center py-12 text-sm tracking-wide">
                {emptyText}
            </p>
        ) : (
            entries.map((entry) => (
                <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelectEntry(entry)}
                    className="history-row"
                >
                    {renderRow ? (
                        renderRow(entry)
                    ) : (
                        <>
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
                        </>
                    )}
                </button>
            ))
        )}
    </div>
);

const OffensiveRow = ({ entry }) => (
    <>
        <div className="flex items-center gap-3">
            <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                    {entry.topic}
                </p>
                <h3 className="text-sm font-semibold text-slate-50">
                    {entry.droneId}
                </h3>
                <p className="text-slate-300 text-xs">{entry.summary}</p>
            </div>
        </div>
        <div className="text-right text-[11px] uppercase tracking-[0.3em] text-slate-500">
            {formatTimestamp(entry.timestamp)}
        </div>
    </>
);

const HistoryModal = ({ entry, onClose }) => {
    if (!entry) return null;
    if (entry.type === "defensive") {
        return <DefensiveDetail entry={entry.data} onClose={onClose} />;
    }
    return (
        <OffensiveDetail entry={entry.data} onClose={onClose} />
    );
};

const DefensiveDetail = ({ entry, onClose }) => (
    <div className="modal-overlay">
        <GlassPanel className="modal-panel space-y-5 relative">
            <button type="button" onClick={onClose} className="modal-close">
                ✕
            </button>

            <div className="space-y-1">
                <p className="section-eyebrow">Historical detail</p>
                <h2 className="section-title">{entry.cameraLabel}</h2>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                    {entry.topic} · {formatTimestamp(entry.timestamp)}
                </p>
            </div>

            {entry.imageCandidates?.length ? (
                <ImageWithFallback
                    candidates={entry.imageCandidates}
                    alt="Historical snapshot"
                    className="rounded-2xl border border-white/10 object-cover w-full max-h-[40vh]"
                    enableLightbox
                />
            ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 text-center text-sm text-slate-400 py-8">
                    No snapshot associated with this record.
                </div>
            )}

            {entry.normalized?.objects?.length ? (
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
                            {entry.normalized.objects.map((obj) => (
                                <tr
                                    key={obj.objId}
                                    className="border-b border-white/5"
                                >
                                    <td className="py-2">{obj.objId}</td>
                                    <td>{formatCoord(obj.lat)}</td>
                                    <td>{formatCoord(obj.long)}</td>
                                    <td>{formatAltitude(obj.alt)}</td>
                                </tr>
                            ))}
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
                <pre className="history-raw">{entry.prettyPayload}</pre>
            </div>
        </GlassPanel>
    </div>
);

const OffensiveDetail = ({ entry, onClose }) => {
    const objects = entry.normalized?.objects || [];
    return (
        <div className="modal-overlay">
            <GlassPanel className="modal-panel space-y-5 relative">
                <button type="button" onClick={onClose} className="modal-close">
                    ✕
                </button>

                <div className="space-y-1">
                    <p className="section-eyebrow">Offensive track</p>
                    <h2 className="section-title">
                        {entry.droneId || "Unknown drone"}
                    </h2>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                        {formatTimestamp(entry.timestamp)}
                    </p>
                </div>

                {objects.length ? (
                    <div className="glass-scroll max-h-60">
                        <table className="w-full text-sm text-left text-slate-200">
                            <thead className="text-xs uppercase tracking-[0.25em] text-slate-400">
                                <tr>
                                    <th>ID</th>
                                    <th>Lat</th>
                                    <th>Lng</th>
                                    <th>Alt</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {objects.map((obj) => (
                                    <tr
                                        key={`${obj.id}-${obj.timestamp}`}
                                        className="border-b border-white/5"
                                    >
                                        <td className="py-2">
                                            {obj.droneId || obj.id}
                                        </td>
                                        <td>{formatCoord(obj.lat)}</td>
                                        <td>{formatCoord(obj.long)}</td>
                                        <td>{formatAltitude(obj.alt)}</td>
                                        <td className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                            {formatTimestamp(obj.timestamp)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-4">
                        No positional breadcrumbs were stored for this record.
                    </p>
                )}

                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-2">
                        Raw payload
                    </p>
                    <pre className="history-raw">{entry.prettyPayload}</pre>
                </div>
            </GlassPanel>
        </div>
    );
};

const ImageWithFallback = ({
    candidates = [],
    alt,
    className = "",
    enableLightbox = false,
}) => {
    const [index, setIndex] = useState(0);
    const [hidden, setHidden] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    useEffect(() => {
        setIndex(0);
        setHidden(false);
        setLightboxOpen(false);
    }, [candidates]);

    if (!candidates.length || hidden) return null;

    const handleError = () => {
        setIndex((prev) => {
            if (prev + 1 < candidates.length) return prev + 1;
            setHidden(true);
            return prev;
        });
    };

    const handleOpen = () => {
        if (!enableLightbox) return;
        setLightboxOpen(true);
    };

    const handleClose = () => setLightboxOpen(false);

    const imageElement = (
        <img
            src={candidates[index]}
            alt={alt}
            className={className}
            onError={handleError}
        />
    );

    return (
        <>
            {enableLightbox ? (
                <button
                    type="button"
                    className="image-lightbox__trigger"
                    onClick={handleOpen}
                >
                    {imageElement}
                </button>
            ) : (
                imageElement
            )}
            {enableLightbox && lightboxOpen && (
                <div className="image-lightbox" onClick={handleClose}>
                    <button
                        type="button"
                        className="image-lightbox__close"
                        onClick={handleClose}
                    >
                        Close
                    </button>
                    <img
                        src={candidates[index]}
                        alt={alt}
                        className="image-lightbox__img"
                        onClick={(event) => event.stopPropagation()}
                        onError={handleError}
                    />
                </div>
            )}
        </>
    );
};

const formatTimestamp = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("th-TH");
};

const formatCoord = (value) =>
    typeof value === "number" ? value.toFixed(5) : "-";

const formatAltitude = (value) =>
    value === null || value === undefined ? "-" : `${value} m`;

const enhanceDefensiveRecord = (record) => {
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
        timestamp:
            normalized?.timestamp || record.timestamp || record.createdAt,
        cameraLabel: cameraId,
        summary,
        normalized,
        imageCandidates: normalized?.imageCandidates || [],
        prettyPayload: JSON.stringify(record, null, 2),
    };
};

const enhanceOffensiveRecord = (record) => {
    if (!record) return null;
    const normalized = normalizeOffensiveData(record);
    if (!normalized.objects.length) return null;
    const latest = normalized.objects[normalized.objects.length - 1];

    const summary = [
        `Lat ${formatCoord(latest.lat)}`,
        `Lng ${formatCoord(latest.long)}`,
        `Alt ${formatAltitude(latest.alt)}`,
    ].join(" · ");

    return {
        id: record._id || `${latest.droneId}-${record.timestamp}`,
        topic: "Offensive telemetry",
        timestamp: normalized.timestamp || record.timestamp || record.createdAt,
        droneId: latest.droneId || record.droneId || "Unknown drone",
        summary,
        normalized,
        prettyPayload: JSON.stringify(record, null, 2),
    };
};

export default History;
