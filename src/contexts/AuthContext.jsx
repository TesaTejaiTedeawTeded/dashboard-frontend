import { createContext, useContext, useState, useEffect } from "react";
import { logoutUser as requestLogout } from "../services/authService.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (token && userData) {
            setUser(JSON.parse(userData));
        }
        setLoading(false);
    }, []);

    const login = (data) => {
        setUser(data.user);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
    };

    const logout = async () => {
        try {
            await requestLogout();
        } catch (error) {
            console.warn("Failed to revoke backend session", error);
        } finally {
            setUser(null);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
