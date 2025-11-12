import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MapOffensive from "./MapOffensive.jsx";
import MapDefensive from "./MapDefensive.jsx";
import MapCombined from "./MapCombined.jsx";

const MAPS = [
    { id: "offensive", label: "Offensive Map", Component: MapOffensive },
    { id: "defensive", label: "Defensive Map", Component: MapDefensive },
    { id: "combined", label: "Combined Map", Component: MapCombined },
];

const SOCKET_MODE_LABEL =
    (import.meta.env.VITE_SOCKET_MODE || "mock").toUpperCase();

const MapSlider = ({ expanded = false }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const goNext = useCallback(
        () => setActiveIndex((idx) => (idx + 1) % MAPS.length),
        []
    );
    const goPrev = useCallback(
        () => setActiveIndex((idx) => (idx - 1 + MAPS.length) % MAPS.length),
        []
    );

    return (
        <div className={`map-slider ${expanded ? "map-slider--expanded" : ""}`}>
            <div className="map-slider__label flex items-center justify-between gap-3">
                <span>{MAPS[activeIndex].label}</span>
                <span className="text-[10px] uppercase tracking-[0.4em] text-white/60">
                    {SOCKET_MODE_LABEL} socket
                </span>
            </div>

            <button
                type="button"
                onClick={goPrev}
                className="map-slider__control left-3"
            >
                <ChevronLeft size={18} />
            </button>

            <button
                type="button"
                onClick={goNext}
                className="map-slider__control right-3"
            >
                <ChevronRight size={18} />
            </button>

            <div className="w-full h-full relative overflow-hidden rounded-2xl border border-white/5">
                {MAPS.map((definition, idx) => {
                    const Panel = definition.Component;
                    return (
                        <div
                            key={definition.id}
                            className={`map-slider__pane ${
                                activeIndex === idx
                                    ? "opacity-100"
                                    : "opacity-0 pointer-events-none"
                            }`}
                        >
                            <Panel enabled={activeIndex === idx} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MapSlider;
