export const CATEGORIES = ['General', 'Technical', 'Cultural', 'Sports', 'Academic', 'Workshop', 'Social'];

export const fmtDate = (d) =>
  new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

// ISO string -> value for <input type="datetime-local">
export const toLocalInput = (d) => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';

// Used by the login selection page and the role-specific login pages (/login/:type).
export const ROLE_LOGINS = {
  student: {
    role: 'STUDENT',
    label: 'Student',
    description: 'Browse events, register for them and track your attendance.',
  },
  organizer: {
    role: 'ORGANIZER',
    label: 'Organiser',
    description: 'Create and manage events, view participants and mark attendance.',
  },
  admin: {
    role: 'ADMIN',
    label: 'Admin',
    description: 'Manage users, oversee all events and post university-wide announcements.',
  },
};

export const dashboardPath = (role) =>
  ({ ADMIN: '/admin', ORGANIZER: '/organizer', STUDENT: '/student' })[role] || '/';
