import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleProtectedRoute from './components/RoleProtectedRoute.jsx';
import { Loader } from './components/common/Ui.jsx';
import OfflineBanner from './components/layout/OfflineBanner.jsx';

// Pages are loaded on demand so the first visit downloads as little as possible.
const page = (loader) => lazy(loader);

const Home = page(() => import('./pages/public/Home.jsx'));
const Explore = page(() => import('./pages/public/Explore.jsx'));
const EventDetail = page(() => import('./pages/public/EventDetail.jsx'));
const Categories = page(() => import('./pages/public/Categories.jsx'));
const About = page(() => import('./pages/public/About.jsx'));
const Contact = page(() => import('./pages/public/Contact.jsx'));
const Login = page(() => import('./pages/public/Login.jsx'));
const LoginSelection = page(() => import('./pages/public/LoginSelection.jsx'));
const Register = page(() => import('./pages/public/Register.jsx'));
const ForgotPassword = page(() => import('./pages/public/ForgotPassword.jsx'));
const ResetPassword = page(() => import('./pages/public/ResetPassword.jsx'));
const VerifyEmail = page(() => import('./pages/public/VerifyEmail.jsx'));
const VerifyCertificate = page(() => import('./pages/public/VerifyCertificate.jsx'));
const VerifyReport = page(() => import('./pages/public/VerifyReport.jsx'));
const VerifyTicket = page(() => import('./pages/public/VerifyTicket.jsx'));
const ScanTickets = page(() => import('./pages/organizer/ScanTickets.jsx'));
const StudentPayments = page(() => import('./pages/student/Payments.jsx'));
const StudentReportPage = page(() => import('./pages/reports/StudentReportPage.jsx'));
const StudentTranscriptPage = page(() => import('./pages/reports/StudentTranscriptPage.jsx'));
const ReportsPage = page(() => import('./pages/reports/ReportsPage.jsx'));
const EventReportPage = page(() => import('./pages/reports/EventReportPage.jsx'));
const EventGallery = page(() => import('./pages/organizer/EventGallery.jsx'));
const EventSurvey = page(() => import('./pages/organizer/EventSurvey.jsx'));
const Following = page(() => import('./pages/student/Following.jsx'));
const ScreenCheckin = page(() => import('./pages/organizer/ScreenCheckin.jsx'));
const SelfCheckin = page(() => import('./pages/student/SelfCheckin.jsx'));
const EventStaff = page(() => import('./pages/organizer/EventStaff.jsx'));
const StaffDuty = page(() => import('./pages/shared/StaffDuty.jsx'));
const EventDiscounts = page(() => import('./pages/organizer/EventDiscounts.jsx'));
const EventMessages = page(() => import('./pages/organizer/EventMessages.jsx'));
const LiveCheckin = page(() => import('./pages/organizer/LiveCheckin.jsx'));
const EventTeams = page(() => import('./pages/organizer/EventTeams.jsx'));
const NotFound = page(() => import('./pages/public/NotFound.jsx'));

const Announcements = page(() => import('./pages/Announcements.jsx'));
const Notifications = page(() => import('./pages/Notifications.jsx'));
const Profile = page(() => import('./pages/shared/Profile.jsx'));
const Settings = page(() => import('./pages/shared/Settings.jsx'));
const CertificateView = page(() => import('./pages/shared/CertificateView.jsx'));

const StudentDashboard = page(() => import('./pages/student/StudentDashboard.jsx'));
const MyRegistrations = page(() => import('./pages/student/MyRegistrations.jsx'));
const MyTickets = page(() => import('./pages/student/MyTickets.jsx'));
const StudentAttendance = page(() => import('./pages/student/StudentAttendance.jsx'));
const OfflineTickets = page(() => import('./pages/public/OfflineTickets.jsx'));
const Rewards = page(() => import('./pages/student/Rewards.jsx'));
const StudentCertificates = page(() => import('./pages/student/Certificates.jsx'));

const OrganizerDashboard = page(() => import('./pages/organizer/OrganizerDashboard.jsx'));
const MyEvents = page(() => import('./pages/organizer/MyEvents.jsx'));
const EventForm = page(() => import('./pages/organizer/EventForm.jsx'));
const ManageRegistrations = page(() => import('./pages/organizer/ManageRegistrations.jsx'));
const EventAttendance = page(() => import('./pages/organizer/EventAttendance.jsx'));
const EventFeedback = page(() => import('./pages/organizer/EventFeedback.jsx'));
const AttendanceOverview = page(() => import('./pages/organizer/AttendanceOverview.jsx'));
const OrganizerCertificates = page(() => import('./pages/organizer/OrganizerCertificates.jsx'));
const OrganizerAnalytics = page(() => import('./pages/organizer/OrganizerAnalytics.jsx'));
const AttendeeManagement = page(() => import('./pages/organizer/EventTools.jsx').then((m) => ({ default: m.AttendeeManagement })));
const ScannerPicker = page(() => import('./pages/organizer/EventTools.jsx').then((m) => ({ default: m.ScannerPicker })));

