// Attendance can be marked only while an event is running; certificates only after it has ended.
const windowState = (event, now = new Date()) => {
  if (event.startsAt && new Date(event.startsAt) > now) return 'before';
  if (event.endsAt && new Date(event.endsAt) <= now) return 'closed';
  return 'open';
};

const MESSAGES = {
  before: 'Attendance can only be marked once the event has started.',
  closed: 'This event has ended, so attendance can no longer be marked or changed.',
};

// Returns an error message when attendance may not be marked right now, otherwise null.
const attendanceBlock = (event, now) => MESSAGES[windowState(event, now)] || null;

// Returns an error message when certificates may not be issued yet, otherwise null.
const certificateBlock = (event, now = new Date()) =>
  event.endsAt && new Date(event.endsAt) > now ? 'Certificates can only be issued after the event has ended.' : null;

module.exports = { windowState, attendanceBlock, certificateBlock };
