import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute, { FullScreenLoader } from "./ProtectedRoute";

const DASHBOARD_BY_ROLE = {
  STUDENT: "/student/dashboard",
  ORGANIZER: "/organizer/dashboard",
  ADMIN: "/admin/dashboard",
};

/**
 * RoleProtectedRoute requires authentication AND a specific role.
 * A logged-in user with the wrong role is redirected to their own
 * dashboard rather than being shown a raw "denied" page.
 */
export default function RoleProtectedRoute({ role, children }) {
  return (
    <ProtectedRoute>
      <RoleCheck role={role}>{children}</RoleCheck>
    </ProtectedRoute>
  );
}

function RoleCheck({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user.role !== role) {
    return <Navigate to={DASHBOARD_BY_ROLE[user.role] || "/login"} replace />;
  }

  return children;
}

export function StudentRoute({ children }) {
  return <RoleProtectedRoute role="STUDENT">{children}</RoleProtectedRoute>;
}

export function OrganizerRoute({ children }) {
  return <RoleProtectedRoute role="ORGANIZER">{children}</RoleProtectedRoute>;
}

export function AdminRoute({ children }) {
  return <RoleProtectedRoute role="ADMIN">{children}</RoleProtectedRoute>;
}
