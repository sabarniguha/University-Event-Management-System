const prisma = require('./prismaClient');
const { notify } = require('./notify');

// After an event has ended, asks the students who were marked present to rate it (they can only rate events they attended).
// Looks back 7 days, skips students who already rated, and is once per student and event (refKey).
async function sendRatePrompts(now = new Date()) {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED', endsAt: { lte: now, gt: since } },
    select: { id: true, title: true },
  });
  for (const event of events) {
    const regs = await prisma.registration.findMany({
      where: { eventId: event.id, status: 'REGISTERED', attendance: { is: { status: 'PRESENT' } } },
      select: { userId: true, user: { select: { notificationPrefs: true } } },
    });
    const wanted = regs.filter((r) => !(r.user.notificationPrefs && r.user.notificationPrefs.reminders === false)).map((r) => r.userId);
    if (wanted.length === 0) continue;
    const rated = await prisma.feedback.findMany({ where: { eventId: event.id, userId: { in: wanted } }, select: { userId: true } });
    const skip = new Set(rated.map((f) => f.userId));
    const targets = wanted.filter((id) => !skip.has(id));
    if (targets.length === 0) continue;
    await notify(prisma, targets, {
      title: 'How was the event?',
      message: `Thanks for attending "${event.title}". Tell the organisers what you thought with a quick star rating.`,
      link: '/student/attendance',
      type: 'FEEDBACK',
      refKey: `rate:${event.id}`,
    });
  }
}

let timer = null;
function startRatePromptJob() {
  if (timer) return;
  const run = () => sendRatePrompts().catch((e) => console.error('[ratePrompts] failed:', e.message));
  setTimeout(run, 60 * 1000);
  timer = setInterval(run, 15 * 60 * 1000);
  timer.unref();
}

module.exports = { sendRatePrompts, startRatePromptJob };
