import { apiClient } from "./apiClient.js";

export const loginUser = async (email, password) => {
    const { data } = await apiClient.post("/api/auth/login", {
        email,
        password,
    });
    return data;
};

export const logoutUser = async () => apiClient.post("/api/auth/logout");

export default loginUser;
