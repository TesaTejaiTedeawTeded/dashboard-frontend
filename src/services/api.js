import { apiClient } from "./apiClient.js";

const buildRangeParams = (startDate, endDate, extraParams = {}) => {
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate.toISOString());
    if (endDate) params.set("end", endDate.toISOString());
    Object.entries(extraParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, value);
        }
    });
    return params.toString();
};

export const fetchMessagesInRange = async (startDate, endDate) => {
    const query = buildRangeParams(startDate, endDate);
    const { data } = await apiClient.get(`/api/messages/range?${query}`);
    return data;
};

export const fetchDefensiveHistory = async (
    startDate,
    endDate,
    cameraId,
    limit
) => {
    const query = buildRangeParams(startDate, endDate, {
        cameraId,
        limit,
    });
    const { data } = await apiClient.get(`/api/alerts/history?${query}`);
    return data;
};

export const fetchDefensiveCameras = async () => {
    const { data } = await apiClient.get("/api/alerts/cameras");
    return data;
};
