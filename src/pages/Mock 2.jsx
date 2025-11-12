import { useEffect, useRef, useState } from "react";
import {
    getOffCamInformation,
    getDefCamInformation,
} from "../services/mockApi";

const REVEAL_CODE = import.meta.env.VITE_REVEAL_CODE || "1234";

const Mock = () => {
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
    }, []);

    const maskToken = (token) => {
        if (!token) return "";
        const keep = 4;
        if (token.length <= keep) return "•".repeat(token.length);
        return (
            token.slice(0, keep) + "•".repeat(Math.min(16, token.length - keep))
        );
    };

    const handleRevealClick = (which) => {
        setPwdInput("");
        setPwdError("");
        setShowPromptFor(which);
    };

    const handleSubmitPwd = (e) => {
        e.preventDefault();
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
            alert("Copied to clipboard");
        } catch {
            alert("Copy failed");
        }
    };

    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600">
                Loading...
            </div>
        );

    if (error)
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500">
                Error: {error}
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-4xl font-bold text-blue-800 mb-10 text-center">
                🧪 Mock Page
            </h1>

            {/* Grid 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-8">
                {/* ---------- Offensive ---------- */}
                <section className="bg-white shadow-lg rounded-xl p-6 border-l-8 border-red-500">
                    <h2 className="text-2xl font-semibold text-red-700 mb-4">
                        🔴 Offensive
                    </h2>

                    {offCam ? (
                        <div className="space-y-3">
                            <div>
                                <span className="font-medium text-gray-700">
                                    Name:
                                </span>{" "}
                                {offCam.name}
                            </div>

                            {/* ✅ Added copy button for Cam ID */}
                            <div className="flex justify-between items-center space-x-3">
                                <div>
                                    <span className="font-medium text-gray-700">
                                        Cam ID:
                                    </span>{" "}
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                        {offCam.id || offCamId}
                                    </code>
                                </div>
                                <button
                                    onClick={() =>
                                        copyToClipboard(offCam.id || offCamId)
                                    }
                                    className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                                >
                                    Copy
                                </button>
                            </div>

                            <div className="flex justify-between items-center space-x-3">
                                <div>
                                    <span className="font-medium text-gray-700">
                                        Token:
                                    </span>{" "}
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm break-all">
                                        {offTokenVisible
                                            ? offCam.token || offCamToken
                                            : maskToken(
                                                  offCam.token || offCamToken
                                              )}
                                    </code>
                                </div>
                                <button
                                    onClick={() => handleRevealClick("off")}
                                    title="Reveal token"
                                    className="p-2 rounded hover:bg-gray-100"
                                >
                                    {offTokenVisible ? (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-gray-700"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.02.153-2.006.437-2.937M3 3l18 18"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-gray-700"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                        </svg>
                                    )}
                                </button>

                                {offTokenVisible && (
                                    <button
                                        onClick={() =>
                                            copyToClipboard(
                                                offCam.token || offCamToken
                                            )
                                        }
                                        className="ml-2 px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                                    >
                                        Copy
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">No data</p>
                    )}
                </section>

                {/* ---------- Defensive ---------- */}
                <section className="bg-white shadow-lg rounded-xl p-6 border-l-8 border-green-500">
                    <h2 className="text-2xl font-semibold text-green-700 mb-4">
                        🟢 Defensive
                    </h2>

                    {defCam ? (
                        <div className="space-y-3">
                            <div>
                                <span className="font-medium text-gray-700">
                                    Name:
                                </span>{" "}
                                {defCam.name}
                            </div>

                            {/* ✅ Added copy button for Cam ID */}
                            <div className="flex justify-between items-center space-x-3">
                                <div>
                                    <span className="font-medium text-gray-700">
                                        Cam ID:
                                    </span>{" "}
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                        {defCam.id || defCamId}
                                    </code>
                                </div>
                                <button
                                    onClick={() =>
                                        copyToClipboard(defCam.id || defCamId)
                                    }
                                    className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                                >
                                    Copy
                                </button>
                            </div>

                            <div className="flex justify-between items-center space-x-3">
                                <div>
                                    <span className="font-medium text-gray-700">
                                        Token:
                                    </span>{" "}
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm break-all">
                                        {defTokenVisible
                                            ? defCam.token || defCamToken
                                            : maskToken(
                                                  defCam.token || defCamToken
                                              )}
                                    </code>
                                </div>

                                <button
                                    onClick={() => handleRevealClick("def")}
                                    title="Reveal token"
                                    className="p-2 rounded hover:bg-gray-100"
                                >
                                    {defTokenVisible ? (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-gray-700"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.02.153-2.006.437-2.937M3 3l18 18"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-gray-700"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                        </svg>
                                    )}
                                </button>

                                {defTokenVisible && (
                                    <button
                                        onClick={() =>
                                            copyToClipboard(
                                                defCam.token || defCamToken
                                            )
                                        }
                                        className="ml-2 px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                                    >
                                        Copy
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">No data</p>
                    )}
                </section>
            </div>

            {/* Simulation link */}
            <section className="bg-white shadow-lg rounded-xl p-6 border-l-8 border-green-500 max-w-4xl mx-auto text-center">
                <h2 className="text-2xl font-semibold text-green-700 mb-4">
                    🟢 Defensive Camera (Simulation)
                </h2>
                <a
                    href="https://tesa.crma.dev/simulation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-all"
                >
                    🚀 Open Simulation
                </a>
            </section>

            {/* Password modal */}
            {showPromptFor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <form
                        onSubmit={handleSubmitPwd}
                        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
                    >
                        <h3 className="text-lg font-semibold mb-2">
                            Confirm to Reveal Token
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Please enter code to reveal the token. (It will
                            automatically hide again after 30 seconds)
                        </p>

                        <input
                            type="password"
                            value={pwdInput}
                            onChange={(e) => setPwdInput(e.target.value)}
                            className="w-full border rounded px-3 py-2 mb-2"
                            placeholder="code"
                            autoFocus
                        />
                        {pwdError && (
                            <div className="text-sm text-red-500 mb-2">
                                {pwdError}
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelPwd}
                                className="px-4 py-2 rounded border"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded"
                            >
                                Confirm
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Mock;
