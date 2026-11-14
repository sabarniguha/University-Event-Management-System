export const fmtDate = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
export const fmtDay = (d) => new Date(d).toLocaleDateString([], { dateStyle: 'medium' });
export const fmtTime = (d) => new Date(d).toLocaleTimeString([], { timeStyle: 'short' });

// "12 Nov" style block used on event cards
export const dayParts = (d) => {
  const x = new Date(d);
  return { day: x.getDate(), month: x.toLocaleString([], { month: 'short' }) };
};

// ISO string -> value for <input type="datetime-local">
export const toLocalInput = (d) => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// 82.5 -> "82.5%", null -> "-"
export const pctLabel = (v) => (v === null || v === undefined ? '-' : `${v}%`);

export const money = (fee) => (fee > 0 ? `₹${fee.toLocaleString('en-IN')}` : 'Free');

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';

export const timeAgo = (d) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDay(d);
};

export const initials = (name) =>
  String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export const MODE_LABEL = { OFFLINE: 'In person', ONLINE: 'Online', HYBRID: 'Hybrid' };

// Used by the login selection page and the role-specific login pages (/login/:type).
export const ROLE_LOGINS = {
  student: { role: 'STUDENT', label: 'Student', description: 'Discover events, register, get QR tickets and certificates.' },
  organizer: { role: 'ORGANIZER', label: 'Organiser', description: 'Create events, manage registrations, scan attendance and issue certificates.' },
  admin: { role: 'ADMIN', label: 'Admin', description: 'Approve events, manage users and see platform analytics.' },
};

export const dashboardPath = (role) => ({ ADMIN: '/admin', ORGANIZER: '/organizer', STUDENT: '/student' })[role] || '/';

export const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical', 'Civil',
  'Biotechnology', 'Management', 'Basic Science', 'Other',
];

export const EVENT_TYPES = ['Competition', 'Talk', 'Workshop', 'Festival', 'Meetup', 'Exhibition', 'Drive', 'Other'];
