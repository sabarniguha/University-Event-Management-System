const prisma = require('./prismaClient');
const { notify } = require('./notify');
const { emailUsers } = require('./emailUsers');

// Tells an organiser's followers about a newly published event. Never throws and never blocks.
// The refKey makes it once per follower per event, even if an event is published again later.
async function notifyFollowers(event) {
  try {
    const rows = await prisma.organizerFollow.findMany({ where: { organizerId: event.organizerId }, select: { followerId: true }, take: 20000 });
    const ids = rows.map((r) => r.followerId);
    if (ids.length === 0) return;
    const organizer = await prisma.user.findUnique({ where: { id: event.organizerId }, select: { name: true } });
    const message = `${organizer?.name || 'An organiser you follow'} published a new event: "${event.title}".`;
    await notify(prisma, ids, { title: 'New event from an organiser you follow', message, link: `/events/${event.id}`, type: 'FOLLOW', refKey: `follow-event-${event.id}` });
    emailUsers(ids, { subject: `New event: ${event.title}`, text: message, link: `/events/${event.id}` });
  } catch (e) {
    console.error('[follow] could not notify followers:', e.message);
  }
}

module.exports = { notifyFollowers };
