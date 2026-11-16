const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { normaliseTicketInput } = require('../utils/ticket');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many checks, please try again later' } });

// GET /api/tickets/verify/:code (public) - is this ticket real? Shows only what a door check needs:
// the event, the status and an abbreviated holder name. Ticket codes are 128-bit random, so they cannot be guessed.
router.get('/verify/:code', limiter, asyncHandler(async (req, res) => {
  const code = normaliseTicketInput(req.params.code);
  if (!/^[0-9a-f]{32}$/.test(code)) throw new HttpError(404, 'Ticket not found');
  const reg = await prisma.registration.findUnique({
    where: { ticketCode: code },
    include: { user: { select: { name: true } }, event: { select: { title: true, startsAt: true, venue: true, status: true } }, attendance: { select: { status: true } } },
  });
  if (!reg) throw new HttpError(404, 'Ticket not found');
  const [first, ...rest] = reg.user.name.trim().split(/\s+/);
  res.json({
    valid: reg.status === 'REGISTERED' && reg.event.status === 'PUBLISHED',
    registrationStatus: reg.status,
    eventTitle: reg.event.title,
    startsAt: reg.event.startsAt,
    venue: reg.event.venue,
    holder: rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first,
    checkedIn: reg.attendance?.status === 'PRESENT',
  });
}));

module.exports = router;
