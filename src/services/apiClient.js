import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    console.warn("VITE_API_BASE_URL is not configured. Requests may fail.");
}

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        Accept: "application/json",
    },
});

apiClient.interceptors.request.use(
    (config) => {
        try {
            const token = localStorage.getItem("token");
            if (token && !config.headers.Authorization) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch {
            // accessing localStorage can throw in SSR or private contexts
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default apiClient;
