export const CATEGORIES = ['General', 'Technical', 'Cultural', 'Sports', 'Academic', 'Workshop', 'Social'];

export const fmtDate = (d) =>
  new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

// ISO string -> value for <input type="datetime-local">
export const toLocalInput = (d) => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';

export const dashboardPath = (role) =>
  ({ ADMIN: '/admin', ORGANIZER: '/organizer', STUDENT: '/student' })[role] || '/';
