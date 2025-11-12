import { useState } from "react";
import GlassPanel from "../components/ui/GlassPanel.jsx";
import MapSlider from "../features/feed/components/maps/MapSlider.jsx";
import DefenseAlertFeed from "../features/feed/components/DefenseAlertFeed.jsx";

const Feed = () => {
    const [expandedPanel, setExpandedPanel] = useState(null);

    return (
        <div className="page-stack">
            <header className="page-header">
                <p className="page-eyebrow">Live Feed</p>
                <div>
                    <h1 className="page-title">Operational dashboard</h1>
                    <p className="page-subtitle">
                        Realtime drone intelligence from offensive and defensive
                        cameras rendered with a unified glass aesthetic.
                    </p>
                </div>
            </header>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
                <GlassPanel className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <p className="section-eyebrow">
                                Tactical map rotation
                            </p>
                            <h2 className="section-title">
                                Mapbox situational view
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setExpandedPanel("map")}
                                className="glass-button glass-button--ghost text-xs px-3 py-1"
                            >
                                Expand
                            </button>
                        </div>
                    </div>
                    <MapSlider />
                </GlassPanel>

                <GlassPanel className="p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                        <div>
                            <p className="section-eyebrow">Camera feed</p>
                            <h2 className="section-title">
                                Thermal channel link
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="badge">Standby</span>
                            <button
                                type="button"
                                onClick={() => setExpandedPanel("camera")}
                                className="glass-button glass-button--ghost text-xs px-3 py-1"
                            >
                                Expand
                            </button>
                        </div>
                    </div>
                    <CameraFeedPlaceholder />
                </GlassPanel>
            </section>

            <GlassPanel className="p-0 overflow-hidden">
                <DefenseAlertFeed />
            </GlassPanel>
            {expandedPanel && (
                <div
                    className="fullscreen-overlay"
                    onClick={() => setExpandedPanel(null)}
                >
                    <GlassPanel
                        className="fullscreen-panel"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {expandedPanel === "map" ? (
                            <>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="ml-8 mt-8">
                                        <p className="section-eyebrow">
                                            Tactical map rotation
                                        </p>
                                        <h2 className="section-title">
                                            Mapbox situational view
                                        </h2>
                                    </div>
                                    <div className="flex gap-2 flex-wrap mt-4 mr-8">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedPanel(null)
                                            }
                                            className="glass-button glass-button--ghost text-xs px-4 py-2"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-[60vh]">
                                    <MapSlider expanded />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="ml-8 mt-8">
                                        <p className="section-eyebrow">
                                            Camera feed
                                        </p>
                                        <h2 className="section-title">
                                            Thermal channel link
                                        </h2>
                                    </div>
                                    <div className="flex gap-2 flex-wrap mt-4 mr-8">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedPanel(null)
                                            }
                                            className="glass-button glass-button--ghost text-xs px-4 py-2"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                                <CameraFeedPlaceholder expanded />
                            </>
                        )}
                    </GlassPanel>
                </div>
            )}
        </div>
    );
};

const CameraFeedPlaceholder = ({ expanded = false }) => (
    <div
        className={`flex-1 rounded-2xl bg-linear-to-br from-slate-900/40 to-slate-800/40 border border-white/10 grid place-items-center text-slate-300 text-sm tracking-wide ${
            expanded ? "min-h-[420px] text-base" : ""
        }`}
    >
        Camera streaming endpoint pending assignment
    </div>
);

export default Feed;
