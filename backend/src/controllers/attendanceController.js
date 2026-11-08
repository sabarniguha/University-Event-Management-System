const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { canManageEvent } = require('../utils/access');
const { attendanceSchema } = require('../utils/validators');

// POST /api/attendance  (organiser of event / admin) - mark or update attendance for one registration
const markAttendance = asyncHandler(async (req, res) => {
  const { registrationId, status } = attendanceSchema.parse(req.body);

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });
  if (!registration) throw new HttpError(404, 'Registration not found');
  if (!canManageEvent(req.user, registration.event)) throw new HttpError(403, 'You do not manage this event');
  if (registration.status !== 'REGISTERED') {
    throw new HttpError(400, 'Attendance can only be recorded for an active registration');
  }

  const data = {
    status,
    markedById: req.user.id,
    checkedInAt: status === 'PRESENT' ? new Date() : null,
  };

  const attendance = await prisma.attendance.upsert({
    where: { registrationId },
    update: data,
    create: { registrationId, ...data },
  });
  res.json({ attendance });
});

// GET /api/attendance/me  (students) - own attendance history
const myAttendance = asyncHandler(async (req, res) => {
  const records = await prisma.registration.findMany({
    where: { userId: req.user.id, status: 'REGISTERED' },
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { id: true, title: true, startsAt: true, venue: true } },
      attendance: { select: { status: true, checkedInAt: true } },
    },
  });

  const attended = records.filter((r) => r.attendance?.status === 'PRESENT').length;
  res.json({ records, summary: { total: records.length, attended } });
});

module.exports = { markAttendance, myAttendance };
