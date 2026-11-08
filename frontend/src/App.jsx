import { Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleProtectedRoute from './components/RoleProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Announcements from './pages/Announcements.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import OrganizerDashboard from './pages/organizer/OrganizerDashboard.jsx';
import EventForm from './pages/organizer/EventForm.jsx';
import EventAttendees from './pages/organizer/EventAttendees.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />

        {/* Any logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Students */}
        <Route element={<RoleProtectedRoute roles={['STUDENT']} />}>
          <Route path="/student" element={<StudentDashboard />} />
        </Route>

        {/* Organisers (admins can use these too) */}
        <Route element={<RoleProtectedRoute roles={['ORGANIZER', 'ADMIN']} />}>
          <Route path="/organizer" element={<OrganizerDashboard />} />
          <Route path="/organizer/events/new" element={<EventForm />} />
          <Route path="/organizer/events/:id/edit" element={<EventForm />} />
          <Route path="/organizer/events/:id/attendees" element={<EventAttendees />} />
        </Route>

        {/* Admins */}
        <Route element={<RoleProtectedRoute roles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
