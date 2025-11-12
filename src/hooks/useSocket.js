import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const shouldDeliverPayload = (payloadCamId, requestedCamId) => {
    if (!requestedCamId) return true;
    if (!payloadCamId) return false;
    return payloadCamId === requestedCamId;
};

const createSocket = (url) => {
    if (!url) return null;
    return io(url, { transports: ["websocket"] });
};

export const useSocket = (camId, enabled = true) => {
    const [realtimeData, setRealtimeData] = useState(null);
    const [activeConnections, setActiveConnections] = useState(0);
    const socketsRef = useRef([]);

    useEffect(() => {
        if (!enabled) return;

        const urls = [
            import.meta.env.VITE_SOCKET_URL,
            import.meta.env.VITE_SOCKET_URL_BACKEND,
        ].filter(Boolean);

        const sockets = urls
            .map(createSocket)
            .filter((socket) => socket !== null);

        socketsRef.current = sockets;

        const handleDetection = (eventPayload) => {
            if (!eventPayload) return;
            const payloadCamId =
                eventPayload.cam_id ||
                eventPayload.cameraId ||
                eventPayload.camera?.id;

            if (shouldDeliverPayload(payloadCamId, camId)) {
                setRealtimeData(eventPayload);
            }
        };

        sockets.forEach((socket) => {
            socket.on("connect", () => {
                setActiveConnections((count) => count + 1);
                if (camId) {
                    socket.emit("subscribe_camera", { cam_id: camId });
                }
            });

            socket.on("disconnect", () => {
                setActiveConnections((count) => Math.max(count - 1, 0));
            });

            socket.on("object_detection", handleDetection);
            socket.on("defensive_alert", handleDetection);
        });

        return () => {
            sockets.forEach((socket) => {
                socket.off("object_detection", handleDetection);
                socket.off("defensive_alert", handleDetection);
                socket.disconnect();
            });
            socketsRef.current = [];
            setActiveConnections(0);
        };
    }, [camId, enabled]);

    return { realtimeData, isConnected: activeConnections > 0 };
};
