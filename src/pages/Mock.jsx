const SOCKET_MODE = (import.meta.env.VITE_SOCKET_MODE || "mock").toLowerCase();
import { useEffect, useRef, useState } from "react";
import GlassPanel from "../components/ui/GlassPanel.jsx";
import {
    getOffCamInformation,
    getDefCamInformation,
} from "../services/mockApi.js";

const REVEAL_CODE = import.meta.env.VITE_REVEAL_CODE || "1234";

const channelThemes = {
    offensive: {
        accentBorder: "border-l-4 border-rose-400/60",
        accentTitle: "text-rose-200",
        label: "Offensive",
        emoji: "🔴",
    },
    defensive: {
        accentBorder: "border-l-4 border-emerald-400/60",
        accentTitle: "text-emerald-200",
        label: "Defensive",
        emoji: "🟢",
    },
};

const Mock = () => {
    if (SOCKET_MODE === "real") {
        return (
            <div className="page-stack min-h-[60vh] items-center justify-center text-slate-300">
                <GlassPanel className="p-6 text-center">
                    <p className="text-sm uppercase tracking-[0.35em] text-white/60">
                        Mock tools disabled
                    </p>
                    <p className="text-lg font-semibold text-white">
                        Socket mode is set to REAL
                    </p>
                    <p className="text-sm text-slate-400">
                        Switch VITE_SOCKET_MODE back to mock to access this
                        page.
                    </p>
                </GlassPanel>
            </div>
        );
    }

    const [offCam, setOffCam] = useState(null);
    const [defCam, setDefCam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [offTokenVisible, setOffTokenVisible] = useState(false);
    const [defTokenVisible, setDefTokenVisible] = useState(false);

    const [showPromptFor, setShowPromptFor] = useState(null);
    const [pwdInput, setPwdInput] = useState("");
    const [pwdError, setPwdError] = useState("");

    const offTimerRef = useRef(null);
    const defTimerRef = useRef(null);

    const offCamId = import.meta.env.VITE_OFF_CAM_ID;
    const offCamToken = import.meta.env.VITE_OFF_CAM_TOKEN;
    const defCamId = import.meta.env.VITE_DEF_CAM_ID;
    const defCamToken = import.meta.env.VITE_DEF_CAM_TOKEN;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [offData, defData] = await Promise.all([
                    getOffCamInformation(offCamId, offCamToken),
                    getDefCamInformation(defCamId, defCamToken),
                ]);
                setOffCam(offData.data);
                setDefCam(defData.data);
            } catch (err) {
                setError(err.message || String(err));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        return () => {
            clearTimeout(offTimerRef.current);
            clearTimeout(defTimerRef.current);
        };
    }, [offCamId, offCamToken, defCamId, defCamToken]);

    const maskToken = (token) => {
        if (!token) return "";
        const keep = 4;
        if (token.length <= keep) return "•".repeat(token.length);
        return (
            token.slice(0, keep) + "•".repeat(Math.min(16, token.length - keep))
        );
    };

    const triggerReveal = (which) => {
        setPwdInput("");
        setPwdError("");
        setShowPromptFor(which);
    };

    const handleSubmitPwd = (event) => {
        event.preventDefault();
        if (pwdInput === REVEAL_CODE) {
            setPwdError("");
            if (showPromptFor === "off") {
                setOffTokenVisible(true);
                clearTimeout(offTimerRef.current);
                offTimerRef.current = setTimeout(
                    () => setOffTokenVisible(false),
                    5000
                );
            } else if (showPromptFor === "def") {
                setDefTokenVisible(true);
                clearTimeout(defTimerRef.current);
                defTimerRef.current = setTimeout(
                    () => setDefTokenVisible(false),
                    5000
                );
            }
            setShowPromptFor(null);
            setPwdInput("");
        } else {
            setPwdError("Invalid password");
        }
    };

    const handleCancelPwd = () => {
        setShowPromptFor(null);
        setPwdInput("");
        setPwdError("");
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            console.warn("Copy failed");
        }
    };

    if (loading) {
        return (
            <div className="page-stack min-h-[60vh] items-center justify-center text-slate-300">
                <span className="tracking-[0.3em] text-xs uppercase animate-pulse">
                    Calibrating mock interface…
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-stack min-h-[60vh] items-center justify-center">
                <GlassPanel className="p-6 text-center text-red-200 border border-red-500/40">
                    <p className="text-lg font-semibold">Mock data error</p>
                    <p className="text-sm text-red-200/80 mt-2">{error}</p>
                </GlassPanel>
            </div>
        );
    }

    return (
        <div className="page-stack">
            <header className="page-header">
                <p className="page-eyebrow">Mock control</p>
                <div>
                    <h1 className="page-title">Camera credentials</h1>
                    <p className="page-subtitle">
                        MYSNAXX มันฝรั่งทอดที่โคตรอร่อย
                    </p>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
                <ChannelPanel
                    theme={channelThemes.offensive}
                    data={offCam}
                    fallbackId={offCamId}
                    fallbackToken={offCamToken}
                    tokenVisible={offTokenVisible}
                    onCopy={copyToClipboard}
                    onReveal={() => triggerReveal("off")}
                    maskToken={maskToken}
                />

                <ChannelPanel
                    theme={channelThemes.defensive}
                    data={defCam}
                    fallbackId={defCamId}
                    fallbackToken={defCamToken}
                    tokenVisible={defTokenVisible}
                    onCopy={copyToClipboard}
                    onReveal={() => triggerReveal("def")}
                    maskToken={maskToken}
                />
            </div>

            {showPromptFor && (
                <div className="modal-overlay">
                    <GlassPanel
                        as="form"
                        onSubmit={handleSubmitPwd}
                        className="modal-panel space-y-4"
                    >
                        <div className="space-y-1 text-center">
                            <p className="page-eyebrow text-xs">
                                Reveal authorization
                            </p>
                            <h2 className="section-title">Enter reveal code</h2>
                        </div>
                        {pwdError && (
                            <p className="text-sm text-red-200 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-center">
                                {pwdError}
                            </p>
                        )}
                        <input
                            type="password"
                            autoFocus
                            value={pwdInput}
                            onChange={(e) => setPwdInput(e.target.value)}
                            className="glass-input text-center tracking-[0.5em]"
                            placeholder="••••"
                        />
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="submit"
                                className="glass-button flex-1"
                            >
                                Reveal token
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelPwd}
                                className="glass-button glass-button--ghost flex-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </GlassPanel>
                </div>
            )}
        </div>
    );
};

