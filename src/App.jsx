import { BrowserRouter, Routes, Route } from "react-router-dom";
import Feed from "./pages/Feed.jsx";
import History from "./pages/History.jsx";
import Mock from "./pages/Mock.jsx";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./features/auth/components/ProtectedRoute.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<DashboardLayout />}>
                        <Route index element={<Feed />} />
                        <Route path="history" element={<History />} />
                        <Route path="mock" element={<Mock />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
