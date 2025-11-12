import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

export const useSocket = (camId, enabled = true) => {
    const [realtimeData, setRealtimeData] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!enabled || !camId) return;
        const socket = io(import.meta.env.VITE_SOCKET_URL, {
            transports: ["websocket"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("✅ Connected to Socket.IO");
            setIsConnected(true);
            socket.emit("subscribe_camera", { cam_id: camId });
        });

        socket.on("object_detection", (data) => {
            console.log("📩 object_detection:", data);
            setRealtimeData(data);
        });

        socket.on("disconnect", () => {
            setIsConnected(false);
            console.log("❌ Disconnected from Socket.IO");
        });

        return () => socket.disconnect();
    }, [camId, enabled]);

    return { realtimeData, isConnected };
};
