import { Outlet } from "react-router-dom";
import Navbar from "../components/navigation/Navbar.jsx";

const DashboardLayout = () => {
    return (
        <div className="app-shell">
            <div className="app-shell__gradient" aria-hidden="true" />
            <div className="app-shell__grid" aria-hidden="true" />

            <main className="app-shell__content">
                <Outlet />
            </main>

            <div className="app-shell__navbar">
                <Navbar />
            </div>
        </div>
    );
};

export default DashboardLayout;
