import GlassPanel from "../components/ui/GlassPanel.jsx";
import MapSlider from "../features/feed/components/maps/MapSlider.jsx";
import DefenseAlertFeed from "../features/feed/components/DefenseAlertFeed.jsx";

const Feed = () => {
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
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="section-eyebrow">
                                Tactical map rotation
                            </p>
                            <h2 className="section-title">
                                Mapbox situational view
                            </h2>
                        </div>
                        <span className="badge badge--success">Live</span>
                    </div>
                    <MapSlider />
                </GlassPanel>

                <GlassPanel className="p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="section-eyebrow">Camera feed</p>
                            <h2 className="section-title">
                                Thermal channel link
                            </h2>
                        </div>
                        <span className="badge">Standby</span>
                    </div>
                    <div className="flex-1 rounded-2xl bg-gradient-to-br from-slate-900/40 to-slate-800/40 border border-white/10 grid place-items-center text-slate-300 text-sm tracking-wide">
                        Camera streaming endpoint pending assignment
                    </div>
                </GlassPanel>
            </section>

            <GlassPanel className="p-0 overflow-hidden">
                <DefenseAlertFeed />
            </GlassPanel>
        </div>
    );
};

export default Feed;
