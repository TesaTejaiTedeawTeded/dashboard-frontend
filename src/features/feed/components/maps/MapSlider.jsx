import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MapOffensive from "./MapOffensive.jsx";
import MapDefensive from "./MapDefensive.jsx";
import MapCombined from "./MapCombined.jsx";

const MAPS = [
    { id: "offensive", label: "Offensive Map", Component: MapOffensive },
    { id: "defensive", label: "Defensive Map", Component: MapDefensive },
    { id: "combined", label: "Combined Map", Component: MapCombined },
];

const MapSlider = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    const goNext = () => setActiveIndex((idx) => (idx + 1) % MAPS.length);
    const goPrev = () =>
        setActiveIndex((idx) => (idx - 1 + MAPS.length) % MAPS.length);

    return (
        <div className="map-slider">
            <div className="map-slider__label">{MAPS[activeIndex].label}</div>

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
                {MAPS.map(({ id, Component }, idx) => (
                    <div
                        key={id}
                        className={`map-slider__pane ${
                            activeIndex === idx
                                ? "opacity-100"
                                : "opacity-0 pointer-events-none"
                        }`}
                    >
                        <Component enabled={activeIndex === idx} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MapSlider;
