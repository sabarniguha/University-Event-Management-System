const prisma = require('./prismaClient');
const { notify } = require('./notify');

// Sends a "starts within 24 hours" reminder to registered students. Safe to run repeatedly:
// the refKey makes each reminder unique per student and event.
async function sendDueReminders() {
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED', startsAt: { gt: now, lte: soon } },
    select: { id: true, title: true, startsAt: true, venue: true },
  });

  for (const event of events) {
    const regs = await prisma.registration.findMany({
      where: { eventId: event.id, status: 'REGISTERED' },
      select: { userId: true, user: { select: { notificationPrefs: true } } },
    });
    const wanted = regs.filter((r) => !(r.user.notificationPrefs && r.user.notificationPrefs.reminders === false));
    await notify(prisma, wanted.map((r) => r.userId), {
      title: 'Event starting soon',
      message: `"${event.title}" starts ${event.startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} at ${event.venue}.`,
      link: '/student/tickets',
      type: 'REMINDER',
      refKey: `reminder24:${event.id}`,
    });
  }
}

let timer = null;
function startReminderJob() {
  if (timer) return;
  const run = () => sendDueReminders().catch((e) => console.error('[reminders] failed:', e.message));
  setTimeout(run, 30 * 1000);
  timer = setInterval(run, 15 * 60 * 1000);
  timer.unref();
}

module.exports = { sendDueReminders, startReminderJob };