const AdminDashboard = page(() => import('./pages/admin/AdminDashboard.jsx'));
const UserManagement = page(() => import('./pages/admin/UserManagement.jsx'));
const EventManagement = page(() => import('./pages/admin/EventManagement.jsx'));
const Approvals = page(() => import('./pages/admin/Approvals.jsx'));
const AdminCategories = page(() => import('./pages/admin/Categories.jsx'));
const AdminCertificates = page(() => import('./pages/admin/AdminCertificates.jsx'));
const AdminAnalytics = page(() => import('./pages/admin/AdminAnalytics.jsx'));
const EventRatings = page(() => import('./pages/admin/EventRatings.jsx'));
const SystemNotifications = page(() => import('./pages/admin/SystemNotifications.jsx'));
const Payments = page(() => import('./pages/admin/Payments.jsx'));
const AuditLogs = page(() => import('./pages/admin/AuditLogs.jsx'));
const PlatformSettings = page(() => import('./pages/admin/PlatformSettings.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <OfflineBanner />
      <Routes>
        {/* Public website */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Explore />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<LoginSelection />} />
          <Route path="/login/:type" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          <Route path="/verify/:code" element={<VerifyCertificate />} />
          <Route path="/verify-report" element={<VerifyReport />} />
          <Route path="/verify-ticket" element={<VerifyTicket />} />
          <Route path="/offline-tickets" element={<OfflineTickets />} />
          <Route path="/verify-ticket/:code" element={<VerifyTicket />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Signed-in area: sidebar layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/staff" element={<StaffDuty />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />

            <Route element={<RoleProtectedRoute roles={['STUDENT']} />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/registrations" element={<MyRegistrations />} />
              <Route path="/student/tickets" element={<MyTickets />} />
              <Route path="/student/attendance" element={<StudentAttendance />} />
              <Route path="/student/payments" element={<StudentPayments />} />
              <Route path="/student/certificates" element={<StudentCertificates />} />
              <Route path="/student/rewards" element={<Rewards />} />
              <Route path="/student/following" element={<Following />} />
              <Route path="/student/checkin" element={<SelfCheckin />} />
              <Route path="/student/reports" element={<StudentReportPage />} />
              <Route path="/student/transcript" element={<StudentTranscriptPage />} />
              <Route path="/student/certificates/:certificateId" element={<CertificateView />} />
            </Route>

            {/* Organisers (admins can use these tools too) */}
            <Route element={<RoleProtectedRoute roles={['ORGANIZER', 'ADMIN']} />}>
              <Route path="/organizer" element={<OrganizerDashboard />} />
              <Route path="/organizer/events" element={<MyEvents />} />
              <Route path="/organizer/events/new" element={<EventForm />} />
              <Route path="/organizer/events/:id/edit" element={<EventForm />} />
              <Route path="/organizer/events/:id/registrations" element={<ManageRegistrations />} />
              <Route path="/organizer/events/:id/attendance" element={<EventAttendance />} />
              <Route path="/organizer/events/:id/feedback" element={<EventFeedback />} />
              <Route path="/organizer/events/:id/certificates" element={<OrganizerCertificates />} />
              <Route path="/organizer/registrations" element={<ManageRegistrations />} />
              <Route path="/organizer/attendees" element={<AttendeeManagement />} />
              <Route path="/organizer/scanner" element={<ScannerPicker />} />
              <Route path="/organizer/attendance" element={<AttendanceOverview />} />
              <Route path="/organizer/payments" element={<Payments />} />
              <Route path="/organizer/scan" element={<ScanTickets />} />
              <Route path="/organizer/events/:id/teams" element={<EventTeams />} />
              <Route path="/organizer/events/:id/survey" element={<EventSurvey />} />
              <Route path="/organizer/events/:id/messages" element={<EventMessages />} />
              <Route path="/organizer/events/:id/staff" element={<EventStaff />} />
              <Route path="/organizer/events/:id/discounts" element={<EventDiscounts />} />
              <Route path="/organizer/events/:id/screen" element={<ScreenCheckin />} />
              <Route path="/organizer/events/:id/live" element={<LiveCheckin />} />
              <Route path="/organizer/events/:id/gallery" element={<EventGallery />} />
              <Route path="/organizer/certificates" element={<OrganizerCertificates />} />
              <Route path="/organizer/certificates/view/:certificateId" element={<CertificateView />} />
              <Route path="/organizer/analytics" element={<OrganizerAnalytics />} />
              <Route path="/organizer/reports" element={<ReportsPage />} />
              <Route path="/organizer/reports/event/:id" element={<EventReportPage />} />
            </Route>

            <Route element={<RoleProtectedRoute roles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement role="all" />} />
              <Route path="/admin/students" element={<UserManagement role="STUDENT" />} />
              <Route path="/admin/organizers" element={<UserManagement role="ORGANIZER" />} />
              <Route path="/admin/events" element={<EventManagement />} />
              <Route path="/admin/approvals" element={<Approvals />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/attendance" element={<AttendanceOverview />} />
              <Route path="/admin/scan" element={<ScanTickets />} />
              <Route path="/admin/certificates" element={<AdminCertificates />} />
              <Route path="/admin/certificates/view/:certificateId" element={<CertificateView />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/ratings" element={<EventRatings />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/reports/event/:id" element={<EventReportPage />} />
              <Route path="/admin/notifications" element={<SystemNotifications />} />
              <Route path="/admin/audit-logs" element={<AuditLogs />} />
              <Route path="/admin/payments" element={<Payments />} />
              <Route path="/admin/settings" element={<PlatformSettings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
