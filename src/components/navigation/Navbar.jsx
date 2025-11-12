import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext.jsx";

const links = [
    { to: "/", label: "Feed" },
    { to: "/history", label: "History" },
    { to: "/mock", label: "Mock" },
];

const Navbar = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleSignOut = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    return (
        <nav className="nav-glass">
            <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,255,120,0.8)]" />
                <p className="text-[10px] uppercase tracking-[0.5em] text-slate-100 opacity-80">
                    TESA Ops
                </p>
            </div>

            <div className="relative flex items-center gap-1">
                {links.map((link) => {
                    const isActive = pathname === link.to;

                    return (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`nav-link ${isActive ? "text-white" : "text-slate-300"}`}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="nav-active"
                                    className="nav-link__active"
                                    transition={{
                                        type: "spring",
                                        stiffness: 420,
                                        damping: 35,
                                    }}
                                />
                            )}
                            <span className="relative z-10">{link.label}</span>
                        </Link>
                    );
                })}
            </div>

            <button onClick={handleSignOut} className="glass-button glass-button--ghost">
                Sign Out
            </button>
        </nav>
    );
};

export default Navbar;
