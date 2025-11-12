import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext.jsx";

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
                <p className="tracking-[0.2em] uppercase text-xs">
                    Initializing secure session…
                </p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
