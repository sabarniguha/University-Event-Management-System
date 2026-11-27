const prisma = require('../utils/prismaClient');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { buildLive } = require('../utils/liveCheckin');

// GET /api/live/event/:eventId  (organiser of the event / admin) - the door view: who is in, who is still missing
const live = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const rows = await prisma.registration.findMany({
    where: { eventId, status: 'REGISTERED' },
    select: { id: true, user: { select: { name: true, studentId: true, department: true } }, attendance: { select: { status: true, method: true, checkedInAt: true, createdAt: true } } },
    take: 5000,
  });
  const regs = rows.map((r) => ({
    id: r.id, name: r.user.name, studentId: r.user.studentId, department: r.user.department,
    status: r.attendance ? r.attendance.status : null, method: r.attendance ? r.attendance.method : null,
    at: r.attendance ? (r.attendance.checkedInAt || r.attendance.createdAt) : null,
  }));
  res.json({ event: { id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, venue: event.venue }, now: new Date(), ...buildLive(event, regs) });
});

module.exports = { live };
