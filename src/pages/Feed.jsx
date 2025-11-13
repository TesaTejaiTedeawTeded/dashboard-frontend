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
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        I love you, you love me, we love each other, but we are friends.
                    </p>
                </div>
            </header>

            <section className="w-full">
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
            </section>

            <GlassPanel className="p-0 overflow-hidden">
                <DefenseAlertFeed />
            </GlassPanel>
            {expandedPanel === "map" && (
                <div
                    className="fullscreen-overlay"
                    onClick={() => setExpandedPanel(null)}
                >
                    <GlassPanel
                        className="fullscreen-panel"
                        onClick={(event) => event.stopPropagation()}
                    >
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
                                    onClick={() => setExpandedPanel(null)}
                                    className="glass-button glass-button--ghost text-xs px-4 py-2"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-[60vh]">
                            <MapSlider expanded />
                        </div>
                    </GlassPanel>
                </div>
            )}
        </div>
    );
};

export default Feed;
