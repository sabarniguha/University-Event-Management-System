const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { parseId } = require('../utils/validators');
const { notify } = require('../utils/notify');
const { emailUsers } = require('../utils/emailUsers');
const { audit } = require('../utils/audit');
const { mailConfigured } = require('../utils/mailer');

const clean = (s) => String(s || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim();
const bodySchema = z.object({
  subject: z.string().trim().min(3, 'Write a short subject').max(120),
  message: z.string().trim().min(3, 'Write a message').max(1500),
  audience: z.enum(['CONFIRMED', 'ALL']).default('CONFIRMED'),
});

// CONFIRMED = students holding a seat; ALL = also waitlisted, pending and awaiting payment (never cancelled).
const statusesFor = (audience) => (audience === 'ALL' ? ['REGISTERED', 'WAITLISTED', 'PENDING', 'AWAITING_PAYMENT'] : ['REGISTERED']);

const recipientIds = async (eventId, audience) => {
  const regs = await prisma.registration.findMany({
    where: { eventId, status: { in: statusesFor(audience) } },
    select: { userId: true },
    take: 10000,
  });
  return [...new Set(regs.map((r) => r.userId))];
};

// GET /api/event-messages/event/:eventId  (organiser of event / admin) - who would receive a message
const preview = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const [confirmed, all] = await Promise.all([recipientIds(eventId, 'CONFIRMED'), recipientIds(eventId, 'ALL')]);
  res.json({ event: { id: event.id, title: event.title }, confirmed: confirmed.length, all: all.length, emailOn: mailConfigured() });
});

// POST /api/event-messages/event/:eventId  { subject, message, audience }
const send = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const body = bodySchema.parse(req.body);
  const subject = clean(body.subject);
  const message = clean(body.message);
  const ids = await recipientIds(eventId, body.audience);
  if (ids.length === 0) return res.json({ sent: 0, message: 'Nobody is registered for this event yet.' });

  const title = `${event.title}: ${subject}`.slice(0, 200);
  await notify(prisma, ids, { title, message, link: `/events/${event.id}`, type: 'EVENT_MESSAGE' });
  emailUsers(ids, { subject: title, text: message, link: `/events/${event.id}` });
  await audit(req, 'event.message', 'Event', event.id, { recipients: ids.length, audience: body.audience });
  res.status(201).json({ sent: ids.length, emailed: mailConfigured() });
});

module.exports = { preview, send };
