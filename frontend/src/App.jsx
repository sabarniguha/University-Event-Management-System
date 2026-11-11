import { Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleProtectedRoute from './components/RoleProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import LoginSelection from './pages/LoginSelection.jsx';
import Register from './pages/Register.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Announcements from './pages/Announcements.jsx';
import Notifications from './pages/Notifications.jsx';
import VerifyCertificate from './pages/VerifyCertificate.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import MyTickets from './pages/student/MyTickets.jsx';
import StudentAttendance from './pages/student/StudentAttendance.jsx';
import Certificate from './pages/student/Certificate.jsx';
import OrganizerDashboard from './pages/organizer/OrganizerDashboard.jsx';
import EventForm from './pages/organizer/EventForm.jsx';
import EventAttendees from './pages/organizer/EventAttendees.jsx';
import EventAttendance from './pages/organizer/EventAttendance.jsx';
import AttendanceOverview from './pages/organizer/AttendanceOverview.jsx';
import EventFeedback from './pages/organizer/EventFeedback.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import Analytics from './pages/admin/Analytics.jsx';

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
        <Route path="/login" element={<LoginSelection />} />
        <Route path="/login/:type" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/verify" element={<VerifyCertificate />} />
        <Route path="/verify/:code" element={<VerifyCertificate />} />

        {/* Any logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Students */}
        <Route element={<RoleProtectedRoute roles={['STUDENT']} />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/tickets" element={<MyTickets />} />
          <Route path="/student/attendance" element={<StudentAttendance />} />
          <Route path="/student/certificate/:registrationId" element={<Certificate />} />
        </Route>

        {/* Organisers (admins can use these too) */}
        <Route element={<RoleProtectedRoute roles={['ORGANIZER', 'ADMIN']} />}>
          <Route path="/organizer" element={<OrganizerDashboard />} />
          <Route path="/organizer/attendance" element={<AttendanceOverview />} />
          <Route path="/organizer/events/new" element={<EventForm />} />
          <Route path="/organizer/events/:id/edit" element={<EventForm />} />
          <Route path="/organizer/events/:id/attendees" element={<EventAttendees />} />
          <Route path="/organizer/events/:id/attendance" element={<EventAttendance />} />
          <Route path="/organizer/events/:id/feedback" element={<EventFeedback />} />
        </Route>

        {/* Admins */}
        <Route element={<RoleProtectedRoute roles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/attendance" element={<AttendanceOverview />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
