const { notify } = require('./notify');

// Moves waitlisted students into free seats (first in, first out) and notifies them.
// Must be called with a transaction client so the seat count and the promotion are atomic.
async function promoteWaitlist(tx, eventId) {
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'PUBLISHED' || event.endsAt < new Date()) return [];

  const taken = await tx.registration.count({ where: { eventId, status: 'REGISTERED' } });
  const free = event.capacity - taken;
  if (free <= 0) return [];

  const next = await tx.registration.findMany({
    where: { eventId, status: 'WAITLISTED' },
    orderBy: { joinedAt: 'asc' },
    take: free,
  });
  if (next.length === 0) return [];

  await tx.registration.updateMany({
    where: { id: { in: next.map((r) => r.id) } },
    data: { status: 'REGISTERED' },
  });
  await notify(tx, next.map((r) => r.userId), {
    title: 'A seat opened up for you',
    message: `You moved off the waitlist for "${event.title}". Your QR ticket is ready.`,
    link: '/student/tickets',
  });
  return next;
}

module.exports = { promoteWaitlist };
