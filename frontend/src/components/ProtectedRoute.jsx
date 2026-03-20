import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <section className="route-loading">
        <span className="loader-ring" />
        <p>Syncing your secure session...</p>
      </section>
    );

  if (!user) return <Navigate to="/login" />;

  return <Outlet />;
};

export default ProtectedRoute;