import {
  Award, BarChart3, Bell, CalendarDays, CheckCircle2, ClipboardList, History, LayoutDashboard,
  Megaphone, PlusCircle, ScanLine, ScrollText, Search, Settings, ShieldCheck, Tag, Ticket, User, UserCheck, UserCog, Users,
} from 'lucide-react';

// One list per role. Every entry points at a real page (see App.jsx).
export const NAV = {
  STUDENT: [
    { to: '/student', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/events', label: 'Discover Events', icon: Search },
    { to: '/student/registrations', label: 'My Registrations', icon: ClipboardList },
    { to: '/student/tickets', label: 'My Tickets', icon: Ticket },
    { to: '/student/attendance', label: 'Attendance History', icon: History },
    { to: '/student/certificates', label: 'Certificates', icon: Award },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'My Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  ORGANIZER: [
    { to: '/organizer', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/organizer/events', label: 'My Events', icon: CalendarDays },
    { to: '/organizer/events/new', label: 'Create Event', icon: PlusCircle },
    { to: '/organizer/registrations', label: 'Manage Registrations', icon: ClipboardList },
    { to: '/organizer/attendees', label: 'Attendee Management', icon: Users },
    { to: '/organizer/scanner', label: 'QR Attendance Scanner', icon: ScanLine },
    { to: '/organizer/certificates', label: 'Certificates', icon: Award },
    { to: '/organizer/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  ADMIN: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'User Management', icon: UserCog },
    { to: '/admin/students', label: 'Student Management', icon: Users },
    { to: '/admin/organizers', label: 'Organizer Management', icon: UserCheck },
    { to: '/admin/events', label: 'Event Management', icon: CalendarDays },
    { to: '/admin/approvals', label: 'Event Approvals', icon: CheckCircle2, badgeKey: 'pendingEvents' },
    { to: '/admin/categories', label: 'Categories', icon: Tag },
    { to: '/admin/attendance', label: 'Attendance Monitoring', icon: ScanLine },
    { to: '/admin/certificates', label: 'Certificates', icon: Award },
    { to: '/admin/analytics', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/admin/notifications', label: 'System Notifications', icon: Bell },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/admin/settings', label: 'Platform Settings', icon: ShieldCheck },
  ],
};

export const ROLE_TITLE = { STUDENT: 'Student', ORGANIZER: 'Organiser', ADMIN: 'Admin' };