const ChannelPanel = ({
    theme,
    data,
    fallbackId,
    fallbackToken,
    tokenVisible,
    onCopy,
    onReveal,
    maskToken,
}) => {
    const camId = data?.id || data?.camId || fallbackId;
    const camToken = data?.token || fallbackToken;

    return (
        <GlassPanel className={`p-6 space-y-5 ${theme.accentBorder}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="section-eyebrow">{theme.label}</p>
                    <h2 className={`section-title ${theme.accentTitle}`}>
                        {theme.emoji} {data?.name || `${theme.label} camera`}
                    </h2>
                </div>
            </div>

            <dl className="space-y-4">
                <DetailRow label="Camera ID">
                    <code className="token-chip">{camId}</code>
                    <button
                        type="button"
                        onClick={() => onCopy(camId)}
                        className="glass-button glass-button--ghost text-xs px-3 py-1"
                    >
                        Copy
                    </button>
                </DetailRow>

                <DetailRow label="Token">
                    <code className="token-chip break-all">
                        {tokenVisible ? camToken : maskToken(camToken)}
                    </code>
                    <button
                        type="button"
                        onClick={onReveal}
                        className="glass-button glass-button--ghost text-xs px-3 py-1"
                    >
                        {tokenVisible ? "Hide" : "Reveal"}
                    </button>
                </DetailRow>
            </dl>
        </GlassPanel>
    );
};

const DetailRow = ({ label, children }) => (
    <div className="flex flex-col gap-2 text-slate-200">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {label}
        </span>
        <div className="flex flex-wrap gap-3 items-center">{children}</div>
    </div>
);

export default Mock;
