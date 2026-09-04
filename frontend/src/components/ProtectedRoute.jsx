import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="flex items-center gap-3 text-ink-soft">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brass" />
        <span className="font-body text-sm">Loading UniEvents…</span>
      </div>
    </div>
  );
}
