import { apiClient } from "./apiClient.js";

export const fetchMessagesInRange = async (startDate, endDate) => {
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    const { data } = await apiClient.get(
        `/api/messages/range?start=${startISO}&end=${endISO}`
    );
    return data;
};
