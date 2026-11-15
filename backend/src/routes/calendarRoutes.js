const router = require('express').Router();
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/validators');
const { eventIcs } = require('../utils/ics');
const { appUrl } = require('../utils/mailer');

// GET /api/calendar/:id  (public) - .ics file for a published event
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(String(req.params.id).replace(/\.ics$/i, ''), 'event id');
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || event.status !== 'PUBLISHED') throw new HttpError(404, 'Event not found');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="event-${id}.ics"`);
  res.send(eventIcs(event, appUrl()));
}));

module.exports = router;
