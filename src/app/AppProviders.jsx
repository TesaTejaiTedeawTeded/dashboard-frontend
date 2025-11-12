import { AuthProvider } from "../contexts/AuthContext.jsx";

export const AppProviders = ({ children }) => {
    return <AuthProvider>{children}</AuthProvider>;
};

export default AppProviders;
