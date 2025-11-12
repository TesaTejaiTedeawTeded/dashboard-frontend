import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

/**
 * 🧠 Environment-driven socket selector (mock vs real)
 */
const SOCKET_URLS = {
    mock:
        import.meta.env.VITE_SOCKET_URL_MOCK ||
        import.meta.env.VITE_SOCKET_URL ||
        "",
    real:
        import.meta.env.VITE_SOCKET_URL_REAL ||
        import.meta.env.VITE_SOCKET_URL_BACKEND ||
        import.meta.env.VITE_SOCKET_URL ||
        "",
};

const normalizeMode = (value) => (value === "real" ? "real" : "mock");

const resolveSocketConfig = () => {
    const requestedMode = normalizeMode(
        import.meta.env.VITE_SOCKET_MODE?.toLowerCase() || "mock"
    );

    const preferredUrl = SOCKET_URLS[requestedMode];
    if (preferredUrl) {
        return {
            mode: requestedMode,
            url: preferredUrl,
        };
    }

    const fallbackMode = requestedMode === "real" ? "mock" : "real";
    const fallbackUrl = SOCKET_URLS[fallbackMode] || "";

    return {
        mode: fallbackUrl ? fallbackMode : requestedMode,
        url: fallbackUrl || preferredUrl || "",
    };
};

/**
 * ✅ Create a single stable socket connection
 */
const createSocket = (url) => {
    if (!url) return null;
    return io(url, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelayMax: 4000,
        timeout: 10000,
    });
};

const parseEnvAllowList = () => {
    const raw = import.meta.env.VITE_SOCKET_ACCEPTED_CAMERA_IDS;
    if (!raw) return [];
    return raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
};

const toIdArray = (value) => {
    if (Array.isArray(value)) {
        return value.filter(
            (item) => item !== undefined && item !== null && item !== ""
        );
    }

    if (value === undefined || value === null || value === "") {
        return [];
    }

    return [value];
};

const buildSignature = (value) => JSON.stringify(toIdArray(value));

const resolveCameraInput = (camInput, mode) => {
    if (
        camInput &&
        typeof camInput === "object" &&
        !Array.isArray(camInput)
    ) {
        const typed = camInput;
        const specific = typed[mode];
        const fallback =
            typed.all || typed.default || typed.fallback || [];
        return specific ?? fallback ?? [];
    }
    return camInput;
};

/**
 * 🛰 useSocket – unified real/mock socket hook
 */
export const useSocket = (camId, enabled = true, options = {}) => {
    const {
        additionalCameraIds = [],
        includeEnvAllowList = false,
        includeDefaultEnvCameras = false,
        events = ["object_detection", "defensive_alert"],
    } = options;

    const [realtimeData, setRealtimeData] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const { mode: socketMode, url: socketUrl } = useMemo(
        () => resolveSocketConfig(),
        []
    );
    const resolvedCamInput = resolveCameraInput(camId, socketMode);
    const baseCamIds = toIdArray(resolvedCamInput);
    const additionalIds = toIdArray(additionalCameraIds);
    const envAllowList = useMemo(() => parseEnvAllowList(), []);
    const defaultEnvCameras = includeDefaultEnvCameras
        ? [
              import.meta.env.VITE_OFF_CAM_ID,
              import.meta.env.VITE_OFF_CAM_ID_REAL,
              import.meta.env.VITE_DEF_CAM_ID,
              import.meta.env.VITE_DEF_CAM_ID_REAL,
          ].filter(Boolean)
        : [];
    const camSignature = buildSignature(baseCamIds);
    const additionalIdsSignature = buildSignature(additionalIds);
    const envAllowSignature = includeEnvAllowList
        ? buildSignature(envAllowList)
        : "env-disabled";
    const defaultEnvSignature = includeDefaultEnvCameras
        ? buildSignature(defaultEnvCameras)
        : "default-env-disabled";
    const eventSignature = buildSignature(events);

    useEffect(() => {
        if (!enabled) return;
        if (!socketUrl) {
            console.warn(
                "⚠️ Socket disabled: missing URL for mode",
                socketMode
            );
            return;
        }

        const envIds =
            includeEnvAllowList && envAllowList.length ? envAllowList : [];

        const allIds = defaultEnvCameras
            .concat(envIds)
            .concat(additionalIds)
            .filter(Boolean);

        // If component specifies explicit camId, include that too
        const subscribeIds = [...new Set([...baseCamIds, ...allIds])];

        console.log(
            `🎯 Subscribing cameras [${socketMode.toUpperCase()}]:`,
            subscribeIds
        );

        const socket = createSocket(socketUrl);
        if (!socket) return;

        socketRef.current = socket;

        const handleDetection = (payload) => {
            if (!payload) return;
            setRealtimeData(payload);
        };

        socket.on("connect", () => {
            console.log("✅ Socket connected:", socketUrl);
            setIsConnected(true);
            subscribeIds.forEach((id) =>
                socket.emit("subscribe_camera", { cam_id: id })
            );
        });

        socket.on("disconnect", (reason) => {
            console.warn("⚠️ Socket disconnected:", reason);
            setIsConnected(false);
        });

        socket.on("connect_error", (err) => {
            console.error("❌ Socket connection error:", err.message);
        });

        events.forEach((eventName) =>
            socket.on(eventName, handleDetection)
        );

        return () => {
            console.log("🧹 Closing socket...");
            events.forEach((eventName) =>
                socket.off(eventName, handleDetection)
            );
            socket.disconnect();
            setIsConnected(false);
        };
    }, [
        enabled,
        camSignature,
        additionalIdsSignature,
        envAllowSignature,
        defaultEnvSignature,
        eventSignature,
        socketMode,
        socketUrl,
    ]);

    useEffect(() => {
        if (enabled) return;
        if (!socketRef.current) return;
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
    }, [enabled]);

    return { realtimeData, isConnected, mode: socketMode, sourceUrl: socketUrl };
};
