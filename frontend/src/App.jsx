
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/student/StudentDashboard";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import {
  StudentRoute,
  OrganizerRoute,
  AdminRoute,
} from "./components/RoleProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Home */}
      <Route path="/" element={<Home />} />

      {/* Login */}
      <Route path="/login" element={<Login />} />
      <Route path="/login/:type" element={<Login />} />

      {/* Student Registration */}
      <Route path="/register" element={<Register />} />

      {/* Student Dashboard */}
      <Route
        path="/student/dashboard"
        element={
          <StudentRoute>
            <StudentDashboard />
          </StudentRoute>
        }
      />

      {/* Organizer Dashboard */}
      <Route
        path="/organizer/dashboard"
        element={
          <OrganizerRoute>
            <OrganizerDashboard />
          </OrganizerRoute>
        }
      />

      {/* Admin Dashboard */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
```
