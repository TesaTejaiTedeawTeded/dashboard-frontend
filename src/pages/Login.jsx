import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import loginUser from "../services/authService.js";
import GlassPanel from "../components/ui/GlassPanel.jsx";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { user, login } = useAuth();

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const data = await loginUser(email, password);
            login(data);
            navigate("/");
        } catch {
            setError("Invalid email or password");
        }
    };

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="auth-shell">
            <div className="auth-shell__gradient" aria-hidden="true" />
            <GlassPanel
                as="form"
                onSubmit={handleSubmit}
                className="auth-card space-y-6"
            >
                <div className="space-y-2 text-center">
                    <p className="page-eyebrow">TESA TEJAI</p>
                    <h1 className="page-title text-3xl">Sign in</h1>
                    <p className="text-slate-300 text-sm">
                        Authenticate to enter the dashboard.
                    </p>
                </div>

                {error && (
                    <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-center">
                        {error}
                    </p>
                )}

                <label className="auth-field">
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="glass-input"
                        placeholder="you@tesa.ops"
                        required
                    />
                </label>

                <label className="auth-field">
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-input"
                        placeholder="••••••••"
                        required
                    />
                </label>

                <button type="submit" className="glass-button w-full">
                    Access dashboard
                </button>
            </GlassPanel>
        </div>
    );
};

export default Login;
