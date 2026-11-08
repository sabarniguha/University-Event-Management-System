const prisma = require('./prismaClient');
const HttpError = require('./httpError');

const canManageEvent = (user, event) => user.role === 'ADMIN' || event.organizerId === user.id;

// Loads an event and makes sure the current user (its organiser or an admin) may manage it.
async function loadManagedEvent(eventId, user) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'Event not found');
  if (!canManageEvent(user, event)) throw new HttpError(403, 'You do not manage this event');
  return event;
}

module.exports = { canManageEvent, loadManagedEvent };
