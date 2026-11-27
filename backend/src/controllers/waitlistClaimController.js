const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/validators');
const { expireClaims } = require('../utils/waitlistClaims');

// GET /api/waitlist-claims/mine - seats offered to the student that still need confirming
const mine = asyncHandler(async (req, res) => {
  // Release anything overdue first, so the student never sees a window that has already closed.
  await expireClaims();
  const rows = await prisma.waitlistClaim.findMany({
    where: { confirmedAt: null, deadline: { gt: new Date() }, registration: { userId: req.user.id, status: 'REGISTERED' } },
    orderBy: { deadline: 'asc' },
    include: { registration: { select: { eventId: true, event: { select: { id: true, title: true, startsAt: true, venue: true } } } } },
  });
  res.json({ claims: rows.map((c) => ({ id: c.id, deadline: c.deadline, event: c.registration.event })) });
});

// POST /api/waitlist-claims/:id/confirm
const confirm = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'claim id');
  const claim = await prisma.waitlistClaim.findUnique({ where: { id }, include: { registration: { select: { userId: true, status: true } } } });
  if (!claim || claim.registration.userId !== req.user.id) throw new HttpError(404, 'Seat offer not found');
  if (claim.confirmedAt) return res.json({ ok: true });
  const won = await prisma.waitlistClaim.updateMany({ where: { id, confirmedAt: null, deadline: { gt: new Date() } }, data: { confirmedAt: new Date() } });
  if (won.count === 0) throw new HttpError(410, 'This offer has expired and the seat went to the next student.');
  res.json({ ok: true });
});

module.exports = { mine, confirm };
