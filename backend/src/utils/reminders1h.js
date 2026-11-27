const prisma = require('./prismaClient');
const { notify } = require('./notify');
const { emailUsers } = require('./emailUsers');

// "Starts in about an hour" reminder, sent on top of the existing 24-hour one.
// In-app + browser push (through notify) and email when SMTP is set up. Safe to run as often as you like:
// the refKey makes it once per student and event, and only students who did not get it yet are emailed.
const WINDOW_MIN = 65;

async function sendHourReminders(now = new Date()) {
  const soon = new Date(now.getTime() + WINDOW_MIN * 60 * 1000);
  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED', startsAt: { gt: now, lte: soon } },
    select: { id: true, title: true, startsAt: true, venue: true },
  });

  for (const event of events) {
    const refKey = `reminder1h:${event.id}`;
    const regs = await prisma.registration.findMany({
      where: { eventId: event.id, status: 'REGISTERED' },
      select: { userId: true, user: { select: { notificationPrefs: true } } },
    });
    const wanted = regs.filter((r) => !(r.user.notificationPrefs && r.user.notificationPrefs.reminders === false)).map((r) => r.userId);
    if (wanted.length === 0) continue;
    const done = await prisma.notification.findMany({ where: { refKey, userId: { in: wanted } }, select: { userId: true } });
    const had = new Set(done.map((d) => d.userId));
    const fresh = wanted.filter((id) => !had.has(id));
    if (fresh.length === 0) continue;

    const when = event.startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
    await notify(prisma, fresh, {
      title: 'Starting in about an hour',
      message: `"${event.title}" starts at ${when} at ${event.venue}. Keep your QR ticket ready.`,
      link: '/student/tickets',
      type: 'REMINDER',
      refKey,
    });
    emailUsers(fresh, {
      subject: `Starting soon: ${event.title}`,
      text: `"${event.title}" starts at ${when} at ${event.venue}. Keep your QR ticket ready.`,
      link: '/student/tickets',
    });
  }
}

let timer = null;
function startHourReminderJob() {
  if (timer) return;
  const run = () => sendHourReminders().catch((e) => console.error('[reminders1h] failed:', e.message));
  setTimeout(run, 45 * 1000);
  timer = setInterval(run, 5 * 60 * 1000);
  timer.unref();
}

module.exports = { sendHourReminders, startHourReminderJob };
